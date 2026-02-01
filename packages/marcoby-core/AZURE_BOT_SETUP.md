# Azure Bot Setup for Microsoft Teams

To connect "Marcoby Ops" to Microsoft Teams, you need to register a generic "Azure Bot" resource. This acts as the gateway between Microsoft's servers and your self-hosted OpenClaw.

## Prerequisites

- Access to the [Azure Portal](https://portal.azure.com).
- Permission to create resources (Subscription Owner or Contributor).
- Your Coolify application URL (e.g., `https://marcoby-ops.coolify.yourdomain.com`).

## Phase 1: Create the Azure Bot Resource

1.  **Log in** to [portal.azure.com](https://portal.azure.com).
2.  In the top search bar, type **"Azure Bot"** and select it (under Marketplace or Services).
3.  Click **Create**.
4.  **Bot Handle**: Choose a unique ID (e.g., `marcoby-ops-bot`). This is internal.
5.  **Subscription**: Select your active subscription.
6.  **Resource Group**: Create a new one (e.g., `marcoby-rg`) or select an existing one.
7.  **Data Residency**: Global is usually fine.
8.  **Pricing Tier**: Select **Free (F0)** (Standard is overkill for internal tools).
9.  **Type of App**: Select **Single Tenant**.
    - *Note*: If "Multi Tenant" is unavailable (common in some orgs), **Single Tenant** is the correct choice for an internal bot. It ensures only users in your directory can access it, which is better for SharePoint security anyway.
    - *Avoid* "User-Assigned Managed Identity" for now unless you know how to configure it, as it adds complexity.
10. Click **Review + Create**, then **Create**.

## Phase 2: Get Credentials

Once the deployment finishes, click **Go to resource**.

1.  **Get Configuration**:
    - On the left menu, looking for **Configuration**.
    - Copy the **Microsoft App ID** (Client ID). -> Save as `MSTEAMS_APP_ID`.

2.  **Generate Secret**:
    - Click on **Manage Password** (or "Manage" besides the App ID).
    - This opens "Certificates & secrets".
    - Click **+ New client secret**.
    - Name: `OpenClaw Key`.
    - Expires: 24 months (or custom).
    - Click **Add**.
    - **IMMEDIATELY COPY the "Value"** (not the ID). -> Save as `MSTEAMS_APP_PASSWORD`.

3.  **Get Tenant ID**:
    - Search specifically for **"Microsoft Entra ID"** (formerly Azure AD) in the top portal search bar.
    - Copy the **Tenant ID** from the Overview page. -> Save as `MSTEAMS_TENANT_ID`.

## Phase 3: Connect to Teams

Back in your **Azure Bot** resource:

1.  **Channels**:
    - Click **Channels** in the left menu.
    - Click the **Microsoft Teams** icon.
    - Check the acknowledgment box.
    - Click **Agree** / **Apply**.
    - Ensure it says "Healthy" or shows in the list.

## Phase 4: Configure the Endpoint (CRITICAL)

This tells Microsoft where to send the messages.

1.  **Configuration**:
    - Click **Configuration** in the left menu.
    - Locate **Messaging endpoint**.
    - Enter your Coolify URL appended with `/api/messages`.
    - Format: `https://<your-app-domain>/api/messages`
    - Example: `https://marcoby.coolify.app/api/messages`
    - Click **Apply**.

## Phase 5: Final Coolify Config

Update your Coolify Environment Variables:

```bash
MSTEAMS_APP_ID=<your-app-id>
MSTEAMS_APP_PASSWORD=<your-secret-value>
MSTEAMS_TENANT_ID=<your-tenant-id>
```

**Redeploy** your application in Coolify.

## Testing

1.  In the Azure Bot resource, go to **Channels** -> **Microsoft Teams**.
2.  Click the blue link that says **"Open in Teams"** (or looks like a link).
3.  It will pop open your Teams app and start a chat with your bot.
4.  Type: `help` or `status`.
5.  If "Marcoby Ops" replies, you are live! 🦞
