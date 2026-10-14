import { NextResponse } from "next/server";
import { read } from "@/lib/db";

export const dynamic = "force-dynamic";

// Live on-site list (FR-ADM-01) — also the evacuation list (FR-EVA-01).
// TODO before any real deployment: require an authenticated admin (NFR-SEC-03).
export async function GET() {
  const onsite = read((d) =>
    d.visits
      .filter((v) => v.status === "signed_in")
      .sort((a, b) => b.signedInAt.localeCompare(a.signedInAt))
      .map((v) => {
        const visitor = d.visitors.find((p) => p.id === v.visitorId);
        const host = d.hosts.find((h) => h.id === v.hostId);
        return {
          id: v.id,
          name: visitor?.name ?? "",
          company: visitor?.company ?? "",
          phone: visitor?.phone ?? "",
          photo: visitor?.photo ?? null,
          host: host?.name ?? "",
          visitorType: v.visitorType,
          source: v.source,
          signedInAt: v.signedInAt,
        };
      }),
  );
  return NextResponse.json({ onsite });
}
