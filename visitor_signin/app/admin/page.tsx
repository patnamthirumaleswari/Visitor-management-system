"use client";

import { useCallback, useEffect, useState } from "react";
import { VISITOR_TYPES } from "@/lib/config";

type OnsiteVisit = {
  id: string;
  name: string;
  company: string;
  phone: string;
  photo: string | null;
  host: string;
  visitorType: string;
  source: string;
  signedInAt: string;
};

type ExpectedVisit = { id: string; name: string; company: string; phone: string; host: string; visitorType: string };

export default function AdminPage() {
  const [onsite, setOnsite] = useState<OnsiteVisit[]>([]);
  const [expected, setExpected] = useState<ExpectedVisit[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [onsiteRes, expectedRes] = await Promise.all([
        fetch("/api/admin/onsite", { cache: "no-store" }),
        fetch("/api/admin/expected", { cache: "no-store" }),
      ]);
      setOnsite((await onsiteRes.json()).onsite);
      setExpected((await expectedRes.json()).expected);
      setLoaded(true);
    } catch {
      /* keep showing the last list */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const signOut = async (id: string, name: string) => {
    if (!confirm(`Sign out ${name}?`)) return;
    await fetch(`/api/admin/visits/${id}/signout`, { method: "POST" });
    load();
  };

  return (
    <main className="admin stack">
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <h1>On site now ({onsite.length})</h1>
          <p className="muted small">Refreshes every 5 seconds. Prototype — no login yet.</p>
        </div>
        <a className="button" href="/pre-register" style={{ flex: "0 0 auto", width: "auto" }}>Pre-register a visitor</a>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th></th><th>Visitor</th><th>Type</th><th>Host</th><th>Signed in</th><th>Phone</th><th></th></tr>
          </thead>
          <tbody>
            {onsite.map((v) => {
              const type = VISITOR_TYPES.find((t) => t.id === v.visitorType);
              return (
                <tr key={v.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td>{v.photo ? <img src={v.photo} alt="" /> : null}</td>
                  <td><strong>{v.name}</strong>{v.company && <div className="muted small">{v.company}</div>}</td>
                  <td><span style={{ color: type?.color, fontWeight: 600 }}>{type?.label ?? v.visitorType}</span></td>
                  <td>{v.host}</td>
                  <td>{new Date(v.signedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} <span className="muted small">via {v.source}</span></td>
                  <td>{v.phone}</td>
                  <td><button className="secondary" onClick={() => signOut(v.id, v.name)}>Sign out</button></td>
                </tr>
              );
            })}
            {loaded && onsite.length === 0 && (
              <tr><td colSpan={7} className="muted">No one is signed in.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Expected today, not arrived yet ({expected.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Visitor</th><th>Type</th><th>Host</th><th>Phone</th></tr>
          </thead>
          <tbody>
            {expected.map((v) => {
              const type = VISITOR_TYPES.find((t) => t.id === v.visitorType);
              return (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong>{v.company && <div className="muted small">{v.company}</div>}</td>
                  <td><span style={{ color: type?.color, fontWeight: 600 }}>{type?.label ?? v.visitorType}</span></td>
                  <td>{v.host}</td>
                  <td>{v.phone}</td>
                </tr>
              );
            })}
            {loaded && expected.length === 0 && (
              <tr><td colSpan={4} className="muted">No one else is expected today.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
