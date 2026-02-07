# Coolify Deployment Testing Checklist

Use this checklist to verify the Coolify deployment works end-to-end.

## Pre-Deployment

- [ ] Coolify instance is running and accessible
- [ ] Have admin access to Coolify dashboard
- [ ] Repository is accessible (public or connected private repo)
- [ ] Generated secure tokens:
  ```bash
  openssl rand -hex 32  # For OPENCLAW_GATEWAY_TOKEN
  ```

## Deployment Method 1: Git-based (Recommended)

### Step 1: Create Application

- [ ] Logged into Coolify dashboard
- [ ] Created new Project (or selected existing)
- [ ] Created new Environment
- [ ] Clicked **+ Add Resource** → **Application**
- [ ] Selected **Public Git Repository**
- [ ] Entered repository URL: `https://github.com/openclaw/openclaw`
- [ ] Selected branch: `main`

### Step 2: Configure Build

- [ ] Set Build Pack to **Dockerfile**
- [ ] Dockerfile Location: `Dockerfile` (default)
- [ ] Port set to: `8080`
- [ ] Build Command: (leave default or empty)

### Step 3: Add Storage

- [ ] Navigated to **Storages** tab
- [ ] Added volume:
  - Name: `openclaw-data`
  - Mount Path: `/data`
  - Host Path: (empty - let Coolify manage)

### Step 4: Environment Variables

- [ ] Navigated to **Environment Variables** tab
- [ ] Added required variables:
  - [ ] `PORT=8080`
  - [ ] `SETUP_PASSWORD=<your-password>`
  - [ ] `OPENCLAW_GATEWAY_TOKEN=<64-char-hex>`
  - [ ] `OPENCLAW_STATE_DIR=/data/.openclaw`
  - [ ] `OPENCLAW_WORKSPACE_DIR=/data/workspace`
  - [ ] `OPENCLAW_GATEWAY_PORT=8080`
  - [ ] `OPENCLAW_GATEWAY_BIND=lan`
  - [ ] `NODE_ENV=production`

### Step 5: Configure Domain

- [ ] Navigated to **Domains** tab
- [ ] Domain configured (auto-generated or custom)
- [ ] HTTPS enabled
- [ ] SSL certificate provisioned

### Step 6: Configure Health Check

- [ ] Navigated to **Health Checks** tab
- [ ] Enabled health check
- [ ] Set Path: `/health`
- [ ] Set Port: `8080`
- [ ] Set Interval: `30s`

### Step 7: Deploy

- [ ] Clicked **Deploy** button
- [ ] Build logs visible in dashboard
- [ ] Build completed successfully
- [ ] Container started
- [ ] Health check passing

## Deployment Method 2: Docker Compose

### Setup

- [ ] Created new **Docker Compose** resource
- [ ] Connected to repository
- [ ] Selected `coolify.yaml` file
- [ ] Set environment variables (see `.env.coolify`)
- [ ] Verified volume configuration

### Deploy

- [ ] Clicked **Deploy**
- [ ] Compose stack started
- [ ] Services running
- [ ] Health checks passing

## Post-Deployment Verification

### Access Checks

- [ ] Can access application at `https://<domain>`
- [ ] Setup wizard accessible at `https://<domain>/setup`
- [ ] Control UI accessible at `https://<domain>/openclaw`
- [ ] Health endpoint responds at `https://<domain>/health`

### Setup Wizard

- [ ] Navigated to `/setup`
- [ ] Entered `SETUP_PASSWORD` successfully
- [ ] Can see model provider selection
- [ ] Can configure provider credentials
- [ ] Setup saves successfully

### Gateway Functionality

- [ ] Gateway accepting connections
- [ ] Can send test message via CLI (if configured)
- [ ] Logs visible in Coolify dashboard
- [ ] No error messages in logs

### Persistence Test

- [ ] Created configuration via setup wizard
- [ ] Noted a specific setting value
- [ ] Triggered redeploy in Coolify
- [ ] After redeploy, configuration persisted
- [ ] Settings remained intact

### Health Monitoring

- [ ] Health check status shows "healthy"
- [ ] Simulated failure (optional):
  - [ ] Killed container process
  - [ ] Coolify detected failure
  - [ ] Coolify auto-restarted container

### Backup/Export

- [ ] Can access `/setup/export`
- [ ] Export downloads successfully
- [ ] Export contains expected data

## Performance & Monitoring

### Resource Usage

- [ ] CPU usage reasonable (<50% under normal load)
- [ ] Memory usage stable
- [ ] Disk usage within limits
- [ ] No memory leaks observed

### Logs

- [ ] Application logs visible in Coolify
- [ ] Log format readable
- [ ] No critical errors
- [ ] Timestamps correct

### Networking

- [ ] HTTPS working (no SSL errors)
- [ ] WebSocket connections stable (if applicable)
- [ ] Reverse proxy working correctly

## Messaging Channels (Optional)

If configuring messaging channels:

### Telegram

- [ ] Bot token added via `/setup` or CLI
- [ ] Bot responds to messages
- [ ] Can send/receive messages

### Discord

- [ ] Bot token added
- [ ] Bot online in server
- [ ] Message content intent enabled
- [ ] Can send/receive messages

### WhatsApp

- [ ] Provider login via QR code works
- [ ] Can send/receive messages

## Troubleshooting Tests

### Common Issues

- [ ] Tested accessing `/setup` without password (should block)
- [ ] Tested invalid `SETUP_PASSWORD` (should reject)
- [ ] Tested missing `OPENCLAW_GATEWAY_TOKEN` (should error clearly)
- [ ] Checked logs for helpful error messages

### Recovery

- [ ] Can view container logs in Coolify
- [ ] Can restart container manually
- [ ] Can rebuild and redeploy
- [ ] Can roll back to previous deployment

## Documentation Verification

- [ ] Link in README works: https://docs.openclaw.ai/coolify
- [ ] Navigation in docs includes Coolify entry
- [ ] Redirects work: `/install/coolify` → `/coolify`
- [ ] All internal links in coolify.mdx work
- [ ] Code examples are accurate
- [ ] Screenshots (if added) are clear

## Security Checks

- [ ] `OPENCLAW_GATEWAY_TOKEN` not visible in logs
- [ ] `SETUP_PASSWORD` not exposed
- [ ] Container running as non-root user (UID 1000)
- [ ] HTTPS enforced (no HTTP access)
- [ ] Health endpoint doesn't leak sensitive info

## Final Sign-off

- [ ] Deployment method 1 (Git) verified ✓
- [ ] Deployment method 2 (Compose) verified ✓ (optional)
- [ ] All critical features working ✓
- [ ] Documentation complete ✓
- [ ] Ready for user rollout ✓

## Notes

Record any issues or observations:

```
Date: ___________
Tester: ___________

Issues found:
-

Observations:
-

Recommendations:
-
```

## Rollout Recommendations

After successful testing:

1. **Announce** Coolify support in:
   - GitHub Releases changelog
   - Documentation updates
   - Discord/community channels

2. **Monitor** initial deployments:
   - Watch for GitHub issues
   - Check Discord for questions
   - Review deployment metrics

3. **Document** common issues:
   - Update troubleshooting section
   - Add FAQ entries
   - Create video tutorial (optional)

4. **Iterate** based on feedback:
   - Improve error messages
   - Enhance documentation
   - Add automation if needed
