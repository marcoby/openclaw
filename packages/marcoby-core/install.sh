#!/usr/bin/env bash
set -e

# Marcoby Core - Workspace Hydration Script
# Installs the Marcoby Ops "Brain" (Identity, Knowledge, SOPs) into an OpenClaw workspace.

# Default workspace location
TARGET_DIR="${OPENCLAW_WORKSPACE_DIR:-$HOME/.openclaw/workspace}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/workspace-template"

echo "🦞 Marcoby Ops Installer"
echo "======================="
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Error: Source directory not found at $SOURCE_DIR"
  exit 1
fi

# Ensure target exists
mkdir -p "$TARGET_DIR"

echo "📦 Installing Marcoby Hub..."

# Copy files (using rsync if available for better feedback, else cp)
if command -v rsync >/dev/null 2>&1; then
  rsync -av --no-perms "$SOURCE_DIR/" "$TARGET_DIR/"
else
  cp -R "$SOURCE_DIR/"* "$TARGET_DIR/"
  echo "files copied."
fi

echo ""
echo "✅ Installation complete."
echo "   - Identity: $TARGET_DIR/IDENTITY.md"
echo "   - Brain:    $TARGET_DIR/marcoby/"
echo ""
echo "🚀 Restart OpenClaw to wake up Marcoby Ops."
