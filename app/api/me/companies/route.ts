import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { STARTER_BOARDS } from "@/lib/hunt/boards";
import { LinkError, resolveCompany } from "@/lib/hunt/links";
import { boardFromUrl, type BoardRef } from "@/lib/hunt/sources";
import { updateSeeker } from "@/lib/seekers";

export const maxDuration = 30;

const MAX_COMPANIES = 30;

/** POST /api/me/companies { url }: follow a company's job board, from its careers link. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { url } = await readJson<{ url?: string }>(req);
    if (!url?.trim()) throw new ApiError(400, "Paste the company's careers or jobs link.");
    if (s.extraBoards.length >= MAX_COMPANIES) throw new ApiError(409, `You're following ${MAX_COMPANIES} companies, the most I can watch for you. Remove one first.`);
    const same = (r: Pick<BoardRef, "source" | "board">) => (b: BoardRef) => b.source === r.source && b.board.toLowerCase() === r.board.toLowerCase();
    const already = (r: Pick<BoardRef, "source" | "board">) => {
      const starter = STARTER_BOARDS.find(same(r));
      if (starter) throw new ApiError(409, `${starter.company} is already on my standard list. I check it every morning.`);
      const mine = s.extraBoards.find(same(r));
      if (mine) throw new ApiError(409, `You're already following ${mine.company ?? mine.board}.`);
    };
    const direct = boardFromUrl(url);
    if (direct) already(direct);
    let found;
    try {
      found = await resolveCompany(url);
    } catch (e) {
      if (e instanceof LinkError) throw new ApiError(422, e.message);
      throw e;
    }
    already(found.ref);
    const saved = await updateSeeker(s.id, { extraBoards: [...s.extraBoards, found.ref] });
    await logActivity(s.id, "company_added", { company: found.ref.company, source: found.ref.source, board: found.ref.board, openRoles: found.jobs });
    return stateResponse(saved, { company: { name: found.ref.company, openRoles: found.jobs } });
  });
}

/** DELETE /api/me/companies { source, board }: stop following a company. */
export async function DELETE(req: Request) {
  return withSeeker(async (s) => {
    const { source, board } = await readJson<{ source?: string; board?: string }>(req);
    const gone = s.extraBoards.find((b) => b.source === source && b.board === board);
    if (!gone) throw new ApiError(404, "You weren't following that company.");
    const saved = await updateSeeker(s.id, { extraBoards: s.extraBoards.filter((b) => b !== gone) });
    await logActivity(s.id, "company_removed", { company: gone.company, source, board });
    return stateResponse(saved);
  });
}
