# UnboxMed Conference 2026

The conference website includes registration, personalized QR tickets, Mailjet email delivery, and a PIN-protected browser check-in scanner.

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The public landing page works without service credentials. Registration, ticket pages, and check-in require a configured Postgres database.

## Supabase database

1. Create a Supabase project or add Supabase from the Vercel Marketplace.
2. Copy its pooled Postgres connection string into `POSTGRES_URL`.
3. Apply the schema with either:

```powershell
npm run db:push
```

Or paste [`drizzle/0000_create_registrations.sql`](drizzle/0000_create_registrations.sql) into the Supabase SQL editor.

For the raffle, also apply [`drizzle/0001_create_raffle_draws.sql`](drizzle/0001_create_raffle_draws.sql) after the registration migration.

The table has row-level security enabled without public policies. The website connects only through the server-side Postgres URL; do not expose the database URL to the browser.

## Mailjet transactional email

1. Create a Mailjet account.
2. Open **Account settings > Senders & Domains**, add an individual sender address, and click the confirmation link Mailjet sends to that inbox. A custom domain is not required for this setup.
3. Open **Account settings > API Key Management**, then copy the API key and secret key. The secret is shown only once; regenerate it if it is lost.
4. Configure `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, and `MAILJET_SENDER_NAME`. `MAILJET_SENDER_EMAIL` must exactly match the verified sender address.

An address from Gmail, Outlook, or another free mailbox can be verified without DNS access, but delivery to some inboxes may be less reliable. Move to a custom sending domain with SPF and DKIM before launch if one becomes available.

Registration remains successful if email is unavailable. The confirmation page tells the attendee to download the ticket when delivery fails.

## Staff scanner

Set a long shared `STAFF_CHECKIN_PIN` and an unrelated random `CHECKIN_SESSION_SECRET`. Staff visit `/staff/checkin`; the browser stores a secure HttpOnly session cookie for 12 hours.

Camera scanning requires HTTPS except on localhost. The scanner also accepts a pasted `/checkin/{uuid}` URL or UUID when camera access is unavailable.

## Staff raffle

Visit `/staff/raffle` and sign in with the same shared staff PIN. Choose **Host controls** on the operator device and **Stage display** on the projector device. Both views use the same URL and synchronize through the persisted raffle state.

Only checked-in attendees who have never been drawn are eligible. Run a rehearsal before the event, then clear only the `raffle_draws` table in Supabase before the live raffle.

## Vercel variables

Configure these for Production and Preview as appropriate:

```text
POSTGRES_URL
APP_URL
MAILJET_API_KEY
MAILJET_SECRET_KEY
MAILJET_SENDER_EMAIL
MAILJET_SENDER_NAME
STAFF_CHECKIN_PIN
CHECKIN_SESSION_SECRET
```

`APP_URL` must be the final production origin, without a trailing slash, so emailed QR codes point to the correct host.

## Quality checks

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

## Event-day readiness

- At least 48 hours before the event, open Supabase and confirm the free project is not paused.
- Register a fresh test attendee and confirm the database row, email, PNG, PDF, and calendar attachment.
- Scan the test ticket on the staff phones over the production HTTPS domain.
- Scan it a second time and confirm the red "Already scanned" result includes the original time.
- Test an invalid UUID and a manually voided registration.
- Confirm the staff PIN works on each check-in phone, then keep it private.
- Export a CSV backup from Supabase before doors open.
