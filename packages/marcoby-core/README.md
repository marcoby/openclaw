# Marcoby Core Package

This package contains the configuration, knowledge base, and identity for the "Marcoby Ops" assistant.

## Contents

- **`workspace-template/`**: The complete file structure for the assistant's brain.
  - `IDENTITY.md`: Defines the "Marcoby Ops" persona.
  - `SOUL.md`: Defines the assistant's directives and values.
  - `marcoby/`: The central hub containing SOPs, OKRs, and Knowledge.

## Usage

### Local Installation (Hydration)

To install this configuration into your current user's OpenClaw workspace:

```bash
./install.sh
```

### Managed Deployment

For a managed service deployment, this folder should be copied into the container's workspace path (`/home/node/.openclaw/workspace`) during the build or startup process.

Example `docker-setup.sh` integration:

```bash
# Copy Marcoby Core into the workspace
cp -r packages/marcoby-core/workspace-template/* /home/node/.openclaw/workspace/
```

## Configuring Channels

To make "Marcoby Ops" accessible to your team, configure a messaging channel.

### Microsoft Teams (Recommended)

Follow the detailed [Azure Bot Setup Guide](./AZURE_BOT_SETUP.md) to creating your Azure Bot and connecting it to Teams.

Summary of required variables:
- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`

Once configured, mention `@Marcoby Ops` in Teams to start chatting.
