import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";
import type { ApiKeyCredential, TokenCredential } from "../agents/auth-profiles/types.js";
import type { OpenClawConfig } from "../config/config.js";
import { AUTH_STORE_VERSION } from "../agents/auth-profiles/constants.js";
import { saveAuthProfileStore, ensureAuthProfileStore } from "../agents/auth-profiles/store.js";
import { writeConfigFile } from "../config/io.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("setup");

// SETUP_PASSWORD from environment - protects access to /setup itself
const SETUP_PASSWORD = process.env.SETUP_PASSWORD;

// Session cookie name for setup auth
const SETUP_AUTH_COOKIE = "openclaw_setup_auth";

// Generate a random token (same pattern as onboard-helpers.ts)
function randomToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

// Simple hash for session cookie (not for password storage)
function hashForSession(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

// Parse cookies from header
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) {
      cookies[key] = rest.join("=");
    }
  }
  return cookies;
}

// Check if setup auth cookie is valid
function isSetupAuthenticated(req: IncomingMessage): boolean {
  if (!SETUP_PASSWORD) {
    return true; // No password required
  }
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionHash = cookies[SETUP_AUTH_COOKIE];
  if (!sessionHash) {
    return false;
  }
  return sessionHash === hashForSession(SETUP_PASSWORD);
}

// HTML for SETUP_PASSWORD authentication gate
const SETUP_AUTH_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Setup - Authentication</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
  </style>
</head>
<body class="h-screen flex items-center justify-center">
  <div class="w-full max-w-md space-y-8 p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
    <div class="text-center">
      <h1 class="text-3xl font-bold tracking-tight text-white">OpenClaw Setup</h1>
      <p class="mt-2 text-sm text-gray-400">Enter the setup password to continue</p>
    </div>

    <form id="auth-form" class="mt-8 space-y-6" onsubmit="handleAuth(event)">
      <div>
        <label for="setup-password" class="block text-sm font-medium text-gray-300">Setup Password</label>
        <input type="password" id="setup-password" name="setup-password" required
          class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          placeholder="Enter SETUP_PASSWORD">
        <p class="mt-1 text-xs text-gray-500">This is the password set in your environment variables.</p>
      </div>

      <button type="submit" class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
        Continue to Setup
      </button>
    </form>

    <div id="error-msg" class="hidden text-center text-sm font-medium text-red-400"></div>
  </div>

  <script>
    async function handleAuth(e) {
      e.preventDefault();
      const pwd = document.getElementById('setup-password').value;
      const btn = e.target.querySelector('button');
      const msg = document.getElementById('error-msg');

      if (!pwd) return;

      btn.disabled = true;
      btn.textContent = "Verifying...";
      msg.classList.add('hidden');

      try {
        const res = await fetch('/setup/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Invalid password');
        }

        window.location.reload();

      } catch (err) {
        msg.textContent = err.message;
        msg.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = "Continue to Setup";
      }
    }
  </script>
</body>
</html>
`;

const SETUP_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Setup</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
    .input-field { @apply mt-1 block w-full rounded-md border-gray-600 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2; }
    .btn-primary { @apply flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center py-8">
  <div class="w-full max-w-lg space-y-6 p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
    <div class="text-center">
      <h1 class="text-3xl font-bold tracking-tight text-white">OpenClaw Gateway</h1>
      <p class="mt-2 text-sm text-gray-400">First-time configuration</p>
    </div>

    <form id="setup-form" class="space-y-6" onsubmit="handleSetup(event)">
      <!-- Step 1: Admin Password -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-white border-b border-gray-700 pb-2">1. Gateway Access</h3>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-300">Admin Password <span class="text-red-400">*</span></label>
          <input type="password" id="password" name="password" required
            class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
            placeholder="Set a strong password">
          <p class="mt-1 text-xs text-gray-500">Used to access the OpenClaw dashboard.</p>
        </div>

        <div>
          <label for="token" class="block text-sm font-medium text-gray-300">Gateway Token</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input type="text" id="token" name="token" readonly
              class="block w-full rounded-l-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 font-mono text-xs"
              placeholder="Auto-generated">
            <button type="button" onclick="copyToken()"
              class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-700 bg-gray-700 text-gray-300 sm:text-sm hover:bg-gray-600">
              Copy
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">For API access. Auto-generated on save.</p>
        </div>
      </div>

      <!-- Step 2: Model Provider -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-white border-b border-gray-700 pb-2">2. AI Provider</h3>
        <div>
          <label for="provider" class="block text-sm font-medium text-gray-300">Provider <span class="text-red-400">*</span></label>
          <select id="provider" name="provider" required onchange="updateProviderFields()"
            class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
            <option value="">Select a provider...</option>
            <option value="anthropic">Anthropic (Claude API)</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="claude-cli">Claude CLI Token</option>
          </select>
        </div>

        <div id="api-key-field">
          <label for="apiKey" class="block text-sm font-medium text-gray-300">
            <span id="api-key-label">API Key</span> <span class="text-red-400">*</span>
          </label>
          <input type="password" id="apiKey" name="apiKey" required
            class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 font-mono"
            placeholder="sk-...">
          <p id="api-key-hint" class="mt-1 text-xs text-gray-500">Your provider API key.</p>
        </div>

        <div>
          <label for="model" class="block text-sm font-medium text-gray-300">Default Model</label>
          <input type="text" id="model" name="model"
            class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
            placeholder="e.g., anthropic/claude-sonnet-4-20250514">
          <p class="mt-1 text-xs text-gray-500">Optional. Format: provider/model-name</p>
        </div>
      </div>

      <!-- Step 3: Channels (Optional) -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-white border-b border-gray-700 pb-2">3. Channels (Optional)</h3>
        <p class="text-xs text-gray-500">Enable channels now, configure credentials via CLI later.</p>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center space-x-2 p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-800">
            <input type="checkbox" name="channels" value="telegram" class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500">
            <span class="text-sm text-gray-300">Telegram</span>
          </label>
          <label class="flex items-center space-x-2 p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-800">
            <input type="checkbox" name="channels" value="discord" class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500">
            <span class="text-sm text-gray-300">Discord</span>
          </label>
          <label class="flex items-center space-x-2 p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-800">
            <input type="checkbox" name="channels" value="slack" class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500">
            <span class="text-sm text-gray-300">Slack</span>
          </label>
          <label class="flex items-center space-x-2 p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-800">
            <input type="checkbox" name="channels" value="msteams" class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500">
            <span class="text-sm text-gray-300">MS Teams</span>
          </label>
        </div>
      </div>

      <button type="submit" class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
        Save & Start Gateway
      </button>
    </form>

    <div id="status-msg" class="hidden text-center text-sm font-medium"></div>
  </div>

  <script>
    // Generate token on page load
    window.addEventListener('load', () => {
      const tokenField = document.getElementById('token');
      // Generate a random hex token (48 chars = 24 bytes)
      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      tokenField.value = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    });

    function copyToken() {
      const tokenField = document.getElementById('token');
      navigator.clipboard.writeText(tokenField.value);
    }

    function updateProviderFields() {
      const provider = document.getElementById('provider').value;
      const label = document.getElementById('api-key-label');
      const hint = document.getElementById('api-key-hint');
      const input = document.getElementById('apiKey');

      switch (provider) {
        case 'anthropic':
          label.textContent = 'API Key';
          hint.textContent = 'Get from console.anthropic.com';
          input.placeholder = 'sk-ant-...';
          break;
        case 'openai':
          label.textContent = 'API Key';
          hint.textContent = 'Get from platform.openai.com';
          input.placeholder = 'sk-...';
          break;
        case 'openrouter':
          label.textContent = 'API Key';
          hint.textContent = 'Get from openrouter.ai';
          input.placeholder = 'sk-or-...';
          break;
        case 'claude-cli':
          label.textContent = 'CLI Token';
          hint.textContent = 'From Claude CLI authentication';
          input.placeholder = 'Token from claude-cli...';
          break;
        default:
          label.textContent = 'API Key';
          hint.textContent = 'Your provider API key.';
          input.placeholder = 'sk-...';
      }
    }

    async function handleSetup(e) {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      const msg = document.getElementById('status-msg');

      const password = document.getElementById('password').value;
      const token = document.getElementById('token').value;
      const provider = document.getElementById('provider').value;
      const apiKey = document.getElementById('apiKey').value;
      const model = document.getElementById('model').value;
      const channels = Array.from(form.querySelectorAll('input[name="channels"]:checked')).map(c => c.value);

      if (!password || !provider || !apiKey) {
        msg.textContent = "Please fill in all required fields.";
        msg.className = "text-center text-sm font-medium text-red-400 block mt-4";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Saving...";

      try {
        const res = await fetch('/setup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password,
            token,
            provider,
            apiKey,
            model: model || undefined,
            channels
          })
        });

        if (!res.ok) throw new Error((await res.json()).error || 'Failed');

        msg.innerHTML = "Configuration saved! The gateway is restarting...<br><br><span class='text-xs text-gray-400'>Gateway Token: <code class='bg-gray-800 px-1 rounded'>" + token + "</code></span>";
        msg.className = "text-center text-sm font-medium text-green-400 block mt-4";
        btn.textContent = "Saved";

        setTimeout(() => {
          window.location.href = "/";
        }, 5000);

      } catch (err) {
        msg.textContent = "Error: " + err.message;
        msg.className = "text-center text-sm font-medium text-red-400 block mt-4";
        btn.disabled = false;
        btn.textContent = "Save & Start Gateway";
      }
    }
  </script>
</body>
</html>
`;

export async function handleSetupHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    config: OpenClawConfig;
    requestGatewayRestart?: () => void;
  },
): Promise<boolean> {
  // 1. Determine if setup is actually needed.
  // We consider setup needed if there is no password configured.
  const isConfigured = Boolean(opts.config.gateway?.auth?.password);

  const url = new URL(req.url ?? "/", `http://localhost`);

  // If already configured, we technically shouldn't be here, but just in case:
  if (isConfigured) {
    // If they explicitly try to go to /setup but it's done, redirect home
    if (url.pathname === "/setup" || url.pathname.startsWith("/setup/")) {
      res.writeHead(302, { Location: "/" });
      res.end();
      return true;
    }
    return false; // let normal handlers take it
  }

  // 2. Handle SETUP_PASSWORD authentication
  if (url.pathname === "/setup/auth") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return true;
    }

    const bodyBuffers: Buffer[] = [];
    for await (const chunk of req) {
      bodyBuffers.push(chunk);
    }
    const bodyStr = Buffer.concat(bodyBuffers).toString("utf-8");

    try {
      const data = JSON.parse(bodyStr);
      if (!SETUP_PASSWORD) {
        // No password required - this shouldn't happen but handle it
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return true;
      }

      if (!data.password || data.password !== SETUP_PASSWORD) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid setup password" }));
        return true;
      }

      // Set auth cookie
      const sessionHash = hashForSession(SETUP_PASSWORD);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `${SETUP_AUTH_COOKIE}=${sessionHash}; Path=/setup; HttpOnly; SameSite=Strict`,
      });
      res.end(JSON.stringify({ ok: true }));
      return true;
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Invalid request" }));
      return true;
    }
  }

  // 3. Serve Setup Routes
  if (url.pathname === "/setup") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return true;
    }

    // Check if SETUP_PASSWORD is required and user is authenticated
    if (SETUP_PASSWORD && !isSetupAuthenticated(req)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(SETUP_AUTH_HTML);
      return true;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(SETUP_HTML);
    return true;
  }

  if (url.pathname === "/setup/complete") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return true;
    }

    // Check if SETUP_PASSWORD is required and user is authenticated
    if (SETUP_PASSWORD && !isSetupAuthenticated(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Not authenticated" }));
      return true;
    }

    const bodyBuffers: Buffer[] = [];
    for await (const chunk of req) {
      bodyBuffers.push(chunk);
    }
    const bodyStr = Buffer.concat(bodyBuffers).toString("utf-8");

    try {
      const data = JSON.parse(bodyStr);
      if (!data.password || data.password.length < 1) {
        throw new Error("Password is required");
      }
      if (!data.provider || !data.apiKey) {
        throw new Error("Provider and API key are required");
      }

      // Update Config
      const newConfig = { ...opts.config };
      if (!newConfig.gateway) {
        newConfig.gateway = {};
      }
      if (!newConfig.gateway.auth) {
        newConfig.gateway.auth = {};
      }

      // Set gateway auth
      newConfig.gateway.auth.password = data.password;
      newConfig.gateway.auth.mode = "password";
      if (data.token) {
        newConfig.gateway.auth.token = data.token;
      }

      // Set default model if provided
      if (data.model) {
        if (!newConfig.agents) {
          newConfig.agents = {};
        }
        if (!newConfig.agents.defaults) {
          newConfig.agents.defaults = {};
        }
        newConfig.agents.defaults.model = data.model;
      }

      // Enable selected channels
      if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
        if (!newConfig.channels) {
          newConfig.channels = {};
        }
        for (const channel of data.channels) {
          if (typeof channel === "string") {
            (newConfig.channels as Record<string, { enabled?: boolean }>)[channel] = {
              enabled: true,
            };
          }
        }
      }

      // Set up auth profile reference in config
      const profileId = `${data.provider}:default`;
      if (!newConfig.auth) {
        newConfig.auth = {};
      }
      if (!newConfig.auth.profiles) {
        newConfig.auth.profiles = {};
      }
      newConfig.auth.profiles[profileId] = {
        provider: data.provider,
        mode: data.provider === "claude-cli" ? "token" : "api_key",
      };

      // Write config to disk
      await writeConfigFile(newConfig);

      // Save auth profile credentials
      const authStore = ensureAuthProfileStore();
      if (data.provider === "claude-cli") {
        const credential: TokenCredential = {
          type: "token",
          provider: data.provider,
          token: data.apiKey,
        };
        authStore.profiles[profileId] = credential;
      } else {
        const credential: ApiKeyCredential = {
          type: "api_key",
          provider: data.provider,
          key: data.apiKey,
        };
        authStore.profiles[profileId] = credential;
      }
      authStore.version = AUTH_STORE_VERSION;
      saveAuthProfileStore(authStore);

      log.info("Setup completed successfully. Configuration saved. Restarting gateway...");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));

      // Trigger restart if available, otherwise the user (or container entrypoint) handles it
      if (opts.requestGatewayRestart) {
        // Give the response a moment to flush
        setTimeout(() => opts.requestGatewayRestart?.(), 1000);
      } else {
        // Fallback: In Docker, typically we can exit(0) and let restart policy handle it,
        // but let's be safe and just exit.
        setTimeout(() => process.exit(0), 1000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: message }));
    }
    return true;
  }

  // 4. Intercept root requests if unconfigured
  // If they hit root "/" and we are NOT configured, redirect to /setup
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(302, { Location: "/setup" });
    res.end();
    return true;
  }

  return false;
}
