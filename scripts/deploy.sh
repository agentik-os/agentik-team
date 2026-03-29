#!/bin/bash
set -e
cd /home/hacker/VibeCoding/work/Agentik-Team
echo "[deploy] Pulling latest..."
git pull origin master
echo "[deploy] Installing deps..."
pnpm install
echo "[deploy] Building..."
pnpm build
echo "[deploy] Restarting service..."
sudo systemctl restart agentik-team
echo "[deploy] Done at $(date)"
