using Sdd.Api.Features.SystemStatus;

namespace Sdd.Api.UnitTests;

public class SystemStatusTests
{
    [Theory(DisplayName = "[system-status-02.3] Пустое значение версии считается незаданным")]
    [Trait("Scenario", "system-status-02")]
    [Trait("TestCase", "system-status-02.3")]
    [InlineData("1.2.3", "1.2.3")]
    [InlineData(null, "dev")]
    [InlineData("", "dev")]
    [InlineData("   ", "dev")]
    public void Version_is_taken_from_APP_VERSION_or_defaults_to_dev(string? appVersion, string expected)
    {
        var status = SystemStatusEndpoints.Create(appVersion);

        Assert.Equal("ok", status.Status);
        Assert.Equal(expected, status.Version);
    }

    [Theory(DisplayName = "[system-status-05.1] Нормализация версии с пробелами")]
    [Trait("Scenario", "system-status-05")]
    [Trait("TestCase", "system-status-05.1")]
    [InlineData(" 2.0.0 ", "2.0.0")]
    [InlineData("2.0.0\n", "2.0.0")]
    [InlineData("\t2.0.0\r\n", "2.0.0")]
    [InlineData(" \n ", "dev")]
    public void Whitespace_around_version_is_removed(string appVersion, string expected)
    {
        Assert.Equal(expected, SystemStatusEndpoints.Create(appVersion).Version);
    }
}
