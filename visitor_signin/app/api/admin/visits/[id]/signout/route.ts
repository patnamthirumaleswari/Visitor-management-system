import { NextResponse } from "next/server";
import { write } from "@/lib/db";

// Manual sign-out from the portal (FR-ADM-02).
// TODO before any real deployment: require an authenticated admin and write to the audit log (FR-ROLE-02).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = write((d) => {
    const visit = d.visits.find((v) => v.id === id);
    if (!visit) return false;
    if (visit.status === "signed_in") {
      visit.status = "signed_out";
      visit.signedOutAt = new Date().toISOString();
    }
    return true;
  });
  return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Visit not found" }, { status: 404 });
}
