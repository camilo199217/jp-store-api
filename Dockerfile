# ── Stage 1: Build ───────────────────────────────────────────────────────────
# Uso multi-stage build para que la imagen final no incluya devDependencies
# ni el código fuente TypeScript — solo el JS compilado. Imagen más pequeña y segura.
FROM node:22-alpine AS builder

# Instalo pnpm globalmente en el builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copio primero los archivos de dependencias para aprovechar el cache de Docker
# pnpm-workspace.yaml contiene allowBuilds — sin él pnpm bloquea scripts de @scarf/scarf y esbuild
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalo TODAS las dependencias (incluyendo dev) para poder compilar
RUN pnpm install --frozen-lockfile

# Copio el código fuente y compilo TypeScript
COPY . .
RUN pnpm build

# ── Stage 2: Production ──────────────────────────────────────────────────────
# Imagen final limpia — solo el código compilado y las dependencias de producción
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copio solo lo necesario del stage anterior
# pnpm-workspace.yaml es obligatorio — define qué build scripts están permitidos
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

# El usuario node viene por defecto en la imagen alpine — nunca corro como root
USER node

EXPOSE 3000

# Health check para que ECS/Docker Compose sepan si el contenedor está saludable
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/products || exit 1

CMD ["node", "dist/main.js"]
