namespace Sdd.Api.Features.GridModels;

public static class GridRules
{
    public static readonly Organization[] Organizations = [
        new("ural", "Россети Урал", "Сетевая компания"),
        new("so", "Системный оператор", "Диспетчерский центр"),
        new("generation", "Уральская генерация", "Генерирующая компания")
    ];
    public const string ConflictMessage = "Данные изменились. Обновите карточку и повторите действие.";
    public static void Invalid(string message) => throw new GridException(400, "validation", message);
    public static void Conflict() => throw new GridException(409, "conflict", ConflictMessage);
    public static void Organization(string? id)
    {
        if (!Organizations.Any(o => o.Id == id)) Invalid("Неизвестная организация.");
    }
    public static string Text(string? text, string field, int max)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Trim().Length > max) Invalid($"Поле «{field}» обязательно, не более {max} символов.");
        return text!.Trim();
    }
    public static GridModel Model(GridState state, string id) => state.Models.Find(m => m.Id == id)
        ?? throw new GridException(404, "not_found", "Модель не найдена.");
    public static GridVersion Version(GridModel model, string id) => model.Versions.Find(v => v.Id == id)
        ?? throw new GridException(404, "not_found", "Версия не найдена.");
    public static void Revision(GridModel model, int revision)
    {
        if (model.Revision != revision) Conflict();
    }
    public static List<string> Validate(NetworkDocument? document)
    {
        if (document?.Objects is null) Invalid("Документ должен содержать массив objects.");
        var objects = document!.Objects;
        if (objects.Length is < 1 or > 1000) Invalid("Модель должна содержать от 1 до 1000 объектов.");
        if (objects.Any(o => o is null || o.Id is null || o.Name is null || o.Type is null || o.Links is null || o.Links.Any(link => link is null)))
            Invalid("Каждый объект должен содержать строки id, name, type, число voltageKv и массив строк links.");
        var issues = new List<string>();
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var o in objects)
        {
            if (o is null) { issues.Add("Объект не может быть null."); continue; }
            if (string.IsNullOrWhiteSpace(o.Id) || o.Id.Length > 80) issues.Add("ID объекта обязателен, не более 80 символов.");
            else if (!ids.Add(o.Id)) issues.Add($"Повторяющийся ID: {o.Id}.");
            if (string.IsNullOrWhiteSpace(o.Name) || o.Name.Length > 200) issues.Add($"Объект {o.Id}: укажите название до 200 символов.");
            if (o.Type is not ("substation" or "line" or "transformer" or "busbar")) issues.Add($"Объект {o.Id}: неизвестный тип.");
            if (!double.IsFinite(o.VoltageKv) || o.VoltageKv <= 0 || o.VoltageKv > 1150) issues.Add($"Объект {o.Id}: напряжение должно быть больше 0 и не более 1150 кВ.");
            if (o.Links is null) issues.Add($"Объект {o.Id}: links должен быть массивом.");
        }
        foreach (var o in objects.Where(o => o is not null))
            foreach (var link in o.Links ?? [])
                if (link is null || !ids.Contains(link)) issues.Add($"Объект {o.Id}: ссылка {link} не найдена.");
        return issues;
    }
    public static List<ObjectChange> Diff(NetworkDocument? baseline, NetworkDocument current)
    {
        // Ошибочные ID уже перечислены в issues; сравнение остаётся доступным.
        var before = (baseline?.Objects ?? []).Where(o => o is not null && o.Id is not null).DistinctBy(o => o.Id).ToDictionary(o => o.Id);
        var after = current.Objects.Where(o => o is not null && o.Id is not null).DistinctBy(o => o.Id).ToDictionary(o => o.Id);
        var changes = new List<ObjectChange>();
        foreach (var (id, o) in after)
        {
            if (!before.TryGetValue(id, out var old)) changes.Add(new(id, o.Name ?? id, "added"));
            else if (o.Name != old.Name || o.Type != old.Type || o.VoltageKv != old.VoltageKv ||
                !(o.Links ?? []).ToHashSet().SetEquals(old.Links ?? [])) changes.Add(new(id, o.Name ?? id, "modified"));
        }
        changes.AddRange(before.Where(pair => !after.ContainsKey(pair.Key)).Select(pair => new ObjectChange(pair.Key, pair.Value.Name, "removed")));
        return changes;
    }
    public static void Event(GridModel model, string? versionId, string action, string org, string comment) =>
        model.Events.Add(new(Guid.NewGuid().ToString("N"), versionId, action, org, comment, DateTimeOffset.UtcNow));
    public static void Act(GridModel model, GridVersion version, VersionActionRequest request)
    {
        Organization(request.OrganizationId);
        Revision(model, request.Revision);
        var comment = request.Comment?.Trim() ?? "";
        if (comment.Length > 2000) Invalid("Комментарий не должен превышать 2000 символов.");
        var next = (version.Status, request.Action) switch {
            ("draft", "submit") => "review",
            ("review", "approve") => "approved",
            ("review", "reject") => "rejected",
            ("approved", "publish") => "published",
            _ => throw new GridException(409, "invalid_transition", "Действие недоступно для текущего состояния версии.")
        };
        if (request.Action == "reject" && comment.Length == 0) Invalid("Укажите причину возврата.");
        if (request.Action is "submit" or "approve" or "publish")
        {
            if (version.Issues.Count > 0) Invalid("Исправьте ошибки модели перед согласованием.");
            if (version.BaseVersionId != model.PublishedVersionId) Conflict();
        }
        version.Status = next;
        if (next == "published") model.PublishedVersionId = version.Id;
        model.Revision++;
        Event(model, version.Id, request.Action, request.OrganizationId, comment);
    }
}
