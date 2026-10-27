import { logActivity } from "@/lib/activity";
import { suggestBrief } from "@/lib/ai";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { chooseClaude, recordUse, reserveCall } from "@/lib/claude";
import type { Brief } from "@/lib/hunt/types";
import { updateSeeker } from "@/lib/seekers";

export const maxDuration = 60;

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MIN_CHARS = 300;
const MAX_CHARS = 60_000;

async function pdfText(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) throw new ApiError(413, "That PDF is over 5 MB. Export a smaller copy, or paste the text instead.");
  const { extractText, getDocumentProxy } = await import("unpdf");
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    throw new ApiError(422, "I couldn't read that PDF. Paste the text of your CV instead.");
  }
}

/**
 * POST /api/me/cv
 * Either multipart with a `file` (PDF or .txt), or JSON { text }.
 * Saves the CV text. If the seeker has no brief yet and Claude is switched on,
 * also returns a suggested brief for them to review.
 */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    let text: string;
    let format = "pasted text";
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload.");
      format = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf" ? "PDF" : "text file";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) text = await pdfText(file);
      else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) text = await file.text();
      else throw new ApiError(415, "Upload a PDF or a .txt file, or paste the text.");
    } else {
      text = String((await readJson<{ text?: string }>(req)).text ?? "");
    }

    text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < MIN_CHARS) {
      throw new ApiError(422, "There isn't enough text to work with. If your PDF is a scanned image, paste the text of your CV instead.");
    }
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    const saved = await updateSeeker(s.id, { cvText: text });

    // A pre-filled brief is a nice-to-have: if Claude isn't available or the daily cap is reached,
    // the user just fills the brief in themselves.
    let suggestedBrief: Brief | null = null;
    if (saved.brief.targetTitles.length === 0) {
      try {
        const claude = chooseClaude(saved);
        await reserveCall(saved, claude);
        const out = await suggestBrief(claude.llm, text);
        await recordUse(saved, claude, out.use);
        suggestedBrief = out.data;
      } catch (e) {
        if (!(e instanceof ApiError)) console.error("suggestBrief failed", (e as Error).message);
      }
    }
    await logActivity(s.id, "cv_uploaded", { format, chars: text.length, briefSuggested: Boolean(suggestedBrief) });
    return stateResponse(saved, { suggestedBrief });
  });
}
