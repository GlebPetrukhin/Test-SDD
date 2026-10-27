using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Sdd.Api.IntegrationTests;

/// <summary>Спецификация: sdd-specs/openspec/specs/system-status/spec.md;
/// тест-кейсы: sdd-specs/openspec/changes/archive/2026-10-27-add-system-status/test-cases.md</summary>
public class SystemStatusTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private sealed record StatusResponse(string Status, string Version);

    [Fact(DisplayName = "[system-status-01.1] Статус бэкенда по API")]
    [Trait("Scenario", "system-status-01")]
    [Trait("TestCase", "system-status-01.1")]
    public async Task Status_returns_ok_with_version()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<StatusResponse>();
        Assert.NotNull(body);
        Assert.Equal("ok", body.Status);
        Assert.False(string.IsNullOrWhiteSpace(body.Version));
    }

    [Fact(DisplayName = "[system-status-02.1] Версия из настройки развёртывания")]
    [Trait("Scenario", "system-status-02")]
    [Trait("TestCase", "system-status-02.1")]
    public async Task Status_version_comes_from_APP_VERSION()
    {
        var client = factory
            .WithWebHostBuilder(b => b.UseSetting("APP_VERSION", "1.2.3"))
            .CreateClient();

        var body = await client.GetFromJsonAsync<StatusResponse>("/api/status");

        Assert.Equal("1.2.3", body?.Version);
    }

    [Fact(DisplayName = "[system-status-02.2] Версия по умолчанию — dev")]
    [Trait("Scenario", "system-status-02")]
    [Trait("TestCase", "system-status-02.2")]
    public async Task Status_version_defaults_to_dev()
    {
        var client = factory.CreateClient();

        var body = await client.GetFromJsonAsync<StatusResponse>("/api/status");

        Assert.Equal("dev", body?.Version);
    }

    [Fact(DisplayName = "[system-status-05.2] Версия с пробелами из окружения приходит в API без них")]
    [Trait("Scenario", "system-status-05")]
    [Trait("TestCase", "system-status-05.2")]
    public async Task Status_version_from_environment_is_trimmed()
    {
        var client = factory
            .WithWebHostBuilder(b => b.UseSetting("APP_VERSION", "  3.1.0  "))
            .CreateClient();

        var response = await client.GetAsync("/api/status");
        var body = await response.Content.ReadFromJsonAsync<StatusResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("3.1.0", body?.Version);
    }
}
