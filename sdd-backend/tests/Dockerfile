FROM mcr.microsoft.com/dotnet/sdk:10.0
WORKDIR /source
COPY global.json Sdd.Backend.slnx ./
COPY src/Sdd.Api/Sdd.Api.csproj src/Sdd.Api/
COPY tests/unit/Sdd.Api.UnitTests.csproj tests/unit/
COPY tests/integration/Sdd.Api.IntegrationTests.csproj tests/integration/
RUN dotnet restore
COPY src/ src/
COPY tests/ tests/
ENTRYPOINT ["dotnet", "test", "--no-restore", "--logger", "console;verbosity=normal"]
