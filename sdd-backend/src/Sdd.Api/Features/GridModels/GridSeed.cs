namespace Sdd.Api.Features.GridModels;

public static class GridSeed
{
    public static GridState Create()
    {
        var state = new GridState();
        var rows = new[] {
            ("ural-220", "Сеть Урала · 220 кВ", "Свердловская область", "ural", "review"),
            ("perm-110", "Пермский энергорайон · 110 кВ", "Пермский край", "ural", "published"),
            ("generation-500", "Выдача мощности ГРЭС · 500 кВ", "Тюменская область", "generation", "draft")
        };
        foreach (var (id, name, region, owner, latest) in rows)
        {
            var document = new NetworkDocument([
                new("ps-north", "ПС Северная", "substation", 220, ["line-1"]),
                new("line-1", "ВЛ Северная — Центральная", "line", 220, ["ps-north", "ps-center"]),
                new("ps-center", "ПС Центральная", "substation", 220, ["line-1", "at-1"]),
                new("at-1", "Автотрансформатор АТ-1", "transformer", 110, ["ps-center", "bus-1"]),
                new("bus-1", "Система шин 110 кВ", "busbar", 110, ["at-1"])
            ]);
            var time = DateTimeOffset.UtcNow.AddDays(-2);
            var baseline = new GridVersion { Id = id + "-v1", Number = 1, Title = "Базовая согласованная модель", Status = "published", OrganizationId = owner, CreatedAt = time, Document = document, Changes = GridRules.Diff(null, document) };
            var model = new GridModel { Id = id, Name = name, Region = region, OwnerId = owner, PublishedVersionId = baseline.Id, Versions = [baseline],
                Events = [new(id + "-e1", baseline.Id, "publish", "so", "Базовая модель опубликована", time)] };
            if (latest != "published")
            {
                var updated = new NetworkDocument([..document.Objects, new("ps-east", "ПС Восточная", "substation", 110, ["bus-1"])]);
                var version = new GridVersion { Id = id + "-v2", Number = 2, Title = "Подключение ПС Восточная", BaseVersionId = baseline.Id, Status = latest, OrganizationId = owner, CreatedAt = time.AddDays(1), Document = updated, Changes = GridRules.Diff(document, updated) };
                model.Versions.Add(version);
                model.Events.Add(new(id + "-e2", version.Id, "upload", owner, version.Title, time.AddDays(1)));
                if (latest == "review") model.Events.Add(new(id + "-e3", version.Id, "submit", owner, "Проверка смежных связей", time.AddDays(1).AddHours(1)));
            }
            state.Models.Add(model);
        }
        return state;
    }
}
