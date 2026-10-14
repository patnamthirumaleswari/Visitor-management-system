// Prototype storage: one JSON file under ./data. Every function goes through read()/write(),
// so swapping this module for PostgreSQL (Prisma/Drizzle) later doesn't touch the routes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Host = { id: string; name: string; email: string; phone: string; department: string };

export type Visitor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  photo?: string; // data URL (prototype); S3 URL in production
};

export type Visit = {
  id: string;
  visitorId: string;
  hostId: string;
  locationId: string;
  visitorType: string;
  purpose: string;
  status: "signed_in" | "signed_out";
  source: "qr" | "kiosk" | "portal";
  signedInAt: string;
  signedOutAt?: string;
  badgeToken: string;
  agreementVersion?: string;
  signature?: string; // data URL of the finger signature
};

export type Notification = {
  id: string;
  visitId: string;
  hostId: string;
  channel: "email" | "sms";
  status: "logged" | "sent" | "failed";
  sentAt: string;
};

type Data = {
  hosts: Host[];
  visitors: Visitor[];
  visits: Visit[];
  usedSessions: string[];
  notifications: Notification[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const SEED: Data = {
  hosts: [
    { id: "h1", name: "Anita Sharma", email: "anita@example.com", phone: "+911111111111", department: "Engineering" },
    { id: "h2", name: "Rahul Verma", email: "rahul@example.com", phone: "+912222222222", department: "Sales" },
    { id: "h3", name: "Priya Nair", email: "priya@example.com", phone: "+913333333333", department: "HR" },
    { id: "h4", name: "Arjun Reddy", email: "arjun@example.com", phone: "+914444444444", department: "Finance" },
    { id: "h5", name: "Meera Iyer", email: "meera@example.com", phone: "+915555555555", department: "Operations" },
  ],
  visitors: [],
  visits: [],
  usedSessions: [],
  notifications: [],
};

function load(): Data {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Data;
}

function save(data: Data) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function read<T>(fn: (data: Data) => T): T {
  return fn(load());
}

export function write<T>(fn: (data: Data) => T): T {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

export const newId = () => crypto.randomUUID();

export const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, "");
