namespace Sdd.Api.Features.SystemStatus;

/// <summary>Capability system-status (sdd-specs/openspec/specs/system-status).</summary>
public static class SystemStatusEndpoints
{
    public sealed record StatusResponse(string Status, string Version);

    /// <summary>Версия берётся из APP_VERSION; если не задана — "dev".</summary>
    public static StatusResponse Create(string? appVersion) =>
        new("ok", string.IsNullOrWhiteSpace(appVersion) ? "dev" : appVersion.Trim());

    public static IEndpointRouteBuilder MapSystemStatus(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/status", (IConfiguration config) => Create(config["APP_VERSION"]))
            .WithName("GetSystemStatus");
        return app;
    }
}
