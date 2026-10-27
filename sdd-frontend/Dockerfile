# Linux-образ: одинаково работает в Kubernetes на Windows (Docker Desktop / Rancher Desktop / minikube) и Linux.
# Базовые образы берутся из Amazon ECR Public (те же официальные образы, что на Docker Hub, но без его лимитов
# и сетевых сбоев). Другой реестр/зеркало: docker build --build-arg NODE_IMAGE=... --build-arg NGINX_IMAGE=...
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine
ARG NGINX_IMAGE=public.ecr.aws/nginx/nginx-unprivileged:1.29-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig*.json ./
COPY public/ public/
COPY src/ src/
ENV NG_BUILD_MAX_WORKERS=2
RUN npx ng build --configuration production

FROM ${NGINX_IMAGE} AS runtime
ENV API_UPSTREAM=http://sdd-backend:8080
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/sdd-frontend/browser /usr/share/nginx/html
EXPOSE 8080
