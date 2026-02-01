#!/bin/sh
set -e

# Default paths
WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-/home/node/.openclaw/workspace}"
TEMPLATE_DIR="/app/packages/marcoby-core/workspace-template"

# 1. Hydrate Workspace (The "Brain")
# If the workspace directory exists but is empty (or doesn't exist), define it.
if [ -d "$TEMPLATE_DIR" ]; then
    # Create dir if missing
    mkdir -p "$WORKSPACE_DIR"
    
    # Check if empty
    if [ -z "$(ls -A "$WORKSPACE_DIR")" ]; then
        echo "🦞 Marcoby Core: Initializing fresh workspace..."
        cp -r "$TEMPLATE_DIR/." "$WORKSPACE_DIR/"
        echo "✅ Marcoby Core: Workspace hydrated."
    else
        echo "ℹ️  Marcoby Core: Workspace already exists."
    fi
fi

# 2. Permissions Check (Simple)
# Warn if we can't write to the workspace
if [ -d "$WORKSPACE_DIR" ] && [ ! -w "$WORKSPACE_DIR" ]; then
    echo "⚠️  WARNING: Workspace directory $WORKSPACE_DIR is not writable by user $(whoami)."
fi

# 3. Launch
echo "🚀 Starting OpenClaw Gateway..."
# Pass all arguments to the command (node dist/index.js ...)
exec "$@"
