# Visitor Sign-In (touchless)

Next.js (React + Node) prototype of **touchless sign-in** (FR-KIO-13): the visitor scans a QR code at
reception and does the whole sign-in on their own phone.

## How it works

```
Reception screen (/kiosk)            Visitor's phone
-------------------------            -----------------------------------------------
Shows a QR that changes      scan -> /s/<token>   checks the token, gives the phone a
every 30 s (signed, valid             one-time session cookie, redirects to /visit
for 90 s)                            /visit       type -> details -> host -> photo -> sign
                                     POST /api/visits  creates the visit, notifies host
"Welcome, Priya!"      <- polls --   /badge/<id>  digital badge + "Sign out" button
```

- **Why the QR rotates:** a static poster can be photographed and used to sign in from anywhere.
  A code that expires in 90 s proves the visitor is standing at reception.
- **One scan = one sign-in:** the session is consumed when the visit is created.
- **Camera:** the photo uses `<input type="file" capture="user">`, which opens the front camera
  and works over plain HTTP on the office Wi-Fi (the `getUserMedia` API would need HTTPS).
- **Returning visitors:** typing a known mobile number pre-fills name and company.

## Pre-registration (FR-PRE-01/02, FR-KIO-09)

```
Host: /pre-register  ->  invitation saved on the server  ->  invite link + QR to send to the visitor
Visitor opens link   ->  /invite/<code>  "You're expected on 15 Oct" (invite remembered on the phone)
On arrival: scans the reception QR  ->  "Welcome Ravi, Priya is expecting you"  ->  photo + sign  ->  badge
```

- Invited visitors **skip the details form and host search** — the invitation already has them.
- After the reception scan, the phone asks **"Do you have a QR invite?"**. *Yes* scans the QR from the
  invitation (email, printout, another phone) and goes straight to "Welcome Ravi". *No* opens the
  normal walk-in form. Phones that opened the invite link earlier skip the question.
- Scanning uses the live camera on HTTPS/localhost. On plain HTTP (office Wi-Fi in dev) browsers block
  live camera access, so the visitor takes a photo of the QR instead, decoded with `jsqr`.
- If they never opened the link, typing their invited mobile number in the form finds today's invitation.
- An invitation works only on its visit date, only once, and only after scanning the reception QR
  (so it still proves the visitor is on site).
- `/admin` lists who is expected today and hasn't arrived.

Pre-registration started as a separate Vite app (`client/`, branch `feature/pre-registration-and-qr-codes`)
that kept invitations in the host's browser `localStorage`; it now lives here and saves to the server so
reception can recognise the visitor.

| Page | Who uses it |
|---|---|
| `/kiosk` | Tablet/TV at reception |
| `/visit` | Visitor's phone (after scanning) |
| `/badge/<id>?t=...` | Visitor's phone: badge and sign-out |
| `/pre-register` | Host: invite a visitor |
| `/invite/<code>` | Visitor's phone: their invitation |
| `/admin` | Reception: who is on site, who is expected, manual sign-out |

## Run it

Needs Node.js 20 or newer. Run these from the `visitor_signin` folder.

```bash
cd visitor_signin
npm install
npm run dev
```

1. On the PC, open `http://localhost:3000/kiosk`.
2. Under the QR it shows the address phones will use (e.g. `http://192.168.0.111:3000`).
   The phone must be on the **same Wi-Fi** as the PC.
3. Scan with the phone camera.

If the phone can't load the page, allow Node through Windows Firewall on private networks, or set
`PUBLIC_BASE_URL` in `.env.local` (see `.env.example`) if the wrong network adapter was detected.

## Prototype shortcuts to replace before production

- `lib/db.ts` stores everything in `data/db.json`. Swap for PostgreSQL (Prisma/Drizzle).
- `lib/notify.ts` logs host notifications and visitor invitations to the console. Plug in SendGrid / Twilio via a job queue.
- `/admin`, `/api/admin/*`, `/pre-register` and `POST /api/invitations` have **no login**. Add auth + RBAC (NFR-SEC-03) and audit logging (FR-ROLE-02).
- Photos and signatures are stored as data URLs. Move to S3 with encryption at rest (NFR-SEC-01).
- Set a strong `APP_SECRET` and serve over HTTPS.
- Single location and hard-coded visitor types in `lib/config.ts`; these become admin-managed tables.
