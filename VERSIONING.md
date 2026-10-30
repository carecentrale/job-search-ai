# Versions, releases and rolling back

## Versions
fuzzyHR uses version numbers like `0.7.0` (major.minor.patch):
- **patch** (0.7.1): a fix, nothing new for users
- **minor** (0.8.0): new features
- **major** (1.0.0): the public launch, or a change that breaks how people use it

The current version is in `package.json` and at the top of `lib/changelog.ts`. Every release is a git tag (`v0.7.0`) on GitHub, created automatically by the *Tag releases* GitHub Action, which also publishes the notes as a GitHub Release. `release-commits.json` records which commit each version is, so rolling back works even before a tag exists. The site shows the version in the footer and on the Plan page, and the plain-language notes at **/whats-new** (English and French).

## Releasing
1. Add the new version's notes at the top of `lib/changelog.ts`, in English and French, written for users (what they can do now), not for developers.
2. Run `scripts/release.sh 0.8.0`. It sets the version, builds, commits and pushes, and records the commit in `release-commits.json`. Vercel deploys it, and GitHub tags it.

## Rolling back
Pick the quickest that fits:

1. **One step back, in about a minute.** Admin → **Versions** → *Roll back to this*. It uses Vercel's Instant Rollback to put the previous deployment live. Needs a Vercel token pasted on that page once. On Vercel's free plan, only the deployment just before the live one can be restored this way.
   - While rolled back, new pushes **don't go live** by themselves. When the fix is in, press **Go live with latest** on the same page.
   - The same thing in Vercel: project → Deployments → the previous deployment's menu → *Instant Rollback*; undo with *Promote*.
2. **Any older version.** `scripts/rollback-to.sh v0.5.0` (or ask Claude: "roll fuzzyHR back to v0.5.0"). It restores that version's code as a new commit and pushes; nothing in the history is lost.
3. **Undo a single bad change.** `git revert <commit>` and push.

## Why rolling back is safe for data
The database only ever gains tables and columns (`create … if not exists`, `add column if not exists`); nothing is renamed or dropped. Older code ignores columns it doesn't know, so users' data survives a rollback and is all there again when you move forward. Keep it that way: never rename or drop a column in the same release that stops using it.
