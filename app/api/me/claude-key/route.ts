import { checkKey, PROVIDER_NAME, providerOfKey } from "@/lib/ai";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { canStoreSecrets, encrypt } from "@/lib/crypto";
import { updateSeeker } from "@/lib/seekers";

/**
 * PUT /api/me/claude-key { apiKey }: a Claude (sk-ant-…) or OpenAI (sk-…) key.
 * Checked with the provider, which also tells us the model to use, then saved encrypted.
 * The key is never sent back; the workspace only ever sees its last 4 characters.
 */
export async function PUT(req: Request) {
  return withSeeker(async (s) => {
    if (!canStoreSecrets()) throw new ApiError(503, "Saving keys is switched off on the server right now. Try again later.");
    const apiKey = String((await readJson<{ apiKey?: string }>(req)).apiKey ?? "").trim();
    const provider = providerOfKey(apiKey);
    if (!provider) {
      throw new ApiError(422, "That doesn't look like an API key. Claude keys start with sk-ant-, OpenAI keys with sk-.");
    }
    const who = PROVIDER_NAME[provider];
    const check = await checkKey(provider, apiKey);
    if (check.status !== "ok") {
      if (check.status === "refused") throw new ApiError(422, `${who} didn't accept that key. Check you copied all of it, and that it hasn't been revoked.`);
      if (check.status === "no-model") throw new ApiError(422, `That ${who} key works, but it can't use any of the GPT models fuzzyHR writes with.`);
      throw new ApiError(503, `I couldn't reach ${who} to check the key. Try again in a minute.`);
    }

    const saved = await updateSeeker(s.id, {
      claudeKey: { enc: encrypt(apiKey), last4: apiKey.slice(-4), provider, model: check.model },
    });
    return stateResponse(saved);
  });
}

/** DELETE /api/me/claude-key: forget the key. */
export async function DELETE() {
  return withSeeker(async (s) => stateResponse(await updateSeeker(s.id, { claudeKey: null })));
}
