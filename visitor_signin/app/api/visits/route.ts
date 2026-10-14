import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AGREEMENT, VISITOR_TYPES } from "@/lib/config";
import { newId, normalizePhone, write, type Visit, type Visitor } from "@/lib/db";
import { notifyHost } from "@/lib/notify";
import { getSignInSession, SESSION_COOKIE } from "@/lib/session";
import { randomToken } from "@/lib/token";

export const dynamic = "force-dynamic";

type Body = {
  visitorType?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  purpose?: string;
  hostId?: string;
  photo?: string | null;
  signature?: string | null;
  agreed?: boolean;
};

const MAX_IMAGE_CHARS = 1_500_000; // ~1.1 MB once decoded; resized photos are ~50 KB

const isImageDataUrl = (v: unknown): v is string =>
  typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length <= MAX_IMAGE_CHARS;

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Creates the visit from the phone flow. The session is consumed, so one QR scan = one sign-in.
export async function POST(req: Request) {
  const session = await getSignInSession();
  if (!session) {
    return NextResponse.json({ error: "Your sign-in session expired. Please scan the QR code at reception again." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const type = VISITOR_TYPES.find((t) => t.id === body.visitorType);
  const name = clean(body.name);
  const phone = normalizePhone(clean(body.phone, 20));
  const email = clean(body.email);
  const company = clean(body.company);
  const purpose = clean(body.purpose, 300);

  if (!type) return bad("Choose a visitor type.");
  if (name.length < 2) return bad("Enter your full name.");
  if (phone.replace(/\D/g, "").length < 8) return bad("Enter a valid mobile number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Enter a valid email or leave it empty.");
  if (type.photoRequired && !isImageDataUrl(body.photo)) return bad("A photo is required.");
  if (type.agreementRequired && (!body.agreed || !isImageDataUrl(body.signature))) return bad("Please accept and sign the agreement.");

  const result = write((d) => {
    // Re-check inside the write so two rapid submits can't both use the same session.
    if (d.usedSessions.includes(session.n)) return { error: "already-used" as const };
    const host = d.hosts.find((h) => h.id === body.hostId);
    if (!host) return { error: "no-host" as const };

    let visitor = d.visitors.find((v) => v.phone === phone);
    if (visitor) {
      Object.assign(visitor, { name, email: email || visitor.email, company: company || visitor.company });
    } else {
      visitor = { id: newId(), name, phone, email, company } satisfies Visitor;
      d.visitors.push(visitor);
    }
    if (isImageDataUrl(body.photo)) visitor.photo = body.photo;

    const visit: Visit = {
      id: newId(),
      visitorId: visitor.id,
      hostId: host.id,
      locationId: session.d,
      visitorType: type.id,
      purpose,
      status: "signed_in",
      source: "qr",
      signedInAt: new Date().toISOString(),
      badgeToken: randomToken(),
      ...(type.agreementRequired && { agreementVersion: AGREEMENT.version, signature: body.signature as string }),
    };
    d.visits.push(visit);
    d.usedSessions.push(session.n);
    return { host, visitor, visit };
  });

  if ("error" in result) {
    return result.error === "no-host"
      ? bad("Choose who you are visiting.")
      : NextResponse.json({ error: "You're already signed in from this scan." }, { status: 409 });
  }

  (await cookies()).delete(SESSION_COOKIE);

  // Don't make the visitor wait on email/SMS delivery.
  notifyHost(result.host, result.visitor, result.visit).catch((e) => console.error("[notify] failed", e));

  return NextResponse.json({ id: result.visit.id, badgeToken: result.visit.badgeToken }, { status: 201 });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
