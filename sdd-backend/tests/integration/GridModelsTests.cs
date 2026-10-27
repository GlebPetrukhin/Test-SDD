using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;

namespace Sdd.Api.IntegrationTests;

public sealed class GridFixture : IAsyncLifetime
{
    private readonly string schema = "grid_" + Guid.NewGuid().ToString("N");
    private readonly string connection = Environment.GetEnvironmentVariable("GRID_TEST_CONNECTION")
        ?? "Host=localhost;Port=55432;Database=sdd_test;Username=sdd;Password=sdd-test-only;Timeout=5";
    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public string ScopedConnection => new NpgsqlConnectionStringBuilder(connection) { SearchPath = schema }.ConnectionString;
    public async Task InitializeAsync()
    {
        await using var db = new NpgsqlConnection(connection);
        await db.OpenAsync();
        await using var cmd = new NpgsqlCommand($"CREATE SCHEMA {schema}", db);
        await cmd.ExecuteNonQueryAsync();
        Factory = NewFactory();
    }
    public WebApplicationFactory<Program> NewFactory() => new WebApplicationFactory<Program>()
        .WithWebHostBuilder(b => b.UseSetting("ConnectionStrings:GridModels", ScopedConnection));
    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        await using var db = new NpgsqlConnection(connection);
        await db.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP SCHEMA {schema} CASCADE", db);
        await cmd.ExecuteNonQueryAsync();
    }
}

public class GridModelsTests(GridFixture fixture) : IClassFixture<GridFixture>
{
    private HttpClient Client => fixture.Factory.CreateClient();
    private static readonly object ValidDocument = new { objects = new[] { new { id = "ps-1", name = "ПС Урал", type = "substation", voltageKv = 220, links = Array.Empty<string>() } } };
    private static string Id(JsonNode m) => m["id"]!.GetValue<string>();
    private static int Revision(JsonNode m) => m["revision"]!.GetValue<int>();
    private static string VersionId(JsonNode m, int index = -1) => m["versions"]!.AsArray()[index < 0 ? m["versions"]!.AsArray().Count - 1 : index]!["id"]!.GetValue<string>();
    private async Task<JsonNode> Create()
    {
        var response = await Client.PostAsJsonAsync("/api/grid-models", new { name = "Сеть Урал", region = "Урал", ownerId = "ural", organizationId = "ural" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonNode>())!;
    }
    private async Task<JsonNode> Upload(JsonNode m, object? document = null)
    {
        var response = await Client.PostAsJsonAsync($"/api/grid-models/{Id(m)}/versions", new {
            title = "Обновление ПС", organizationId = "ural", revision = Revision(m),
            baseVersionId = m["publishedVersionId"]?.GetValue<string>(), document = document ?? ValidDocument });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonNode>())!;
    }
    private Task<HttpResponseMessage> Act(JsonNode m, string version, string action, string comment = "") => Client.PostAsJsonAsync(
        $"/api/grid-models/{Id(m)}/versions/{version}/actions", new { action, comment, revision = Revision(m), organizationId = "so" });
    private async Task<JsonNode> Next(JsonNode m, string version, string action, string comment = "")
    {
        var response = await Act(m, version, action, comment);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonNode>())!;
    }

    [Fact(DisplayName = "[grid-models-01.1] Реестр, поиск и карточка")]
    [Trait("Scenario", "grid-models-01")][Trait("TestCase", "grid-models-01.1")]
    public async Task Registry()
    {
        var models = (await Client.GetFromJsonAsync<JsonArray>("/api/grid-models?q=" + Uri.EscapeDataString("Урал")))!;
        Assert.NotEmpty(models);
        var organizations = (await Client.GetFromJsonAsync<JsonArray>("/api/organizations"))!;
        Assert.All(models, m => {
            var owner = organizations.Single(o => o!["id"]!.GetValue<string>() == m!["ownerId"]!.GetValue<string>())!;
            Assert.Contains("Урал", m!["name"]!.GetValue<string>() + m["region"]!.GetValue<string>() + owner["name"]!.GetValue<string>(), StringComparison.OrdinalIgnoreCase);
        });
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/api/grid-models/" + Id(models[0]!))).StatusCode);
        Assert.Empty((await Client.GetFromJsonAsync<JsonArray>("/api/grid-models?q=NoSuchNetworkZZZ"))!);
    }

    [Fact(DisplayName = "[grid-models-02.1] Создание и пустое название")]
    [Trait("Scenario", "grid-models-02")][Trait("TestCase", "grid-models-02.1")]
    public async Task Creation()
    {
        var m = await Create();
        Assert.Empty(m["versions"]!.AsArray());
        Assert.Null(m["publishedVersionId"]);
        var bad = await Client.PostAsJsonAsync("/api/grid-models", new { name = " ", region = "Урал", ownerId = "ural", organizationId = "ural" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact(DisplayName = "[grid-models-03.1] Проверка JSON и сравнение объектов")]
    [Trait("Scenario", "grid-models-03")][Trait("TestCase", "grid-models-03.1")]
    public async Task ValidationAndDiff()
    {
        var m = await Upload(await Create());
        var v = VersionId(m);
        Assert.Empty(m["versions"]![0]!["issues"]!.AsArray());
        Assert.Equal("added", m["versions"]![0]!["changes"]![0]!["kind"]!.GetValue<string>());
        foreach (var action in new[] { "submit", "approve", "publish" }) m = await Next(m, v, action);
        m = await Upload(m, new { objects = new[] { new { id = "ps-1", name = "Новое название", type = "substation", voltageKv = 110, links = Array.Empty<string>() } } });
        Assert.Equal("modified", m["versions"]![1]!["changes"]![0]!["kind"]!.GetValue<string>());
        m = await Upload(m, new { objects = new[] { new { id = "ps-2", name = "Новая ПС", type = "substation", voltageKv = 110, links = Array.Empty<string>() } } });
        var changes = m["versions"]![2]!["changes"]!.AsArray();
        Assert.Contains(changes, c => c!["kind"]!.GetValue<string>() == "removed");
        Assert.Contains(changes, c => c!["kind"]!.GetValue<string>() == "added");
        m = await Upload(m, new { objects = new[] {
            new { id = "dup", name = "ПС", type = "substation", voltageKv = 220, links = new[] { "missing" } },
            new { id = "dup", name = "ПС", type = "line", voltageKv = 220, links = Array.Empty<string>() } } });
        Assert.True(m["versions"]!.AsArray().Last()!["issues"]!.AsArray().Count >= 2);
        Assert.Equal(HttpStatusCode.BadRequest, (await Act(m, VersionId(m), "submit")).StatusCode);
        var malformed = await Client.PostAsJsonAsync($"/api/grid-models/{Id(m)}/versions", new { title = "Ошибка", revision = Revision(m), organizationId = "ural", baseVersionId = v, document = new { } });
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
    }

    [Fact(DisplayName = "[grid-models-04.1] Согласование, публикация, возврат и запрет переходов")]
    [Trait("Scenario", "grid-models-04")][Trait("TestCase", "grid-models-04.1")]
    public async Task Workflow()
    {
        var m = await Upload(await Create()); var v = VersionId(m);
        Assert.Equal(HttpStatusCode.Conflict, (await Act(m, v, "publish")).StatusCode);
        foreach (var action in new[] { "submit", "approve", "publish" }) m = await Next(m, v, action);
        Assert.Equal(v, m["publishedVersionId"]!.GetValue<string>());
        m = await Upload(m); v = VersionId(m); m = await Next(m, v, "submit");
        Assert.Equal(HttpStatusCode.BadRequest, (await Act(m, v, "reject")).StatusCode);
        m = await Next(m, v, "reject", "Уточните данные ПС");
        Assert.Equal("rejected", m["versions"]!.AsArray().Last()!["status"]!.GetValue<string>());
        Assert.Equal("Уточните данные ПС", m["events"]!.AsArray().Last()!["comment"]!.GetValue<string>());
    }

    [Fact(DisplayName = "[grid-models-05.1] Устаревшая база, ревизия и параллельная запись")]
    [Trait("Scenario", "grid-models-05")][Trait("TestCase", "grid-models-05.1")]
    public async Task Conflicts()
    {
        var m = await Upload(await Create()); var first = VersionId(m);
        m = await Upload(m); var second = VersionId(m);
        foreach (var v in new[] { first, second }) { m = await Next(m, v, "submit"); m = await Next(m, v, "approve"); }
        m = await Next(m, first, "publish");
        var conflict = await Act(m, second, "publish");
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Contains("Данные изменились", await conflict.Content.ReadAsStringAsync());
        var fresh = await Upload(m); var third = VersionId(fresh);
        Assert.Equal(HttpStatusCode.Conflict, (await Act(m, second, "publish")).StatusCode);
        var both = await Task.WhenAll(Act(fresh, third, "submit"), Act(fresh, third, "submit"));
        Assert.Single(both, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(both, r => r.StatusCode == HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "[grid-models-06.1] Скачивание только опубликованного JSON")]
    [Trait("Scenario", "grid-models-06")][Trait("TestCase", "grid-models-06.1")]
    public async Task Download()
    {
        var m = await Upload(await Create()); var v = VersionId(m);
        var url = $"/api/grid-models/{Id(m)}/versions/{v}/download";
        Assert.Equal(HttpStatusCode.Conflict, (await Client.GetAsync(url)).StatusCode);
        foreach (var action in new[] { "submit", "approve", "publish" }) m = await Next(m, v, action);
        var response = await Client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition!.ToString());
        var document = (await response.Content.ReadFromJsonAsync<JsonNode>())!;
        Assert.Equal("ps-1", document["objects"]![0]!["id"]!.GetValue<string>());
        Assert.Equal(220, document["objects"]![0]!["voltageKv"]!.GetValue<int>());
    }

    [Fact(DisplayName = "[grid-models-07.1] Сохранность истории при новом экземпляре API")]
    [Trait("Scenario", "grid-models-07")][Trait("TestCase", "grid-models-07.1")]
    public async Task Persistence()
    {
        var m = await Upload(await Create()); var v = VersionId(m); m = await Next(m, v, "submit", "На проверку");
        await using var other = fixture.NewFactory();
        var reloaded = (await other.CreateClient().GetFromJsonAsync<JsonNode>("/api/grid-models/" + Id(m)))!;
        Assert.Equal(Revision(m), Revision(reloaded));
        Assert.Equal(3, reloaded["events"]!.AsArray().Count);
        Assert.Equal("so", reloaded["events"]!.AsArray().Last()!["organizationId"]!.GetValue<string>());
        Assert.True(DateTimeOffset.TryParse(reloaded["events"]!.AsArray().Last()!["at"]!.GetValue<string>(), out _));
    }

    [Fact(DisplayName = "[grid-models-08.1] Неизвестная организация не меняет данные")]
    [Trait("Scenario", "grid-models-08")][Trait("TestCase", "grid-models-08.1")]
    public async Task UnknownOrganization()
    {
        var before = (await Client.GetFromJsonAsync<JsonArray>("/api/grid-models"))!.Count;
        var response = await Client.PostAsJsonAsync("/api/grid-models", new { name = "Новая", region = "Урал", ownerId = "ural", organizationId = "unknown" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, (await Client.GetFromJsonAsync<JsonArray>("/api/grid-models"))!.Count);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync("/api/grid-models/no-such-model")).StatusCode);
    }
}
