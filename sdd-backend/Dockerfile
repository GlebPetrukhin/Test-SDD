# Linux-образ: одинаково работает в Kubernetes на Windows (Docker Desktop / Rancher Desktop / minikube) и Linux.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY global.json Sdd.Backend.slnx ./
COPY src/Sdd.Api/Sdd.Api.csproj src/Sdd.Api/
RUN dotnet restore src/Sdd.Api/Sdd.Api.csproj
COPY src/ src/
RUN dotnet publish src/Sdd.Api/Sdd.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Sdd.Api.dll"]
