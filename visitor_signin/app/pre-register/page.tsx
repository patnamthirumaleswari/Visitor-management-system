import { VISITOR_TYPES } from "@/lib/config";
import { todayAtLocation } from "@/lib/dates";
import { read } from "@/lib/db";
import PreRegisterForm from "./PreRegisterForm";

export const dynamic = "force-dynamic";

// Host pre-registers a visitor (FR-PRE-01/02).
// TODO before any real deployment: only signed-in hosts/admins (NFR-SEC-03); the host
// should default to the signed-in employee.
export default function PreRegisterPage() {
  const hosts = read((d) => d.hosts.map(({ id, name, department }) => ({ id, name, department })));
  return <PreRegisterForm hosts={hosts} visitorTypes={VISITOR_TYPES} today={todayAtLocation()} />;
}
