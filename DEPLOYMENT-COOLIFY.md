# OpenClaw Coolify Deployment - Summary

## What We've Created

This repository now has full support for deploying OpenClaw to Coolify, a self-hosted platform alternative to Railway/Render.

## Files Added

### 1. **docs/coolify.mdx** (Main Documentation)

Comprehensive deployment guide covering:

- Two deployment methods (Git-based and Docker Compose)
- Environment variable configuration
- Health checks and monitoring
- Post-deployment setup
- Troubleshooting
- Migration from other platforms

Location: `/home/vonj/dev/openclaw/docs/coolify.mdx`
Published at: https://docs.openclaw.ai/coolify

### 2. **coolify.yaml** (Docker Compose Template)

Production-ready Docker Compose configuration optimized for Coolify:

- Health checks configured
- Environment variables templated
- Persistent volume setup
- Proper restart policies
- Init process handling

Location: `/home/vonj/dev/openclaw/coolify.yaml`

### 3. **.env.coolify** (Environment Template)

Complete environment variable template with:

- Required variables clearly marked
- Optional provider credentials
- Detailed comments
- Secure defaults
- All configuration options

Location: `/home/vonj/dev/openclaw/.env.coolify`

### 4. **COOLIFY.md** (Quick Start Guide)

Concise quick-start reference for:

- Fast deployment steps
- Essential environment variables
- Health check configuration
- Links to full documentation

Location: `/home/vonj/dev/openclaw/COOLIFY.md`

## Documentation Updates

### Updated Files:

1. **docs/docs.json**
   - Added `coolify` to navigation under "Install & Updates"
   - Added redirects for `/install/coolify` → `/coolify`

2. **docs/install/docker.md**
   - Added cloud deployment callout at the top
   - Links to Coolify, Railway, Render, Northflank

3. **README.md**
   - Added Coolify link to main navigation
   - Now visible on GitHub repository

## Deployment Options Summary

OpenClaw now supports these deployment methods:

| Platform       | Type        | Difficulty | Best For                  |
| -------------- | ----------- | ---------- | ------------------------- |
| **Local**      | CLI install | Easy       | Development, personal use |
| **Docker**     | Self-hosted | Medium     | Manual server deployment  |
| **Coolify**    | Self-hosted | Easy       | Self-hosted with web UI   |
| **Railway**    | Managed     | Easy       | Quick cloud deployment    |
| **Render**     | Managed     | Easy       | Infrastructure as Code    |
| **Northflank** | Managed     | Medium     | Advanced cloud features   |

## Key Features for Coolify Deployment

### Automatic Setup

- Git-based auto-build from Dockerfile
- Health check monitoring (`/health` endpoint)
- HTTPS with auto-provisioned Let's Encrypt certificates
- Volume management for persistent storage

### Security

- Token-based authentication
- Password-protected setup wizard
- Non-root container user (UID 1000)
- Environment variable management

### Persistence

- Config directory: `/data/.openclaw`
- Workspace directory: `/data/workspace`
- Survives container restarts and redeployments

### Post-Deployment

- Web setup wizard: `https://<domain>/setup`
- Control UI: `https://<domain>/openclaw`
- Backup/export: `https://<domain>/setup/export`

## Next Steps

To deploy OpenClaw on Coolify:

1. **Fork or clone** this repository
2. **Create a new Application** in Coolify
3. **Point to the repository** (Git-based deployment)
4. **Configure**:
   - Build Pack: Dockerfile
   - Port: 8080
   - Volume: `/data`
5. **Set environment variables** (see `.env.coolify`)
6. **Deploy** and access setup wizard

## Testing Recommendations

Before promoting to users:

1. **Test Git-based deployment**:
   - Deploy from this repo
   - Verify build completes
   - Check health endpoint responds
   - Complete setup wizard

2. **Test Docker Compose deployment**:
   - Deploy using `coolify.yaml`
   - Verify volume persistence
   - Test container restart

3. **Test persistence**:
   - Create config via setup wizard
   - Redeploy application
   - Verify config persists

4. **Test health checks**:
   - Verify Coolify monitors `/health`
   - Test auto-restart on failure

## Documentation Links

All docs use root-relative paths for Mintlify:

- Internal docs: `/coolify`, `/railway`, `/install/docker`
- External (README): `https://docs.openclaw.ai/coolify`

## Environment Variables Reference

**Required**:

- `OPENCLAW_GATEWAY_TOKEN` — Auth token (generate with `openssl rand -hex 32`)
- `SETUP_PASSWORD` — Setup wizard password
- `PORT=8080` — HTTP server port

**Recommended**:

- `OPENCLAW_STATE_DIR=/data/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=/data/workspace`
- `OPENCLAW_GATEWAY_PORT=8080`
- `OPENCLAW_GATEWAY_BIND=lan`

**Optional** (can be set via `/setup` wizard):

- `CLAUDE_AI_SESSION_KEY`
- `CLAUDE_WEB_SESSION_KEY`
- `CLAUDE_WEB_COOKIE`

## Comparison with Existing Platforms

### vs Railway

- **Similarity**: Volume storage, web UI, HTTPS
- **Difference**: Coolify is self-hosted, Railway is managed SaaS

### vs Render

- **Similarity**: Docker-based, health checks, persistent storage
- **Difference**: Coolify offers more control, Render has Blueprint IaC

### vs Docker (manual)

- **Similarity**: Same Docker image and compose file
- **Difference**: Coolify adds web UI, monitoring, auto-HTTPS

## Files Not Modified

These existing files remain unchanged:

- `Dockerfile` — Already production-ready
- `docker-compose.yml` — Works with Coolify
- `docker-setup.sh` — For local Docker setup
- `render.yaml` — Render-specific config

## Support Resources

- **Coolify Docs**: https://coolify.io/docs
- **OpenClaw Docs**: https://docs.openclaw.ai
- **GitHub Issues**: https://github.com/openclaw/openclaw/issues

---

**Status**: Ready for deployment testing and user rollout
**Documentation**: Published to https://docs.openclaw.ai/coolify (when deployed)
**Compatibility**: Works with existing OpenClaw Docker setup
