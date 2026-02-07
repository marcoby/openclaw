# Marcoby Managed Deployment Strategy: "Self-Contained Units"

To leverage "unlimited storage" on your VPS/Host and simplify management, we use a **Single-Volume / Host-Path Strategy**.

Every client instance is a self-contained folder on your host. You back up the folder, you back up the client.

## 1. Directory Structure

Create a master directory on your host (e.g., `/data/marcoby-instances` or `/mnt/big-disk/instances`).

Inside, create a folder for each client:

```text
/data/marcoby-instances/
├── client-alpha/
│   ├── docker-compose.yml       <- The definition
│   ├── .env                     <- Keys (Azure, OpenAI, etc.)
│   └── persistence/             <- ALL data lives here (mapped to container)
│       ├── .openclaw/           <- Internal config (identity, sessions)
│       └── workspace/           <- The "Brain" (SOPs, Knowledge)
├── client-beta/
│   ├── ...
```

## 2. Docker Compose Configuration

For each client, use this standardized `docker-compose.yml`. It maps the local `persistence/` folder to the container's `/data` volume.

```yaml
services:
  openclaw:
    image: marcoby-ops:latest # Your built image
    restart: always
    environment:
      # Tell OpenClaw to look for data in /data
      OPENCLAW_CONFIG_DIR: /data/.openclaw
      OPENCLAW_WORKSPACE_DIR: /data/workspace

      # Load keys from .env
      MSTEAMS_APP_ID: ${MSTEAMS_APP_ID}
      MSTEAMS_APP_PASSWORD: ${MSTEAMS_APP_PASSWORD}
      MSTEAMS_TENANT_ID: ${MSTEAMS_TENANT_ID}

    volumes:
      # THE GOLDEN MAPPING:
      # Map local 'persistence' folder to '/data' inside container
      - ./persistence:/data

    ports:
      # Unique port per client if not using Coolify proxy
      - "${PORT}:18789"
```

## 3. Hydration (Automatic)

When you deploy a new client:

1. Create the folder: `mkdir client-gamma`
2. Copy the template `docker-compose.yml` and `.env`.
3. Create the data dir: `mkdir persistence` (ensure it's writable by UID 1000: `chown 1000:1000 persistence`).
4. **Run**: `docker compose up -d`

**Result**: Because `persistence/workspace` starts empty, the managed `docker-entrypoint.sh` will kick in and **automatically copy** the latest "Marcoby Core" (SOPs, identity, knowledge) from the image into `persistence/workspace/`.

## 4. Maintenance

- **Update Brain**: Build a new Docker image with updated `packages/marcoby-core`. Redeploy. (Note: Only _new_ files won't overwrite existing user changes unless you force it, currently the script is safe/conservative).
- **Backup**: `tar -czf client-alpha-backup.tar.gz client-alpha/`
- **Migrate**: Copy the folder to another server, `docker compose up -d`.

This strategy keeps "Code as Configuration" for the AI's base state, while keeping User Data self-contained on your "unlimited" disk.
