using Sdd.Api.Features.SystemStatus;
using Sdd.Api.Features.GridModels;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddGridModels(builder.Configuration);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 2 * 1024 * 1024);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Пробы Kubernetes (технические, не из спецификации).
app.MapHealthChecks("/healthz/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/healthz/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });

// Эндпоинты фич: по одному Map*-методу на capability из sdd-specs.
app.MapSystemStatus();
app.MapGridModels();

app.Run();

// Нужен интеграционным тестам (WebApplicationFactory<Program>).
public partial class Program;
