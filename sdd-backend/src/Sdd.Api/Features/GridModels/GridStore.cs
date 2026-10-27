using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;
using NpgsqlTypes;

namespace Sdd.Api.Features.GridModels;

public sealed class GridStore(NpgsqlDataSource dataSource)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly SemaphoreSlim initialization = new(1, 1);
    private bool initialized;
    private async Task Initialize(CancellationToken ct)
    {
        if (initialized) return;
        await initialization.WaitAsync(ct);
        try
        {
            if (initialized) return;
            await using var connection = await dataSource.OpenConnectionAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);
            // Межпроцессная блокировка защищает первый запуск нескольких реплик.
            await using (var guard = new NpgsqlCommand("SELECT pg_advisory_xact_lock(726031)", connection, transaction)) await guard.ExecuteNonQueryAsync(ct);
            await using (var create = new NpgsqlCommand("CREATE TABLE IF NOT EXISTS grid_workspace (id integer PRIMARY KEY CHECK (id = 1), payload jsonb NOT NULL)", connection, transaction)) await create.ExecuteNonQueryAsync(ct);
            await using var insert = new NpgsqlCommand("INSERT INTO grid_workspace (id, payload) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", connection, transaction);
            insert.Parameters.Add(new() { NpgsqlDbType = NpgsqlDbType.Jsonb, Value = JsonSerializer.Serialize(GridSeed.Create(), Json) });
            await insert.ExecuteNonQueryAsync(ct);
            await transaction.CommitAsync(ct);
            initialized = true;
        }
        finally { initialization.Release(); }
    }
    public async Task<T> Execute<T>(Func<GridState, T> operation, bool write, CancellationToken ct)
    {
        await Initialize(ct);
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        await using var select = new NpgsqlCommand("SELECT payload::text FROM grid_workspace WHERE id = 1 FOR UPDATE", connection, transaction);
        var payload = (string)(await select.ExecuteScalarAsync(ct))!;
        var state = JsonSerializer.Deserialize<GridState>(payload, Json)!;
        var result = operation(state);
        if (write)
        {
            await using var update = new NpgsqlCommand("UPDATE grid_workspace SET payload = $1 WHERE id = 1", connection, transaction);
            update.Parameters.Add(new() { NpgsqlDbType = NpgsqlDbType.Jsonb, Value = JsonSerializer.Serialize(state, Json) });
            await update.ExecuteNonQueryAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return result;
    }
}

public sealed class GridDatabaseHealth(NpgsqlDataSource dataSource) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try {
            await using var command = dataSource.CreateCommand("SELECT 1");
            await command.ExecuteScalarAsync(ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex) { return HealthCheckResult.Unhealthy("Хранилище недоступно", ex); }
    }
}
