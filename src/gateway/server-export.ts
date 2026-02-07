import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { ResolvedGatewayAuth } from "./auth.js";
import { resolveAuthStorePath } from "../agents/auth-profiles/paths.js";
import { resolveStateDir, resolveOAuthPath } from "../config/paths.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { VERSION } from "../version.js";
import { authorizeGatewayConnect } from "./auth.js";

const log = createSubsystemLogger("export");

interface ExportData {
  version: string;
  exportedAt: string;
  files: Record<string, string | object>;
}

function readFileIfExists(filepath: string): string | null {
  try {
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, "utf-8");
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

function parseJsonSafe(content: string): object | string {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function extractAuthFromRequest(req: IncomingMessage): { token?: string; password?: string } {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return { token: authHeader.slice(7) };
  }

  // Check query params as fallback
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");
  const password = url.searchParams.get("password");

  return { token: token ?? undefined, password: password ?? undefined };
}

export async function handleExportHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    auth: ResolvedGatewayAuth;
    trustedProxies?: string[];
  },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname !== "/setup/export") {
    return false;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return true;
  }

  // Require authentication
  const connectAuth = extractAuthFromRequest(req);
  const authResult = await authorizeGatewayConnect({
    auth: opts.auth,
    connectAuth,
    req,
    trustedProxies: opts.trustedProxies,
  });

  if (!authResult.ok) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Unauthorized", reason: authResult.reason }));
    return true;
  }

  try {
    const stateDir = resolveStateDir();
    const files: Record<string, string | object> = {};

    // Main config file
    const configPath = path.join(stateDir, "openclaw.json");
    const configContent = readFileIfExists(configPath);
    if (configContent) {
      files["openclaw.json"] = parseJsonSafe(configContent);
    }

    // Auth profiles
    const authProfilesPath = resolveAuthStorePath();
    const authProfilesContent = readFileIfExists(authProfilesPath);
    if (authProfilesContent) {
      files["auth-profiles.json"] = parseJsonSafe(authProfilesContent);
    }

    // OAuth credentials
    const oauthPath = resolveOAuthPath();
    const oauthContent = readFileIfExists(oauthPath);
    if (oauthContent) {
      files["credentials/oauth.json"] = parseJsonSafe(oauthContent);
    }

    // Session stores for each agent
    const agentsDir = path.join(stateDir, "agents");
    if (fs.existsSync(agentsDir)) {
      try {
        const agents = fs.readdirSync(agentsDir, { withFileTypes: true });
        for (const agent of agents) {
          if (!agent.isDirectory()) continue;

          const sessionsDir = path.join(agentsDir, agent.name, "sessions");
          const sessionsPath = path.join(sessionsDir, "sessions.json");
          const sessionsContent = readFileIfExists(sessionsPath);
          if (sessionsContent) {
            files[`agents/${agent.name}/sessions/sessions.json`] = parseJsonSafe(sessionsContent);
          }

          // Include transcript count (not full transcripts to keep export manageable)
          if (fs.existsSync(sessionsDir)) {
            try {
              const transcripts = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
              files[`agents/${agent.name}/sessions/_meta`] = {
                transcriptCount: transcripts.length,
                transcriptFiles: transcripts,
              };
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore errors reading agents dir
      }
    }

    const exportData: ExportData = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      files,
    };

    log.info("Export completed", { fileCount: Object.keys(files).length });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="openclaw-backup-${Date.now()}.json"`,
    });
    res.end(JSON.stringify(exportData, null, 2));
    return true;
  } catch (err) {
    log.error("Export failed", { error: err });
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Export failed" }));
    return true;
  }
}
