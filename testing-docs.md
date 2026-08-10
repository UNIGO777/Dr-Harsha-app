# Sanchara — Human Testing Guide

For manual QA of the **patient app** (Android) and the **clinical portal** (web).

Written for a tester who has not seen the code. Every case says what to do, what
should happen, and — where it matters — *why*, so you can tell a real bug from
intended behaviour.

---

## 0. Read this first

### 0.1 What you need

| | |
|---|---|
| **Patient app** | `app-release.apk` — sideload onto an Android phone (Android 8+) |
| **Clinical portal** | `npm run dev` in `Sanchara-admin/` → http://localhost:5173 |
| **Backend** | https://api.drapp.nxtgendigitals.com/api |
| **Test phone** | A real Indian mobile you can receive SMS on |

Portal logins (seeded):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sanchara.test` | `Admin@12345` |
| Clinician | `clinician@sanchara.test` | `Clinic@12345` |

Test both. They are **not** the same — see [B1](#b1-login--roles).

### 0.2 Known broken — do NOT raise bugs for these

These are already known and tracked. Reporting them again costs everyone time.

| # | Issue | Effect on testing |
|---|---|---|
| K1 | **SMS not delivering.** The Fast2SMS account has no DLT sender ID or approved template registered, so India's telecom scrubbing drops every message. The API reports success and deducts credit, but nothing arrives. | **You cannot log in to production.** See [0.3](#03-how-to-test-without-sms) for the workaround. |
| K2 | **`/media/uploads/` returns 404 on production.** | Exercise videos and programme/exercise thumbnails will not load against production. They work locally. |
| K3 | Backend on the server is behind the local code (a Mongoose deprecation fix isn't deployed). | Harmless warning in server logs only. |
| K4 | **Wallet has no backend.** Balance is a placeholder, "Add money" is not connected to any payment provider. | Test the screens and copy, not the money. |
| K5 | **Consultation booking sends nothing.** The sheet works; the request goes nowhere. | Expected. Verify the wording says so. |
| K6 | **No push notifications.** The Alerts tab is built from live app data, not pushed messages. | Nothing will arrive on your lock screen. |
| K7 | iOS build does not exist yet. | Android only. |

### 0.3 How to test without SMS

Until K1 is resolved, use a backend running **outside** production mode — there
the OTP is returned in the API response *and* printed in the server console, so
you can log in. Ask the developer to point the app at a non-production backend,
or run one locally.

> ⚠️ This is a **testing-only** path. In production the OTP is deliberately never
> returned — if you ever see a `devOtp` field in a production response, that is a
> **serious security bug**; report it immediately.

### 0.4 How to report a bug

```
TITLE      one line, what's wrong
SCREEN     e.g. Session → Player → rating step
DEVICE     phone model + Android version, or browser + OS
ACCOUNT    which phone number / portal login
STEPS      1. …  2. …  3. …
EXPECTED   what should have happened
ACTUAL     what happened
EVIDENCE   screenshot or screen recording (essential for layout bugs)
SEVERITY   Blocker / Major / Minor / Cosmetic
```

**Severity:**

- **Blocker** — cannot proceed. Data loss, crash, cannot log in, cannot finish a session.
- **Major** — a feature is wrong but there is a way around it.
- **Minor** — wrong wording, wrong number, awkward behaviour.
- **Cosmetic** — spacing, alignment, colour.

Always attach a screenshot for anything visual. "It looks broken" is not actionable.

---

# Part A — Patient app

## A1. Sign-up and onboarding

New patients go through 10 steps before they reach the app.

| # | Test | Expected |
|---|---|---|
| A1.1 | Open the app for the first time | Landing screen: Sanchara wordmark, "Movement, medically supervised.", Get started + I already have an account |
| A1.2 | Tap **Get started** → enter a phone number | Accepts a 10-digit Indian number; rejects short/letters/invalid |
| A1.3 | Submit and wait for the OTP | Code arrives (or is shown, per [0.3](#03-how-to-test-without-sms)) |
| A1.4 | Enter a **wrong** code | Clear error, stays on the screen, lets you retry |
| A1.5 | Enter a wrong code **6 times** | Blocked after 5 attempts; must request a new code |
| A1.6 | Wait **>5 minutes**, then enter the correct code | "OTP has expired. Request a new code." |
| A1.7 | Enter the correct code in time | Continues to onboarding |
| A1.8 | **Welcome step** — pick Light, Dark and System in turn | Whole screen repaints immediately for each |
| A1.9 | Work through basic info, body metrics | Cannot continue with required fields empty |
| A1.10 | **BMI reveal** | Number counts up, ring sweeps, category matches the height/weight entered |
| A1.11 | **Pain areas** — tap the body map, front and back | Selected areas appear as chips below; tapping again removes |
| A1.12 | Pain areas — use the "Other" free-text box | Saved alongside the tapped areas |
| A1.13 | Conditions, experience, goal | All save |
| A1.14 | Finish onboarding | Lands on programme selection |
| A1.15 | **Age outside 30–60** at the age step | Waitlist dialog appears explaining the age range |
| A1.16 | Kill the app mid-onboarding, reopen | Returns to onboarding rather than the landing screen |

**Check the progress bar** reads "Step *n* of 10" correctly and never goes backwards.

## A2. Returning login

| # | Test | Expected |
|---|---|---|
| A2.1 | Log out, log back in with the same number | Straight to the app — onboarding is **not** repeated |
| A2.2 | Close and reopen the app while logged in | Opens on the plan, no login |
| A2.3 | Log out | Returns to the landing screen; progress is not lost |

## A3. Choosing a programme

| # | Test | Expected |
|---|---|---|
| A3.1 | View the programme list | Recommended hero at top, then all programmes |
| A3.2 | Check the recommendation wording | Explains *why* it was recommended, matching your pain areas/goal |
| A3.3 | Filter by goal chips | List narrows; "All" restores |
| A3.4 | Scroll to the bottom | More programmes load automatically (infinite scroll) |
| A3.5 | Pull down to refresh | Refreshes without duplicating |
| A3.6 | **Scroll to the very last card** | The last card is **fully visible** — not hidden behind the phone's navigation bar |
| A3.7 | Open a programme | Detail: cover image, about, Focus + Intensity, structure |
| A3.8 | Check **Focus / Intensity** tiles | Both are the **same height and shape**. Focus shows up to two areas plus "+N more areas" if there are more |
| A3.9 | Check the **Structure** section | Days are listed. For a levelled programme they are grouped under LEVEL 01, LEVEL 02… |
| A3.10 | Note the day numbers in a levelled programme | Numbering **restarts at 1 inside each level**. This is correct, not a bug |
| A3.11 | Tap **Start this programme** — **once** | You go into the app. It must **not** need a second tap |
| A3.12 | While already enrolled, open another programme and start it | Asks "Switch program?" before switching |

## A4. Home (Plan tab)

| # | Test | Expected |
|---|---|---|
| A4.1 | Read the greeting | Correct time of day and your first name |
| A4.2 | Check the ring | Big number = today's day; caption = level; outer amber arc = whole programme |
| A4.3 | Check the level bar under the ring | One segment per level; completed solid, current part-filled |
| A4.4 | Scroll down slowly | A compact header fades in at the top with the wordmark, balance, bell, profile |
| A4.5 | Tap the **bell** | Opens Alerts |
| A4.6 | Tap the **balance pill** | Opens Wallet |
| A4.7 | Tap the **profile icon** | Opens Profile |
| A4.8 | Check today's session card | Title, exercise count, minutes, and a cover image |
| A4.9 | Scroll the whole page | Journey, week strip, wallet card, insight, quick sessions, clinician card |
| A4.10 | Tap **Book** on the clinician card | Consultation sheet opens (see [A9](#a9-consultation-booking)) |
| A4.11 | Pull to refresh | Everything reloads |

## A5. Doing a session

The core flow. Test carefully.

### A5.1 Pain check-in

| # | Test | Expected |
|---|---|---|
| A5.1.1 | Tap **Start today's session** | Pain check-in appears first |
| A5.1.2 | Check which areas are listed | Exactly the pain areas from your profile |
| A5.1.3 | Try to continue without rating everything | Button disabled; "Rate every area to continue" |
| A5.1.4 | Rate everything **low (0–3)** and start | Session starts, first video plays |
| A5.1.5 | **Rate any area 8, 9 or 10** and start | ⚠️ **Blocked.** A safety screen appears advising rest, with "Rest today" and "Start anyway" |
| A5.1.6 | Tap **Start anyway** | A second confirmation warns it will be recorded for the clinician |
| A5.1.7 | Confirm | Session starts. This is intended — the override is deliberately allowed but logged |
| A5.1.8 | Tap **Rest today** instead | Returns to the plan, no session created |

> The pain gate is a **clinical safety feature**. If a score of 8+ ever starts a
> session *without* the warning, that is a **Blocker**.

### A5.2 The player

| # | Test | Expected |
|---|---|---|
| A5.2.1 | Look at the header | "EXERCISE 1 OF *n*" with a segment bar |
| A5.2.2 | Count the segments | Matches the exercise count on the session card |
| A5.2.3 | Watch the video | Plays automatically and **loops** |
| A5.2.4 | Tap pause / play | Works |
| A5.2.5 | Tap the restart button | Video returns to the start |
| A5.2.6 | Read the exercise details | Title, sets, minutes, any notes |
| A5.2.7 | Tap **I've finished this exercise** | Rating step appears |
| A5.2.8 | If an exercise has **no video** | A tidy "No video for this exercise yet" placeholder — **not** a black box or crash |

### A5.3 Rating

| # | Test | Expected |
|---|---|---|
| A5.3.1 | Try to continue without choosing a score | Button disabled — the rating is **required** |
| A5.3.2 | Pick a low score (1–3) | Pill turns amber/red — "very hard" end |
| A5.3.3 | Pick a high score (8–10) | Pill turns mint — "very easy" end |
| A5.3.4 | Tap **Too hard** | Selects; tapping again clears it |
| A5.3.5 | Tap **Too easy** | Selects; the two are mutually exclusive |
| A5.3.6 | Tap **Next exercise** | Moves to exercise 2; progress bar advances |
| A5.3.7 | Tap **Back to the video** instead | Returns to the video, keeps your place |

### A5.4 Finishing, quitting, resuming

| # | Test | Expected |
|---|---|---|
| A5.4.1 | Complete every exercise | "Session complete" summary with the exercise count |
| A5.4.2 | Tap **Finish** | Returns to the plan; the ring has advanced a day |
| A5.4.3 | Finish the **last day of a level** | "Level up" message |
| A5.4.4 | **Mid-session, force-close the app.** Reopen | Plan says "Resume session"; tapping it returns you to the **exact exercise you were on** |
| A5.4.5 | Mid-session, tap the back chevron | "End this session?" confirmation |
| A5.4.6 | Confirm ending | Returns to the plan; the day stays incomplete |

## A6. One session per day

**Deliberate rule:** after finishing a day, the next one is locked until the
calendar rolls over (clinic time, IST).

| # | Test | Expected |
|---|---|---|
| A6.1 | Finish today's session | Session card is replaced by "Today's session is done" with "Day *n* · Opens tomorrow" |
| A6.2 | Try to start another session the same day | Not possible |
| A6.3 | Read the greeting subtitle | "You've done your session for today. Come back tomorrow…" |
| A6.4 | Check the ring | Has advanced to the next day — correct. The day is *shown* but *locked* |
| A6.5 | **Next day**, reopen | Unlocked; the new session can be started |
| A6.6 | On a **rest day**, tap "I rested today" | Marks the day done; same lock applies afterwards |

> Locking is enforced on the server, so it cannot be bypassed by reinstalling.

## A7. Progress tab

| # | Test | Expected |
|---|---|---|
| A7.1 | Open with **no sessions done** | "Nothing to show yet" explainer — not an empty page |
| A7.2 | After a few sessions | Three tiles: sessions, day streak, minutes this week |
| A7.3 | Check the calendar | Dots on the days you exercised: mint = completed, amber = partial, ringed = today |
| A7.4 | Page back a month | Previous month loads; you cannot page into the future |
| A7.5 | Check **Pain over time** | One chart per pain area you check in on |
| A7.6 | Read a chart with **falling** pain | Mint, "moving the right way" |
| A7.7 | Read a chart with **rising** pain | Amber, "worth mentioning to your clinician" |
| A7.8 | Check with only one reading | "One reading so far. A trend needs at least two." |
| A7.9 | Check **Recent sessions** | Correct dates, durations, ease scores |

## A8. Wallet tab

Screens only — no real money (K4).

| # | Test | Expected |
|---|---|---|
| A8.1 | Open Wallet | Balance shown as money **and** as days of access |
| A8.2 | Tap an amount, then **Add** | Clear message that payments are not live and nothing was charged |
| A8.3 | Toggle **auto-recharge** off and on | Amount options appear/disappear |
| A8.4 | Change the auto-recharge amount | Selection sticks |
| A8.5 | Go to Home | The wallet card and header pill show the **same balance** as the Wallet tab |
| A8.6 | Read the bottom notice | Says plainly that payments aren't connected |

## A9. Consultation booking

| # | Test | Expected |
|---|---|---|
| A9.1 | Home → clinician card → **Book** | Sheet slides up with Dr. Harsha's photo |
| A9.2 | Check the photo | The real photo, not a stock image |
| A9.3 | Try to request without picking a reason and a time | Button disabled |
| A9.4 | Pick both, then request | Clear message that booking is not live yet |
| A9.5 | Tap outside the sheet, and the ✕ | Both close it |

## A10. Alerts tab

Built from your live data (K6).

| # | Test | Expected |
|---|---|---|
| A10.1 | With a session waiting | "…is ready" with the exercise count |
| A10.2 | After finishing today's session | "Today's session is done" |
| A10.3 | Mid-session | "You have a session in progress" → tapping resumes |
| A10.4 | Tap any alert with an arrow | Goes to the right screen |
| A10.5 | Check the bell on Home | Orange dot when something needs action; no dot when only informational |
| A10.6 | With nothing pending | "You're all caught up" |

## A11. Profile

| # | Test | Expected |
|---|---|---|
| A11.1 | Open Profile | Header bar stays fixed while the page scrolls |
| A11.2 | Check the membership banner | Trial days remaining, or Active |
| A11.3 | Check the three tiles | Minutes this week, sessions done, BMI |
| A11.4 | Check **Your plan** | Programme name, level/day, % complete |
| A11.5 | **About you → Edit** — change your name | Saves; Profile shows the new name |
| A11.6 | Change **weight** | **BMI recalculates** on the profile |
| A11.7 | Edit a field, then press back **without saving** | "Discard changes?" confirmation |
| A11.8 | Open Edit and change nothing | Save button is disabled |
| A11.9 | **Health → Edit** — add a pain area | Saves |
| A11.10 | Start a session after A11.9 | The **check-in now asks about the new area** |
| A11.11 | Health → remove every pain area | Refuses — at least one is required |
| A11.12 | Log out | Confirmation first |

## A12. Appearance (light / dark / system)

| # | Test | Expected |
|---|---|---|
| A12.1 | Profile → Appearance → **Light** | Whole app turns light **immediately** |
| A12.2 | Switch to **Dark** | Whole app turns dark |
| A12.3 | Choose **System**, then change the phone's theme | App follows without reopening |
| A12.4 | Close and reopen the app | Your choice is remembered, with **no flash** of the wrong theme at launch |
| A12.5 | In **light mode**, visit every screen | No white-on-white or black-on-black text anywhere |
| A12.6 | Light mode — text on photos (session card, programme hero) | Still readable |
| A12.7 | Both modes — the status bar at the top | Icons stay visible against the background |

## A13. Layout and device checks

| # | Test | Expected |
|---|---|---|
| A13.1 | **Every tab** — look at the bottom bar | All five labels visible; icons **not** overlapped by the phone's gesture bar or buttons |
| A13.2 | Phone with **gesture navigation** | As above |
| A13.3 | Phone with **3-button navigation** | As above — no huge empty gap either |
| A13.4 | Every screen — look at the top | Nothing hidden behind the status bar / notch |
| A13.5 | Scroll to the bottom of every long screen | Last item fully visible |
| A13.6 | Set the phone's font size to **largest** | Text does not overlap or get cut off |
| A13.7 | Turn airplane mode on, open the app | A clear error with a retry — **not** a blank screen or crash |
| A13.8 | Turn the network back on, retry | Recovers |

---

# Part B — Clinical portal (web)

## B1. Login and roles

| # | Test | Expected |
|---|---|---|
| B1.1 | Open the portal signed out | Redirected to login |
| B1.2 | Wrong password | Clear error; no hint about whether the email exists |
| B1.3 | Log in as **admin** | Reaches Overview |
| B1.4 | Refresh the page | Still logged in |
| B1.5 | Log in as **clinician** | Reaches Overview |
| B1.6 | **As clinician, open Patients** | ⚠️ Only patients **assigned to that clinician** appear |
| B1.7 | As clinician, try a patient URL you were not assigned | Denied — **not** shown |
| B1.8 | As admin, open Patients | **All** patients appear |
| B1.9 | Log out | Returns to login; back button does not re-enter |

> B1.6–B1.7 are the **data-privacy** checks. A clinician seeing another
> clinician's patient is a **Blocker**.

## B2. Exercises and approvals

| # | Test | Expected |
|---|---|---|
| B2.1 | Open Exercises | List with thumbnails and status |
| B2.2 | Create an exercise with a video | Saves as **Pending** |
| B2.3 | Search / filter | Narrows correctly |
| B2.4 | Edit an exercise's title | Saves |
| B2.5 | **Edit an approved exercise and swap its video** | Goes back to **Pending** — re-approval is required. Intended |
| B2.6 | Open **Approvals**, approve one | Moves to Approved |
| B2.7 | Reject one, with a reason | Moves to Rejected |
| B2.8 | Upload a non-video file | Rejected with a clear message |
| B2.9 | Upload a very large video | Either succeeds or fails with a clear size message — never hangs silently |

> ⚠️ **Only APPROVED exercises reach patients.** A Pending or Rejected exercise
> inside a programme day is silently skipped in the app — see [B3.10](#b3-programmes-levels-and-days).

## B3. Programmes, levels and days

The content model is **Programme → Level → Day → Exercises**.

| # | Test | Expected |
|---|---|---|
| B3.1 | Open Programmes | List with covers, type, published state |
| B3.2 | Create a programme | Requires name; goals and target areas are pick-lists, not free text |
| B3.3 | Upload a programme **thumbnail** | Shows in the list, and later on the app's programme card |
| B3.4 | **Edit** an existing programme | Changes save |
| B3.5 | Open a programme | Levels listed, days inside each |
| B3.6 | Try to add a day **before** creating a level | Not possible — a level must exist first. Intended |
| B3.7 | Add a level | Appears with a day count of 0 |
| B3.8 | Add a **workout day** — pick exercises | Picker shows thumbnails, duration, difficulty |
| B3.9 | **Add the same exercise twice** to one day | Allowed — it appears twice, and the library row shows ×2 |
| B3.10 | Look for a red **"N won't play"** badge on any day | Means that day contains non-approved exercises the patient will never see. Fix by approving them or removing them |
| B3.11 | Reorder exercises with ▲ ▼ | Order changes, and matches the order in the app's player |
| B3.12 | Add a **rest day** | Marked as Rest; needs no exercises |
| B3.13 | Delete a day | Removed |
| B3.14 | Publish a programme | Becomes visible in the app's programme list |
| B3.15 | Unpublish it | Disappears from the app for new patients |

**Cross-check with the app:** after building a programme here, enrol a test
patient and confirm the level names, day titles, exercise order and counts all
match exactly.

## B4. Patients

| # | Test | Expected |
|---|---|---|
| B4.1 | Open Patients | List with name, phone, status |
| B4.2 | Search by name / phone | Finds the patient |
| B4.3 | Open a patient | Profile, health details, current programme, session history |
| B4.4 | Compare with the app | Pain areas, conditions and progress match what the patient sees |
| B4.5 | **Block** a patient — a reason is required | Cannot block without one |
| B4.6 | That patient uses the app | Access is refused |
| B4.7 | **Unblock** them | Access returns |
| B4.8 | Check the patient's pain trend | Matches the app's Progress tab |

## B5. Responsive layout

| # | Test | Expected |
|---|---|---|
| B5.1 | Desktop (1440px) | Sidebar always visible |
| B5.2 | Tablet (768px) | Sidebar becomes a drawer via the menu button |
| B5.3 | Phone (390px) | Everything reachable; tables scroll rather than overflow the page |
| B5.4 | Resize slowly from wide to narrow | No overlapping or clipped content at any width |

---

# Part C — Full run-through

Do this end to end at least once. It is the journey the real patient takes.

1. Portal: create an exercise, upload a video, **approve** it.
2. Portal: create a programme → add a level → add 2 days with exercises → publish.
3. App: sign up as a brand-new patient (fresh phone number).
4. App: complete onboarding, choosing **Dark** at the welcome step.
5. App: select the programme you just built.
6. App: check the programme detail matches the portal exactly.
7. App: start the session — try pain **9** first, see the block, go back and use **2**.
8. App: complete every exercise, rating each.
9. App: finish, confirm the ring advances.
10. App: confirm the next day is **locked until tomorrow**.
11. App: check Progress — the session, the calendar dot, the pain reading.
12. Portal: open that patient and confirm the session appears with the same numbers.
13. App: switch to **Light**, walk every screen again.

---

## Sign-off checklist

- [ ] A1 Sign-up and onboarding
- [ ] A2 Returning login
- [ ] A3 Choosing a programme
- [ ] A4 Home
- [ ] A5 Sessions (check-in, player, rating, resume)
- [ ] A6 One session per day
- [ ] A7 Progress
- [ ] A8 Wallet
- [ ] A9 Booking
- [ ] A10 Alerts
- [ ] A11 Profile and editing
- [ ] A12 Appearance
- [ ] A13 Layout and devices
- [ ] B1 Portal login and roles
- [ ] B2 Exercises and approvals
- [ ] B3 Programmes, levels, days
- [ ] B4 Patients
- [ ] B5 Responsive
- [ ] C Full run-through

**Tester:** ________________  **Build:** ________________  **Date:** ____________
