"use client";

import { useEffect, useRef, useState } from "react";
import type { AGREEMENT, LOCATION, VisitorTypeConfig } from "@/lib/config";
import ExistingBadgeLink, { BADGE_STORAGE_KEY } from "./ExistingBadgeLink";

type Props = {
  location: typeof LOCATION;
  visitorTypes: VisitorTypeConfig[];
  agreement: typeof AGREEMENT;
};

type HostOption = { id: string; name: string; department: string };
type Step = "type" | "details" | "host" | "photo" | "agreement";

export default function SignInFlow({ location, visitorTypes, agreement }: Props) {
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<VisitorTypeConfig | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", company: "", purpose: "" });
  const [returning, setReturning] = useState(false);
  const [host, setHost] = useState<HostOption | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = ["type", "details", "host"];
  if (type?.photoRequired) steps.push("photo");
  if (type?.agreementRequired) steps.push("agreement");
  const stepIndex = steps.indexOf(step);
  const isLast = stepIndex === steps.length - 1;

  const next = () => (isLast ? submit() : setStep(steps[stepIndex + 1]));
  const back = () => setStep(steps[Math.max(0, stepIndex - 1)]);

  // Returning visitor (FR-KIO-08): once the phone number looks complete, pre-fill name/company.
  const lookupPhone = async (phone: string) => {
    if (phone.replace(/\D/g, "").length < 8) return;
    try {
      const res = await fetch(`/api/visitors/lookup?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return;
      const { visitor } = (await res.json()) as { visitor: { name: string; company: string } | null };
      if (visitor) {
        setReturning(true);
        setDetails((d) => ({ ...d, name: d.name || visitor.name, company: d.company || visitor.company }));
      }
    } catch {
      /* lookup is a convenience only */
    }
  };

  const submit = async () => {
    if (!type || !host) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorType: type.id, ...details, hostId: host.id, photo, signature, agreed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      const href = `/badge/${data.id}?t=${data.badgeToken}`;
      try {
        localStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify({ href, date: new Date().toDateString() }));
      } catch {
        /* the badge page still works without storage */
      }
      window.location.replace(href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSubmitting(false);
    }
  };

  const canContinue =
    step === "type" ? !!type :
    step === "details" ? details.name.trim().length > 1 && details.phone.replace(/\D/g, "").length >= 8 :
    step === "host" ? !!host :
    step === "photo" ? !!photo :
    agreed && !!signature;

  return (
    <main className="phone">
      <p className="muted small" style={{ marginBottom: 6 }}>{location.company} · {location.name}</p>
      <div className="steps" aria-hidden>
        {steps.map((s, i) => <span key={s} className={i <= stepIndex ? "done" : ""} />)}
      </div>

      <div className="card stack">
        {step === "type" && (
          <>
            <h1>Welcome! What brings you in?</h1>
            <ExistingBadgeLink />
            {visitorTypes.map((t) => (
              <button
                key={t.id}
                className="choice"
                style={type?.id === t.id ? { outline: `2px solid ${t.color}` } : undefined}
                onClick={() => { setType(t); setStep("details"); }}
              >
                <span className="dot" style={{ background: t.color }} />
                <span>{t.label}<small>{t.description}</small></span>
              </button>
            ))}
          </>
        )}

        {step === "details" && (
          <>
            <h1>Your details</h1>
            <Field label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={details.phone}
              onChange={(v) => setDetails({ ...details, phone: v })} onBlur={() => lookupPhone(details.phone)} />
            {returning && <p className="notice">Welcome back! We've filled in your details from last time.</p>}
            <Field label="Full name" autoComplete="name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} />
            <Field label="Email (optional)" type="email" autoComplete="email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} />
            <Field label="Company (optional)" autoComplete="organization" value={details.company} onChange={(v) => setDetails({ ...details, company: v })} />
            <Field label="Purpose of visit (optional)" value={details.purpose} onChange={(v) => setDetails({ ...details, purpose: v })} />
          </>
        )}

        {step === "host" && <HostPicker selected={host} onSelect={setHost} />}

        {step === "photo" && <PhotoStep photo={photo} onPhoto={setPhoto} />}

        {step === "agreement" && (
          <>
            <h1>{agreement.title}</h1>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {agreement.text.map((line) => <li key={line} style={{ marginBottom: 8 }}>{line}</li>)}
            </ul>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 400 }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 22, height: 22, flex: "none" }} />
              I have read and agree to the above.
            </label>
            <div>
              <label>Sign with your finger</label>
              <SignaturePad onChange={setSignature} />
            </div>
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {step !== "type" && (
          <div className="row">
            <button className="secondary" onClick={back} disabled={submitting}>Back</button>
            <button onClick={next} disabled={!canContinue || submitting}>
              {submitting ? "Signing in…" : isLast ? "Sign in" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = props.label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label htmlFor={id}>{props.label}</label>
      <input id={id} type={props.type ?? "text"} autoComplete={props.autoComplete} inputMode={props.inputMode}
        value={props.value} onChange={(e) => props.onChange(e.target.value)} onBlur={props.onBlur} />
    </div>
  );
}

function HostPicker({ selected, onSelect }: { selected: HostOption | null; onSelect: (h: HostOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HostOption[]>([]);

  // Type-ahead over the employee directory (FR-KIO-06).
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hosts?q=${encodeURIComponent(query)}`);
        const { hosts } = (await res.json()) as { hosts: HostOption[] };
        setResults(hosts);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <>
      <h1>Who are you visiting?</h1>
      <div>
        <label htmlFor="host-search">Search by name</label>
        <input id="host-search" type="search" autoComplete="off" placeholder="Start typing a name…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="list" role="listbox" aria-label="Employees">
        {results.map((h) => (
          <button key={h.id} role="option" aria-selected={selected?.id === h.id}
            className={selected?.id === h.id ? "selected" : ""} onClick={() => onSelect(h)}>
            <span>{h.name}</span>
            <span className="muted small">{h.department}</span>
          </button>
        ))}
        {results.length === 0 && <p className="muted small" style={{ padding: 12, margin: 0 }}>No one found. Try another spelling.</p>}
      </div>
    </>
  );
}

function PhotoStep({ photo, onPhoto }: { photo: string | null; onPhoto: (p: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  // capture="user" opens the phone's front camera. It works over plain HTTP, unlike getUserMedia,
  // which needs HTTPS — so this works on the office Wi-Fi during development too.
  const onFile = async (file: File | undefined) => {
    if (file) onPhoto(await resizeImage(file));
  };

  return (
    <>
      <h1>Take a quick photo</h1>
      <p className="muted">It's printed on your badge and shown to your host.</p>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="photo-preview" src={photo} alt="Your photo" />
        : <div className="photo-preview" style={{ background: "#f3f4f6" }} />}
      <input ref={inputRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button className="secondary" onClick={() => inputRef.current?.click()}>
        {photo ? "Retake photo" : "Open camera"}
      </button>
    </>
  );
}

/** Shrinks the camera image to ~480px JPEG so uploads are quick on mobile data. */
async function resizeImage(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasInk.current) onChange(canvasRef.current!.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange(null);
  };

  return (
    <>
      <canvas ref={canvasRef} className="signature" aria-label="Signature area"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} />
      <button className="secondary" style={{ marginTop: 8, minHeight: 40 }} onClick={clear}>Clear signature</button>
    </>
  );
}
