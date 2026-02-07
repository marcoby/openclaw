FROM node:lts-bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive \
  PIP_ROOT_USER_ACTION=ignore

# Install Core & Power Tools + Docker CLI (client only)
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  python3 \
  python3-pip \
  python3-venv \
  jq \
  lsof \
  openssl \
  ca-certificates \
  gnupg \
  ripgrep fd-find fzf bat \
  pandoc \
  poppler-utils \
  ffmpeg \
  imagemagick \
  graphviz \
  sqlite3 \
  pass \
  chromium \
  && rm -rf /var/lib/apt/lists/*

# Install Docker CE CLI
RUN install -m 0755 -d /etc/apt/keyrings && \
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
  chmod a+r /etc/apt/keyrings/docker.asc && \
  echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null && \
  apt-get update && \
  apt-get install -y docker-ce-cli && \
  rm -rf /var/lib/apt/lists/*

# Install Go
RUN curl -L "https://go.dev/dl/go1.23.4.linux-amd64.tar.gz" -o go.tar.gz && \
  tar -C /usr/local -xzf go.tar.gz && \
  rm go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install GitHub CLI (gh)
RUN mkdir -p -m 755 /etc/apt/keyrings && \
  wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
  chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
  apt-get update && \
  apt-get install -y gh && \
  rm -rf /var/lib/apt/lists/*

# Install uv
ENV UV_INSTALL_DIR="/usr/local/bin"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Bun
ENV BUN_INSTALL_NODE=0
ENV BUN_INSTALL="/root/.bun"
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/* && \
  curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:/root/.bun/install/global/bin:${PATH}"

# Install Vercel, Marp, QMD
RUN bun install -g vercel @marp-team/marp-cli https://github.com/tobi/qmd && hash -r

# Configure QMD Persistence
ENV XDG_CACHE_HOME="/root/.openclaw/cache"

# Python tools
RUN pip3 install ipython csvkit openpyxl python-docx pypdf botasaurus browser-use playwright --break-system-packages && \
  playwright install-deps

# Debian aliases
RUN ln -s /usr/bin/fdfind /usr/bin/fd || true && \
  ln -s /usr/bin/batcat /usr/bin/bat || true

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
  fi

# Final Path
ENV PATH="/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin:/root/.local/bin:/root/.npm-global/bin:/root/.bun/bin:/root/.bun/install/global/bin:/root/.claude/bin:/root/.kimi/bin:/root/go/bin"

# Enable corepack for pnpm
RUN corepack enable

# Download local embedding model (Cached)
RUN mkdir -p /usr/local/share/openclaw/models && \
  curl -L --output /usr/local/share/openclaw/models/nomic-embed-text-v1.5.Q4_K_M.gguf \
  "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf"

# Install extra global tools (Cached)
# Untrusted, OpenCode, Summarize, Hyperbrowser, Claude, Kimi
RUN bun pm -g untrusted && \
  bun install -g @openai/codex @google/gemini-cli opencode-ai @steipete/summarize @hyperbrowser/agent && \
  curl -fsSL https://claude.ai/install.sh | bash && \
  curl -L https://code.kimi.com/install.sh | bash

# Symlinks for tools (Cached)
RUN ln -sf /root/.claude/bin/claude /usr/local/bin/claude || true && \
  ln -sf /root/.kimi/bin/kimi /usr/local/bin/kimi || true

# Copy package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches

# Install dependencies (Cached unless lockfile changes)
RUN pnpm install --frozen-lockfile

# Copy scripts (Separated to allow caching of install)
COPY scripts ./scripts

# Copy remaining source
COPY . .

# Restoring openclaw-approve symlink after scripts copy
RUN ln -sf /app/scripts/openclaw-approve.sh /usr/local/bin/openclaw-approve && \
  chmod +x /app/scripts/*.sh /usr/local/bin/openclaw-approve

# Build
RUN OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
ENV OPENCLAW_PREFER_PNPM=1
# Ensure UI dependencies are installed (in case root install missed them due to copy order)
RUN cd ui && pnpm install
RUN pnpm ui:build
RUN npm link

# Install gosu for easy step-down from root
RUN set -eux; \
  apt-get update; \
  apt-get install -y gosu; \
  rm -rf /var/lib/apt/lists/*; \
  gosu nobody true

# Extract bundled skills
RUN mkdir -p /app/bundled_skills && \
  cp -r /app/skills/* /app/bundled_skills/

# Allow non-root user to write temp files during runtime/tests.
RUN chown -R node:node /app

# Default port for gateway (can be overridden via PORT env var)
ENV PORT=18789
EXPOSE 18789

# Security hardening: Container runs as root initially to fix permissions,
# then drops to 'node' user via docker-entrypoint.sh

# Start gateway server via bootstrap script
CMD ["bash", "/app/scripts/bootstrap.sh"]
