#!/bin/bash
set -e
cd /home/hacker/VibeCoding/work/Agentik-Team

echo "[sync] Fetching upstream..."
git fetch upstream

echo "[sync] Merging upstream/master into local master..."
git merge upstream/master --no-edit

echo "[sync] Pushing to origin..."
git push origin master

echo "[sync] Done at $(date)"
