FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV OPENCLAW_PREFER_PNPM=1
RUN pnpm ui:build

# Install gosu for easy step-down from root
RUN set -eux; \
	apt-get update; \
	apt-get install -y gosu; \
	rm -rf /var/lib/apt/lists/*; \
	gosu nobody true

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
RUN mkdir -p /data

ENV NODE_ENV=production

# Default port for gateway (can be overridden via PORT env var)
ENV PORT=8080
EXPOSE 8080

# Security hardening: Container runs as root initially to fix permissions,
# then drops to 'node' user via docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default: Start gateway in deployment mode
# - --allow-unconfigured: Enables /setup wizard for first-time configuration
# - --bind lan: Listen on all interfaces (required for container networking)
# - Port is read from OPENCLAW_GATEWAY_PORT env var (entrypoint maps PORT -> OPENCLAW_GATEWAY_PORT)
CMD ["node", "dist/index.js", "gateway", "--allow-unconfigured", "--bind", "lan"]
