using System.Text.Json;
using Npgsql;

namespace Sdd.Api.Features.GridModels;

public static class GridModelsEndpoints
{
    public static IServiceCollection AddGridModels(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(_ => NpgsqlDataSource.Create(configuration.GetConnectionString("GridModels")
            ?? "Host=localhost;Port=5432;Database=sdd;Username=sdd;Password=sdd-local-demo;Timeout=5;Command Timeout=15"));
        services.AddSingleton<GridStore>();
        services.AddHealthChecks().AddCheck<GridDatabaseHealth>("grid-database", tags: ["ready"]);
        return services;
    }
    public static void MapGridModels(this WebApplication app)
    {
        app.MapGet("/api/organizations", () => GridRules.Organizations);
        var group = app.MapGroup("/api/grid-models");
        group.AddEndpointFilter(async (context, next) => {
            try { return await next(context); }
            catch (GridException ex) { return Results.Json(new GridError(ex.Code, ex.Message), statusCode: ex.Status); }
            catch (NpgsqlException ex) {
                context.HttpContext.RequestServices.GetRequiredService<ILogger<GridStore>>().LogError(ex, "Grid database request failed");
                return Results.Json(new GridError("unavailable", "Хранилище моделей временно недоступно."), statusCode: 503);
            }
        });
        group.MapGet("/", (GridStore store, string? q, CancellationToken ct) => store.Execute(state =>
            state.Models.Where(m => string.IsNullOrWhiteSpace(q) || (m.Name + " " + m.Region + " " + GridRules.Organizations.First(o => o.Id == m.OwnerId).Name).Contains(q.Trim(), StringComparison.OrdinalIgnoreCase)).ToList(), false, ct));
        group.MapGet("/{id}", (GridStore store, string id, CancellationToken ct) => store.Execute(state => GridRules.Model(state, id), false, ct));
        group.MapPost("/", async (GridStore store, CreateModelRequest request, CancellationToken ct) => {
            GridRules.Organization(request.OrganizationId); GridRules.Organization(request.OwnerId);
            var name = GridRules.Text(request.Name, "Название модели", 200);
            var region = GridRules.Text(request.Region, "Регион", 100);
            var model = await store.Execute(state => {
                var m = new GridModel { Name = name, Region = region, OwnerId = request.OwnerId };
                GridRules.Event(m, null, "create", request.OrganizationId, "Создана модель");
                state.Models.Add(m); return m;
            }, true, ct);
            return Results.Created($"/api/grid-models/{model.Id}", model);
        });
        group.MapPost("/{id}/versions", async (GridStore store, string id, CreateVersionRequest request, CancellationToken ct) => {
            GridRules.Organization(request.OrganizationId);
            var title = GridRules.Text(request.Title, "Описание изменения", 300);
            var issues = GridRules.Validate(request.Document);
            var model = await store.Execute(state => {
                var m = GridRules.Model(state, id); GridRules.Revision(m, request.Revision);
                if (request.BaseVersionId != m.PublishedVersionId) GridRules.Conflict();
                var baseline = m.Versions.Find(v => v.Id == m.PublishedVersionId)?.Document;
                var v = new GridVersion { Number = m.Versions.Count + 1, Title = title, BaseVersionId = request.BaseVersionId, OrganizationId = request.OrganizationId, Document = request.Document, Issues = issues, Changes = GridRules.Diff(baseline, request.Document) };
                m.Versions.Add(v); m.Revision++;
                GridRules.Event(m, v.Id, "upload", request.OrganizationId, title); return m;
            }, true, ct);
            return Results.Created($"/api/grid-models/{id}", model);
        });
        group.MapPost("/{id}/versions/{versionId}/actions", (GridStore store, string id, string versionId, VersionActionRequest request, CancellationToken ct) => store.Execute(state => {
            var m = GridRules.Model(state, id); GridRules.Act(m, GridRules.Version(m, versionId), request); return m;
        }, true, ct));
        group.MapGet("/{id}/versions/{versionId}/download", async (GridStore store, string id, string versionId, CancellationToken ct) => {
            var version = await store.Execute(state => GridRules.Version(GridRules.Model(state, id), versionId), false, ct);
            if (version.Status != "published") throw new GridException(409, "invalid_transition", "Для обмена доступна только опубликованная версия.");
            return Results.File(JsonSerializer.SerializeToUtf8Bytes(version.Document, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }), "application/json", $"model-{id}-v{version.Number}.json");
        });
    }
}
