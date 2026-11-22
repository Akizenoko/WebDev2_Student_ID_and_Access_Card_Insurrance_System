## Database Setup

The database is not stored in git. Each person creates their own copy locally.

### Requirements
- PostgreSQL installed (version 18 used here), with `psql` available in the terminal
- Node.js

### Steps

Run all commands from the project root.

1. **Create the database**
   ```bash
   psql -U postgres -c "CREATE DATABASE student_id_db;"
   ```

2. **Create the tables**
   ```bash
   psql -U postgres -d student_id_db -f database/schema.sql
   ```

3. **Create your `.env` file from the template**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and replace `YOURPASSWORD` with your own Postgres password.
   Never commit `.env`. (Tip: `ls -a` shows files that start with a dot.)

4. **Install packages**
   ```bash
   npm install
   ```

5. **Test the connection**
   ```bash
   node -e "import('./server/db/pool.js').then(async m => { const r = await m.default.query('select now()'); console.log(r.rows[0]); process.exit(); })"
   ```
   You should see an object with a timestamp.

6. **Seed the database** (needed before you can log in)
   ```bash
   node server/db/seed.js
   ```

### Using pgAdmin instead of psql
Create a database named `student_id_db`, open the Query Tool on it, open `database/schema.sql`, and run it. Then continue from step 3.

## Running the App

Start the backend server:
```bash
node server/index.js
```

then start the server for react 
"npm run dev"



FOR OTP 

install 
npm install nodemailer

add this to your server .env
EMAIL_USER=wmsuid@gmail.com
EMAIL_APP_PASSWORD=hoisfpdzihpccrbl

also run this again for the db 
psql -U postgres -d student_id_db -f database/schema.sql

---

## ID issuance & activation — process review and team notes (added 2026-11-22)

> This section was **appended** for the shared repository. Everything above is the original database setup/OTP documentation and is kept unchanged. Where the steps below differ from the older notes above, **use the steps in this section**.

### A. Core rule: the ID *is* the activation card

There is **one physical credential**, not two. The university ID doubles as the campus activation/access card. The database models this as a single `cards` row (`database/schema.sql:61-80`, `database/schema.sql:163-178`):

| Column | Meaning |
| --- | --- |
| `card_number` | Printed ID/card number (`WMSU-...`). |
| `credential_ref` | The scan/activation reference (`CRD-...`). Scans use this, **never** the student number. |
| `status` | Physical ID lifecycle (production → issued → active → lost/expired/...). |
| `access_status` | Electronic access lifecycle (activation is a separate step on the *same* card). |
| `valid_until` | Five-month validity, extended by revalidation. |

So: issue **one** card, then activate **that same card's** `credential_ref`. Do not create or document a separate "access card".

### B. Which files are live (edit these) and which are legacy (do not build on these)

The current app is only `src/App.jsx` → `src/components/AuthPortal.jsx` (login/register/OTP) and `src/components/PortalDashboard.jsx` (everything else).

**Live backend routes** (mounted in `server/index.js:25-34`): `auth.js`, `applications.js`, `reissuance.js`, `cards.js`, `files.js`, `facilities.js`, `access.js`, `revalidation.js`, `reports.js`, `notifications.js`.

**Legacy / unreferenced UI** (still in the tree, not imported by `App.jsx`): `AdminDashboard.jsx`, `StudentDashboard.jsx`, `ApplyModal.jsx`, `ApplyConfirmModal.jsx`, `ApplicationDetailModal.jsx`, `CardRecordModal.jsx`, `ReissueModal.jsx`, `StatusTrackerModal.jsx`, `StatusStepper.jsx`, `AuthModal.jsx`, `OtpStep.jsx`, `ProfileModal.jsx`, `header.jsx`, `navbar.jsx`, `LogoutConfirmModal.jsx`, and `src/pages/login.jsx` / `src/pages/sign_in.jsx`. These contain outdated wording about RFID chips, thermal printing, QR/barcodes and "card insurance". **Do not use them as a reference for the current process**; they are kept for reference only until deliberately removed.

### C. End-to-end process as currently implemented

1. **Register + verify email.** Student registers with a COR file; OTP verifies the email (`server/routes/auth.js`). Account and `student_profiles` are created here.
2. **Apply.** Student submits `New ID` or `Renewal` from "Apply for credential" (`PortalDashboard.jsx:24`, `api.js:118-127`). Lost/damaged cards use the separate "Lost or damaged ID" form. The server blocks duplicates, renewal-before-expiry and overlapping reissues (`server/routes/applications.js:230-359`).
3. **Staff review.** Admin/validator moves `submitted → processing → ready → released`; the transition map, remarks for reject/correction, and an official staff-captured photo are enforced server-side (`applications.js:369-433`, `StaffPhotoCapture.jsx`, `applications.js:533-545`). Moving to `ready` notifies the student to pick up the card (`applications.js:486-498`).
4. **Card record is created at `released`** (`applications.js:435-484`): one `cards` row with `status = 'active'`, `access_status = 'unregistered'`, `credential_ref = CRD-...`, and `valid_until` = 5 months from issue. Replacement/renewal also change the old card's **physical** status here.
5. **Student requests activation.** The "My card" view shows **Request activation** only when `status === 'active'` and `access_status` is `inactive`/`unregistered` (`PortalDashboard.jsx:23`). The server sets `access_status = 'requested'` and notifies admins/validators (`server/routes/cards.js:193-219`).
6. **Staff activates.** Staff portal → **Access control** → *Credential / access state* → choose `active` (`AssuranceScreens.jsx:158-164`, `cards.js:242-254`). This stamps `access_activated_at`.
7. **Grant facility permissions.** Access is not granted by activation alone: staff must grant per-facility permissions (`server/routes/facilities.js:129-159`), otherwise scans are denied with "No active permission for this facility".
8. **Scan check.** Staff enters the `credential_ref` + facility. The server checks card state, access state, `valid_until`, facility active, and an active dated permission, then logs every attempt in `access_attempts` (`server/routes/access.js:11-81`). This is a **simulated** scan — there is no QR/barcode/RFID reader or printer in the project.
9. **Revalidation.** Each semester the student uploads a new COR; staff verifies → `valid_until` extended 5 months, or marks ineligible → access `revoked` (`server/routes/revalidation.js`).
10. **Loss / damage.** Student submits report + proof + fee; a replacement/renewal application is created. Verifying a loss report revokes the old card's access (`server/routes/reissuance.js:295-336`).

### D. Status vocabulary (keep UI + backend in sync)

- **Application** (`applications.status`): `submitted`, `processing`, `ready`, `released`, `rejected`, `needs_correction`.
- **Physical card** (`cards.status`): `pending_production`, `ready_for_release`, `issued`, `active`, `lost`, `damaged`, `replaced`, `expired`, `suspended`, `revoked`.
- **Access / activation** (`cards.access_status`): `unregistered`, `registered`, `requested`, `pending_activation`, `active`, `suspended`, `inactive`, `revoked`.

Hard-coded copies of these lists live in `server/routes/applications.js:370`, `server/routes/cards.js:221` and `:260`, and `src/components/AssuranceScreens.jsx:120-121`. **Update all four** when changing a state.

### E. What is new/changed in this working tree (share this with the team)

At review time these were **uncommitted on `AkiBranch`** — commit/merge them in logical chunks before other branches build on them.

**New files:**

- `database/migrate.sql`, `server/db/accessSchema.js` — idempotent upgrades for existing local databases (run automatically at server startup via `server/index.js:43`).
- `server/routes/access.js`, `server/routes/facilities.js`, `server/routes/revalidation.js` — simulated scanning, facility permissions, semester revalidation.
- `src/components/AuthPortal.jsx`, `src/components/PortalDashboard.jsx` — the current login and dashboard UI (replaces the older split dashboards).
- `src/components/StaffPhotoCapture.jsx`, `src/components/ReplacementRequestModal.jsx`, `src/components/AssuranceScreens.jsx`, `src/components/Pagination.jsx`, `src/hooks/usePaged.js`, `src/style/portal.css`, `src/style/light-theme.css`.

**Modified areas:** `database/schema.sql` (access-control tables, expanded status checks, credential ref, reissuance/revalidation fields); `server/index.js` (new route mounts + startup schema upgrades); `server/routes/applications.js` (state machine, staff photo gate, card creation on release); `server/routes/cards.js` (activation request, access/physical status, credential lookup, semester validation, expiry); `server/routes/auth.js`, `files.js`, `reissuance.js`, `reports.js`; `src/App.jsx`, `src/services/api.js`, `src/components/NotificationBell.jsx` and other modal components; `src/pages/login.jsx`, `src/pages/sign_in.jsx`.

**Note:** `server/db/accessSchema.js:6-7` deliberately drops old `pickup_notice_at` / `pickup_code` columns — there is currently **no pickup code/confirmation** in the flow (see findings below).

### F. Setup for a new teammate (corrected instructions)

Run these from the project root. They supersede the older steps above where they differ.

1. Get the repo, switch to the current branch, and **pull before editing**:
   ```bash
   git checkout AkiBranch
   git pull
   ```
2. Create a local PostgreSQL database (the database is not shared via git):
   ```bash
   psql -U postgres -c "CREATE DATABASE student_id_db;"
   psql -U postgres -d student_id_db -f database/schema.sql
   ```
   For an **existing** local database use `psql -U postgres -d student_id_db -f database/migrate.sql` instead. The server also applies idempotent upgrades at startup, so restarting the backend after pulling is required.
3. Install packages: `npm install`.
4. Create your own `.env` in the project root. Needed keys: `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD` (see `server/db/pool.js` and `server/mailer.js`). There is currently **no `.env.example`** despite the older step 3 above referring to one — create your own and **never commit it**.
5. Optional demo data (skips itself if `users` is not empty): `node server/db/seed.js`. Demo logins: `student@wmsu.edu.ph` / `password123`, `admin@wmsu.edu.ph` / `admin123`.
6. Run: `npm run dev` (starts Express on `:5000` and Vite on `:5173`; `/api` is proxied to the backend). `npm run server` / `npm run client` run them separately.
7. Verify: `GET /api/health` should return `{"status":"ok"}`.

**Careful:** `npm run db:clean` (`server/db/clean.js`) deletes cards, applications, reissuance records, status history, uploads and non-seed users. It is a local reset tool, not a routine command.

### G. Team workflow rules for this shared project

- Pull/rebase before starting work; commit in small logical chunks with clear messages. Do not overwrite another person's uncommitted work.
- Never commit `.env` or real email/JWT/database credentials. **Action needed:** the original OTP notes at the bottom of this file contain a real-looking `EMAIL_APP_PASSWORD` value — remove it from the repo and rotate that password.
- After pulling schema changes, re-run `database/migrate.sql` (or just restart the server) before testing.
- Change status values in **all** the places listed in section D.
- If you change the issuance/activation flow, update section C and the QA checklist in section J in the same commit.
- Do not edit the legacy components listed in section B for new features; they are not in the live app.

### H. Review result — is the process good for an ID that is also the activation card?

**Verdict:** The *model* is right — one `cards` record with separate physical and electronic states, a non-student-number `credential_ref`, strict application transitions, audit/history tables, and scan-time checks. As a **prototype** the flow is coherent. It is **not yet safe for real issuance** because activation is not bound to the physical card handover/presentation, and superseded cards are not fully disabled electronically.

**Strengths**

- Single-card design; `credential_ref` is unique and separate from the student number (`schema.sql:163-166`).
- Server-enforced application transition map, correction/rejection remarks, and mandatory staff photo (`applications.js:369-433`).
- Students can only request activation for their own active card (`cards.js:193-201`).
- Scan decision checks card state, access state, validity, facility state and per-facility permission, and logs attempts (`access.js:34-64`).
- `status_history`, `card_status_history`, `audit_logs` and expiry/revalidation provide traceability.

**Gaps found (highest priority first)**

| # | Severity | Finding / location | Why it matters for a dual-purpose card | Suggested action |
| --- | --- | --- | --- | --- |
| 1 | High | Activation is just a button click in the digital wallet (`PortalDashboard.jsx:23`), and staff pick any state from a dropdown (`AssuranceScreens.jsx:158-164`, `cards.js:242-254`). No pickup confirmation, physical-card scan, or ID/face check. `pickup_notice_at`/`pickup_code` were removed (`accessSchema.js:6-7`). | The ID *is* the activation token. Anyone with account access can request activation, and staff can flip a card to `active` without ever seeing the card. | Require a `released`/handover step and scan the printed `credential_ref` at activation; log the actor and evidence. |
| 2 | High | Replacement/renewal only change the old card's **physical** `status` (`applications.js:446-469`, `reissuance.js:237-242`). `access_status` stays `active` (loss is revoked only if/when staff verify, `reissuance.js:317-327`), and old `card_permissions` remain. | Two `credential_ref` values can grant access at once — defeats the one-card model. | Atomically set old card `access_status = 'revoked'` and deactivate its permissions whenever a replacement is issued. |
| 3 | High | `PATCH /api/cards/:id/access-status` has no transition guard, no reason requirement, and no check that the physical card is active/handed over (`cards.js:242-254`). `revoked → active` is possible. | Staff error or misuse can activate an unusable or recalled card. | Add an allowed-transition map (e.g. `requested → active`, `active → suspended/revoked`), require a reason, and validate `cards.status`. |
| 4 | Medium | Five-month `valid_until` starts at **release**, not at activation (`applications.js:442-444`, `:471-482`). | A student who activates late loses part of their access window. | Start/extend the window when activation is approved (or at confirmed pickup). |
| 5 | Medium | Card is created with physical `status = 'active'` at `released` (`applications.js:471-473`), before pickup; `pending_production`, `ready_for_release`, `issued` are only reachable via manual staff edits. | Registry claims an ID is "active" while it is still at the registrar. | Create at `ready_for_release`/`issued` and move to `active` on handover. |
| 6 | Medium | `credential_ref` and `card_number` use `Math.random()` (`applications.js:477-478`) but both columns are `UNIQUE` (`schema.sql:65,164`); `card_number` has only 900 variants per student/year. | Collisions cause a 500 + rolled-back release for the student. | Generate with `crypto.randomBytes`/`randomUUID` and retry on unique violation. |
| 7 | Medium | No QR/barcode/RFID/printing implementation; the reference is displayed as text (`PortalDashboard.jsx:23`) and typed manually in the scan form (`AssuranceScreens.jsx:182`). Legacy UI claims otherwise (`StatusTrackerModal.jsx:29-32`). | A "physical activation card" needs a machine-readable token; current docs mislead users. | Add an encoded QR of `credential_ref` to the printable card (or correct the copy to "manual reference entry" for the prototype). |
| 8 | Medium | Activation request is not written to `card_status_history` / `audit_logs` (`cards.js:193-219`). | History shows the staff change but not the student's request. | Log the request event with actor and timestamp. |
| 9 | Medium | `access_activated_at` is set on `active` but never cleared on `revoke`/`suspend` (`cards.js:249`). | Ambiguous "when was it active" reporting. | Keep the last activation timestamp but add explicit deactivation fields/events, or clear it with a logged reason. |
| 10 | Low | Activation does not grant facility permissions; scans then fail (`access.js:49-56`, `facilities.js:129-159`). | Staff/students see "denied" even for a correctly activated card. | Define default permissions on activation and document the extra grant step clearly. |
| 11 | Low | Expiry sweep runs only inside `GET /api/cards` (`cards.js:42`). Scans still check `valid_until` (`access.js:46`), so no access bypass, but card status can look stale. | Confusing dashboard/report status. | Run the sweep on a timer/startup and before scan decisions. |
| 12 | Low | The original OTP notes at the bottom of this file contain a hardcoded email app password; `.env.example` is referenced but missing. | Credential leak and broken onboarding. | Remove/rotate the secret, add a real `.env.example` with placeholder values. |
| 13 | Low | No automated tests; only ad-hoc `check_db.mjs` / `test_delete.mjs`. | Regressions in the state machine are easy to miss. | Add at least API-level tests for sections C/J. |

### I. Suggested fix order before calling this production-ready

1. Revoke old card access + permissions atomically on replacement/renewal (#2).
2. Bind activation to physical handover/presentation and add staff-side transition rules + reasons (#1, #3).
3. Move the validity clock to activation/pickup (#4) and fix the physical lifecycle (#5).
4. Replace random identifier generation (#6) and add request/history logging (#8, #9).
5. Add the machine-readable credential or correct the documentation (#7), then permissions defaults (#10) and tests (#13).

### J. Manual QA checklist (run after any change to this flow)

- [ ] Register a student with COR; OTP verifies; login works.
- [ ] Apply for `New ID`; duplicate/in-progress applications are blocked.
- [ ] Staff captures official photo; application cannot reach `ready`/`released` without it.
- [ ] `ready` notifies the student; `released` creates exactly one card with `CRD-...` ref.
- [ ] Student sees **Request activation** only for an active, unregistered card; request sets `requested` and notifies staff.
- [ ] Staff activates the same card; `access_activated_at` is stamped; history/audit entries exist.
- [ ] Simulated scan is denied before activation, after activation **without** a facility permission, and granted after permission is granted.
- [ ] Scan is denied after `valid_until` passes and after access is suspended/revoked.
- [ ] Replacement/renewal: old card's access is revoked and its permissions are inactive before the new card is activated.
- [ ] Revalidation verified extends validity; ineligible revokes access.
- [ ] All list/detail views still show one card per student with the correct `credential_ref`.

### K. API quick map

`/api/auth` (register, login, OTP), `/api/applications` (CRUD, `:id/status`, `:id/photo`, `:id/assign`), `/api/cards` (list/detail, `:id/access-request`, `:id/access-status`, `:id/status`, `credential/:ref`, `:id/history`, `:id/validate-semester`), `/api/facilities` (facilities + `:id/permissions`), `/api/access` (`/check`, `/attempts`), `/api/reissuance` (`:id/verify`), `/api/revalidation` (`:id/review`), `/api/reports`, `/api/notifications`, `/api/files`. See `src/services/api.js` for the frontend wrappers.
