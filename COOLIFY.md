# OpenClaw on Coolify - Quick Start

Deploy OpenClaw on your [Coolify](https://coolify.io) instance with Docker.

## Quick Deploy (Git-based)

1. **Create new Application** in Coolify
   - Resource Type: **Application**
   - Source: **Public Git Repository**
   - Repository: `https://github.com/openclaw/openclaw`
   - Branch: `main`

2. **Configure Build**
   - Build Pack: **Dockerfile**
   - Port: `8080`

3. **Add Storage Volume**
   - Name: `openclaw-data`
   - Mount Path: `/data`

4. **Set Environment Variables**
   ```bash
   # Required
   PORT=8080
   SETUP_PASSWORD=your-secure-password
   OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
   
   # Storage paths
   OPENCLAW_STATE_DIR=/data/.openclaw
   OPENCLAW_WORKSPACE_DIR=/data/workspace
   
   # Gateway config
   OPENCLAW_GATEWAY_PORT=8080
   OPENCLAW_GATEWAY_BIND=lan
   ```

5. **Deploy** and wait for build to complete

6. **Complete Setup** at `https://<your-domain>/setup`

## Deploy with Docker Compose

Alternatively, use the included `coolify.yaml`:

1. **Create new Docker Compose** resource in Coolify
2. Point to repository with `coolify.yaml`
3. Set environment variables (see `.env.coolify` template)
4. Deploy

## Environment Variables

Copy `.env.coolify` and customize:

```bash
# Required
OPENCLAW_GATEWAY_TOKEN=<generate-with-openssl-rand-hex-32>
SETUP_PASSWORD=<your-password>

# HTTP Configuration
PORT=8080
OPENCLAW_GATEWAY_PORT=8080
OPENCLAW_GATEWAY_BIND=lan

# Storage
OPENCLAW_STATE_DIR=/data/.openclaw
OPENCLAW_WORKSPACE_DIR=/data/workspace
```

## Health Check

Configure in Coolify:
- **Path**: `/health`
- **Port**: `8080`
- **Interval**: `30s`

## After Deployment

1. **Setup Wizard**: `https://<domain>/setup`
2. **Control UI**: `https://<domain>/openclaw`
3. **Backup/Export**: `https://<domain>/setup/export`

## Documentation

Full deployment guide: https://docs.openclaw.ai/coolify

## Support

- [Documentation](https://docs.openclaw.ai)
- [GitHub Issues](https://github.com/openclaw/openclaw/issues)
