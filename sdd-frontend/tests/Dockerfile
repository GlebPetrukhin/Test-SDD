FROM public.ecr.aws/docker/library/node:22-bookworm AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
RUN npx playwright install --with-deps chromium
FROM dependencies AS tests
COPY . .
ENV CI=1
ENV NG_BUILD_MAX_WORKERS=2
CMD ["sh", "-c", "npm run test:ci && npm run e2e -- --grep-invert @smoke"]
