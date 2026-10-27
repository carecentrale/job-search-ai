import { logActivity } from "@/lib/activity";
import { withSeeker } from "@/lib/api";
import { exportSeekerData } from "@/lib/seekers";

/** GET /api/me/export: a JSON file of everything fuzzyHR stores about you (your saved AI key itself is never included). */
export async function GET() {
  return withSeeker(async (s) => {
    const data = await exportSeekerData(s.id);
    await logActivity(s.id, "data_exported");
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="fuzzyhr-data-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  });
}
