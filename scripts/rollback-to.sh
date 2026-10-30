#!/usr/bin/env bash
# Bring back an older version: scripts/rollback-to.sh v0.5.0
# Restores that tag's files as a NEW commit on main (history is kept, nothing is deleted),
# then pushes so Vercel deploys it. To move forward again later, release a newer version,
# or roll "back" to the newer tag the same way.
set -euo pipefail
tag="${1:?usage: scripts/rollback-to.sh vX.Y.Z}"
git fetch --tags origin
git rev-parse -q --verify "refs/tags/$tag" >/dev/null || { echo "No tag $tag. Tags: $(git tag | tr '\n' ' ')"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "Commit or stash local changes first."; exit 1; }
# Replace the working tree with the tag's tree, including deletions of files added since.
git rm -r -q --cached . && git clean -fdq -e node_modules -e .next -e .env.local
git checkout "$tag" -- .
git add -A
git commit -m "Roll back to $tag

Restores the code exactly as it was at $tag. Later history is kept; release a
newer version (or roll back to a newer tag) to move forward again."
git push origin main
echo "Rolled back to $tag; Vercel is deploying it."
