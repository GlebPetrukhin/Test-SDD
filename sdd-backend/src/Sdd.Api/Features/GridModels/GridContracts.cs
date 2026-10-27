namespace Sdd.Api.Features.GridModels;

public sealed record Organization(string Id, string Name, string Kind);
public sealed record NetworkObject(string Id, string Name, string Type, double VoltageKv, string[] Links);
public sealed record NetworkDocument(NetworkObject[] Objects);
public sealed record ObjectChange(string ObjectId, string Name, string Kind);
public sealed record GridEvent(string Id, string? VersionId, string Action, string OrganizationId, string Comment, DateTimeOffset At);
public sealed class GridVersion
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int Number { get; set; }
    public string Title { get; set; } = "";
    public string? BaseVersionId { get; set; }
    public string Status { get; set; } = "draft";
    public string OrganizationId { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public NetworkDocument Document { get; set; } = new([]);
    public List<string> Issues { get; set; } = [];
    public List<ObjectChange> Changes { get; set; } = [];
}
public sealed class GridModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "";
    public string Region { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public int Revision { get; set; } = 1;
    public string? PublishedVersionId { get; set; }
    public List<GridVersion> Versions { get; set; } = [];
    public List<GridEvent> Events { get; set; } = [];
}
public sealed class GridState { public List<GridModel> Models { get; set; } = []; }
public sealed record CreateModelRequest(string Name, string Region, string OwnerId, string OrganizationId);
public sealed record CreateVersionRequest(string Title, string? BaseVersionId, int Revision, string OrganizationId, NetworkDocument Document);
public sealed record VersionActionRequest(string Action, int Revision, string OrganizationId, string Comment);
public sealed record GridError(string Code, string Message);
public sealed class GridException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
