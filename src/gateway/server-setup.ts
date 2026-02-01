import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { writeConfigFile } from "../config/io.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("setup");

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
<body class="h-screen flex items-center justify-center">
  <div class="w-full max-w-md space-y-8 p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
    <div class="text-center">
      <h1 class="text-3xl font-bold tracking-tight text-white">OpenClaw Gateway</h1>
      <p class="mt-2 text-sm text-gray-400">First-time configuration</p>
    </div>
    
    <form id="setup-form" class="mt-8 space-y-6" onsubmit="handleSetup(event)">
      <div class="space-y-4">
        <div>
          <label for="password" class="block text-sm font-medium text-gray-300">Admin Password</label>
          <input type="password" id="password" name="password" required class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" placeholder="Set a strong password">
          <p class="mt-1 text-xs text-gray-500">You will use this to access the dashboard.</p>
        </div>

        <div class="border-t border-gray-700 pt-4">
          <h3 class="text-lg font-medium text-white">Channel Integration (Optional)</h3>
          <p class="text-xs text-gray-500 mb-4">You can configure these later via CLI.</p>
          
          <div class="space-y-3">
             <div>
              <label for="channel-select" class="block text-sm font-medium text-gray-300">Add Channel Plugin</label>
              <select id="channel-select" class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
                <option value="">None</option>
                <option value="slack">Slack</option>
                <option value="discord">Discord</option>
                <option value="msteams">Microsoft Teams</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
            
            <!-- Dynamic fields would go here, keep it simple for v1 -->
            <div id="channel-config" class="hidden space-y-3 bg-gray-800/50 p-3 rounded">
               <p class="text-xs text-yellow-400">Note: For this v1 setup wizard, only password setting is supported. Please use 'channels login' in the CLI for complex channel setup after saving.</p>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
        Save & Restart Gateway
      </button>
    </form>
    
    <div id="status-msg" class="hidden text-center text-sm font-medium"></div>
  </div>

  <script>
    async function handleSetup(e) {
      e.preventDefault();
      const pwd = document.getElementById('password').value;
      const btn = e.target.querySelector('button');
      const msg = document.getElementById('status-msg');
      
      if (!pwd) return;
      
      btn.disabled = true;
      btn.textContent = "Saving...";
      
      try {
        const res = await fetch('/setup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            password: pwd,
            // Future: Channel config mapping
          })
        });
        
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        
        msg.textContent = "Configuration saved! The gateway is restarting...";
        msg.className = "text-center text-sm font-medium text-green-400 block mt-4";
        btn.textContent = "Saved";
        
        setTimeout(() => {
          window.location.href = "/";
        }, 5000);
        
      } catch (err) {
        msg.textContent = "Error: " + err.message;
        msg.className = "text-center text-sm font-medium text-red-400 block mt-4";
        btn.disabled = false;
        btn.textContent = "Save & Restart Gateway";
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
    if (url.pathname === "/setup") {
      res.writeHead(302, { Location: "/" });
      res.end();
      return true;
    }
    return false; // let normal handlers take it
  }

  // 2. Serve Setup Routes
  if (url.pathname === "/setup") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
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

    const bodyBuffers = [];
    for await (const chunk of req) {
      bodyBuffers.push(chunk);
    }
    const bodyStr = Buffer.concat(bodyBuffers).toString("utf-8");

    try {
      const data = JSON.parse(bodyStr);
      if (!data.password || data.password.length < 1) {
        throw new Error("Password is required");
      }

      // Update Config
      const newConfig = { ...opts.config };
      if (!newConfig.gateway) {
        newConfig.gateway = {};
      }
      if (!newConfig.gateway.auth) {
        newConfig.gateway.auth = {};
      }

      newConfig.gateway.auth.password = data.password;

      // Write to disk
      await writeConfigFile(newConfig);
      log.info("Setup completed successfully. Password set. Restarting gateway...");

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
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 3. Intercept root requests if unconfigured
  // If they hit root "/" and we are NOT configured, redirect to /setup
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(302, { Location: "/setup" });
    res.end();
    return true;
  }

  return false;
}
