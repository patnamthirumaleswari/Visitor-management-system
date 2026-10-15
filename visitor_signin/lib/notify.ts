import { newId, write, type Host, type Visit, type Visitor } from "./db";
import { LOCATION } from "./config";

/**
 * Host notification on arrival (FR-NOT-01/02). The prototype logs to the server console;
 * plug SendGrid (email) and Twilio (SMS) in here, ideally from a job queue so the
 * sign-in request never waits on a third party.
 */
export async function notifyHost(host: Host, visitor: Visitor, visit: Visit) {
  const message = `${visitor.name}${visitor.company ? ` (${visitor.company})` : ""} has arrived at ${LOCATION.name} to see you.`;
  console.log(`[notify] to ${host.name} <${host.email}>: ${message}`);

  logNotification(visit, host);
}

/**
 * Invitation to a pre-registered visitor (FR-PRE-02). Logged for now; in production this is an
 * email/SMS with the link, the address and a map link.
 */
export async function notifyVisitorInvited(visitor: Visitor, host: Host, inviteUrl: string, day: string) {
  console.log(
    `[notify] invitation to ${visitor.name} <${visitor.email || visitor.phone}>: ` +
      `${host.name} has invited you to ${LOCATION.name} on ${day}. Details: ${inviteUrl}`,
  );
}

function logNotification(visit: Visit, host: Host) {
  write((d) => {
    d.notifications.push({
      id: newId(),
      visitId: visit.id,
      hostId: host.id,
      channel: "email",
      status: "logged",
      sentAt: new Date().toISOString(),
    });
  });
}
