import Link from "next/link";

export default function Home() {
  return (
    <main className="phone stack">
      <h1>Visitor Management</h1>
      <p className="muted">Prototype of touchless sign-in (FR-KIO-13).</p>
      <Link className="button" href="/kiosk">Reception display (shows the QR)</Link>
      <Link className="button secondary" href="/admin">Admin: who is on site</Link>
    </main>
  );
}
