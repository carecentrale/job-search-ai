#!/usr/bin/env bash
# Cut a release: scripts/release.sh 0.8.0
# Before running: add the new version's notes (English and French) at the top of lib/changelog.ts.
# This sets package.json's version, commits, tags vX.Y.Z and pushes (Vercel then deploys it).
set -euo pipefail
v="${1:?usage: scripts/release.sh X.Y.Z}"
[[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must look like 1.2.3"; exit 1; }
grep -q "version: \"$v\"" lib/changelog.ts || { echo "Add v$v's notes to the top of lib/changelog.ts first."; exit 1; }
git diff --quiet || git diff --cached --quiet || true
npm pkg set version="$v"
npx tsc --noEmit -p . && npm run build >/dev/null
git add -A
git commit -m "Release v$v" || true
git tag -a "v$v" -m "fuzzyHR v$v"
git push origin main --follow-tags
echo "Released v$v"
