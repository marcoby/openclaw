#!/bin/bash
set -e

# Default paths
OPENCLAW_HOME="/home/node/.openclaw"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$OPENCLAW_HOME/workspace}"
TEMPLATE_DIR="/app/packages/marcoby-core/workspace-template"

# 1. Permission Fixes (Run as Root)
if [ "$(id -u)" = '0' ]; then
    echo "🔧 Marcoby Core: Fixing permissions..."
    mkdir -p "$OPENCLAW_HOME" "$WORKSPACE_DIR" /data
    chown -R node:node "$OPENCLAW_HOME" /data
fi

# 2. Hydration Logic
hydrate_cmd='
    TEMPLATE_DIR="/app/packages/marcoby-core/workspace-template"
    WORKSPACE_DIR="'"$WORKSPACE_DIR"'"
    if [ -d "$TEMPLATE_DIR" ]; then
        # Create dir if it somehow doesnt exist yet
        mkdir -p "$WORKSPACE_DIR"
        
        if [ -z "$(ls -A "$WORKSPACE_DIR")" ]; then
             echo "🦞 Marcoby Core: Initializing fresh workspace..."
             cp -r "$TEMPLATE_DIR/." "$WORKSPACE_DIR/"
             echo "✅ Marcoby Core: Workspace hydrated."
        else
             echo "ℹ️  Marcoby Core: Workspace already exists."
        fi
    fi
'

# 3. Configuration Helpers
configure_cmd='
    if [ -n "$OPENCLAW_GATEWAY_TRUSTED_PROXIES" ]; then
        echo "🔧 Marcoby Core: Configuring trusted proxies from env..."
        # Convert comma-separated string to JSON array: "a,b" -> ["a","b"]
        PROXIES_JSON=$(echo "$OPENCLAW_GATEWAY_TRUSTED_PROXIES" | awk -F, "{printf \"[\"; for(i=1;i<=NF;i++){printf \"\\\"%s\\\"\", \$i; if(i<NF)printf \",\"}; printf \"]\"}")
        
        node dist/index.js config set gateway.trustedProxies "$PROXIES_JSON" > /dev/null
    fi
'

# 4. Execution
if [ "$(id -u)" = '0' ]; then
    # Run hydration as node user to ensure files are owned by node
    gosu node bash -c "$hydrate_cmd"
    gosu node bash -c "$configure_cmd"
    
    echo "🚀 Starting OpenClaw Gateway (dropping privileges)..."
    exec gosu node "$@"
else
    # We are already non-root (e.g. dev mode or forced user)
    bash -c "$hydrate_cmd"
    bash -c "$configure_cmd"
    
    echo "🚀 Starting OpenClaw Gateway..."
    exec "$@"
fi
