import { checkKey } from "@/lib/ai";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { canStoreSecrets, encrypt } from "@/lib/crypto";
import { updateSeeker } from "@/lib/seekers";

/**
 * PUT /api/me/claude-key { apiKey }: check the key with Anthropic, then save it encrypted.
 * The key is never sent back; the workspace only ever sees its last 4 characters.
 */
export async function PUT(req: Request) {
  return withSeeker(async (s) => {
    if (!canStoreSecrets()) throw new ApiError(503, "Saving keys is switched off on the server right now. Try again later.");
    const apiKey = String((await readJson<{ apiKey?: string }>(req)).apiKey ?? "").trim();
    if (!/^sk-ant-[A-Za-z0-9_-]{20,200}$/.test(apiKey)) {
      throw new ApiError(422, "That doesn't look like a Claude API key. Keys start with sk-ant- and come from console.anthropic.com.");
    }
    const check = await checkKey(apiKey);
    if (check === "refused") throw new ApiError(422, "Anthropic didn't accept that key. Check you copied all of it, and that it hasn't been revoked.");
    if (check === "unreachable") throw new ApiError(503, "I couldn't reach Anthropic to check the key. Try again in a minute.");

    const saved = await updateSeeker(s.id, { claudeKey: { enc: encrypt(apiKey), last4: apiKey.slice(-4) } });
    return stateResponse(saved);
  });
}

/** DELETE /api/me/claude-key: forget the key. */
export async function DELETE() {
  return withSeeker(async (s) => stateResponse(await updateSeeker(s.id, { claudeKey: null })));
}
