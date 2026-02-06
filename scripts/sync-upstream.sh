#!/usr/bin/env bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==> Fetching updates from all remotes...${NC}"
git fetch --all

echo -e "${YELLOW}==> Syncing with Main Upstream (OpenClaw)...${NC}"
# We typically want to rebase on top of upstream main to keep our history linear,
# or merge if we prefer merge bubbles. Let's default to merge for safety in preserving local changes.
if git merge upstream/main; then
    echo -e "${GREEN}✅ Successfully synced with OpenClaw upstream.${NC}"
else
    echo -e "${RED}❌ Merge conflict with OpenClaw upstream. Please resolve conflicts manually.${NC}"
    exit 1
fi

echo -e "${YELLOW}==> Checking for Coolify Source updates (essamamdani/openclaw-coolify)...${NC}"
# We don't auto-merge this one because it conflicts heavily with our consolidated Dockerfile.
# Instead, we show what's new and let the user decide.
echo -e "Comparing local state with upstream-coolify-source/main..."

# Check for changes in key files
DIFF_OUTPUT=$(git diff --name-only HEAD upstream-coolify-source/main -- Dockerfile scripts/bootstrap.sh)

if [ -n "$DIFF_OUTPUT" ]; then
    echo -e "${YELLOW}⚠️  Updates detected in Coolify source for:${NC}"
    echo "$DIFF_OUTPUT"
    echo -e "${YELLOW}Review them with: git diff HEAD upstream-coolify-source/main -- <file>${NC}"
    echo -e "${YELLOW}If useful, cherry-pick or manually apply the changes.${NC}"
else
    echo -e "${GREEN}✅ No critical infrastructure changes in Coolify source.${NC}"
fi

echo -e "${GREEN}==> Sync Complete!${NC}"
echo -e "Don't forget to push your updates: git push origin main && git push coolify-remote main"
