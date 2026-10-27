import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { huntFor } from "@/lib/hunt/run";
import type { Brief } from "@/lib/hunt/types";
import { getSeeker, isOnboarded, updateSeeker } from "@/lib/seekers";
import { recordBriefing } from "@/lib/store";

export const maxDuration = 60;

function cleanList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    const s = String(x).trim().slice(0, 60);
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out.slice(0, max);
}

/**
 * PUT /api/me/brief
 * Saves the brief, then rescans the last few weeks of postings against it so
 * the shortlist reflects the new brief straight away.
 */
export async function PUT(req: Request) {
  return withSeeker(async (s) => {
    const body = await readJson<Partial<Brief>>(req);
    const brief: Brief = {
      name: String(body.name ?? "").trim().slice(0, 40),
      targetTitles: cleanList(body.targetTitles, 6),
      skills: cleanList(body.skills, 20),
      locations: cleanList(body.locations, 8),
      remoteOk: Boolean(body.remoteOk),
      avoid: cleanList(body.avoid, 20),
    };
    if (brief.targetTitles.length === 0) throw new ApiError(422, "Add at least one role you want, for example Senior Product Manager.");

    let seeker = await updateSeeker(s.id, { brief });
    let hunt: { read: number; found: number; boardErrors: number } | null = null;
    if (isOnboarded(seeker)) {
      const now = new Date();
      const b = await huntFor(seeker, true, now);
      await recordBriefing(seeker, b, now, true);
      seeker = (await getSeeker(s.id))!;
      hunt = { read: b.postingsRead, found: b.newMatches.length, boardErrors: b.errors.length };
    }
    return stateResponse(seeker, { hunt });
  });
}
