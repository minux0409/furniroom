FROM node:20-slim

WORKDIR /app

# Prisma requires openssl at runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# Install dependencies
# pnpm-workspace.yaml is intentionally not copied — it blocks @prisma/engines
# build scripts which are required in Docker (Linux native binaries)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

# Build TypeScript
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run DB migrations then start server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
