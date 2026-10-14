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

export default function AdminPage() {
  const [onsite, setOnsite] = useState<OnsiteVisit[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/onsite", { cache: "no-store" });
      setOnsite((await res.json()).onsite);
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
      <div>
        <h1>On site now ({onsite.length})</h1>
        <p className="muted small">Refreshes every 5 seconds. Prototype — no login yet.</p>
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
    </main>
  );
}
