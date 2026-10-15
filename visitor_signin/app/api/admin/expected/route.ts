import { NextResponse } from "next/server";
import { todayAtLocation } from "@/lib/dates";
import { read } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pre-registered visitors due today who haven't arrived yet.
// TODO before any real deployment: require an authenticated admin (NFR-SEC-03).
export async function GET() {
  const today = todayAtLocation();
  const expected = read((d) =>
    d.visits
      .filter((v) => v.status === "expected" && v.expectedDate === today)
      .map((v) => {
        const visitor = d.visitors.find((p) => p.id === v.visitorId);
        return {
          id: v.id,
          name: visitor?.name ?? "",
          company: visitor?.company ?? "",
          phone: visitor?.phone ?? "",
          host: d.hosts.find((h) => h.id === v.hostId)?.name ?? "",
          visitorType: v.visitorType,
        };
      }),
  );
  return NextResponse.json({ expected });
}
