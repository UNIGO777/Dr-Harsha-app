# Design brief — The Exercise Player

**Sanchara** · medically supervised movement, from Dr. Harsha KJ's Lifestyle &
Prevention Centre

Paste this whole document into your design tool. Read the context before the
specification — the constraints only make sense once you know who this is for.

---

## 1 · Who you are designing for

Picture her precisely, because every decision below follows from her.

**Lakshmi is 52.** Her lower back has hurt for eleven months. She has seen a
physiotherapist, who has prescribed a programme through this app. It is 6:40am.
She is on a yoga mat on her bedroom floor, still in yesterday's t-shirt, before
the household wakes up. Her phone is propped against a water bottle about a
metre away, tilted slightly, screen glare from the window.

She is **not a gym person.** She has never counted a rep in her life. She is
slightly afraid of making the pain worse. She wants to do this correctly, get it
over with, and be told she did it right.

She will do this every morning for ninety days, or she will quit in week two.
Which of those happens is largely a design problem.

**Three things follow from Lakshmi:**

- She cannot see small text. The phone is an arm's length away and her reading
  glasses are on the bedside table.
- Her hands may be on the mat, mid-position, when she needs to tap something.
  She might be lying on her back looking up at a screen at an angle.
- Every interaction happens **while her body is already committed to a
  position.** She cannot browse. She cannot read a paragraph. She can glance.

## 2 · The feeling

> **A calm clinician kneeling beside you on the mat.**

Not a coach. Not an app. A person who knows exactly what they're doing, is not
in a hurry, and is not impressed or unimpressed by you.

**Warm, but clinical.** Precision with a heartbeat. The information is exact —
this many reps, this much rest — but the tone around it is gentle. Think a good
physiotherapy room: clean, uncluttered, natural light, one plant, nothing
shouting.

**Certain.** Lakshmi is anxious about doing it wrong. The interface should never
look uncertain, never offer six ways to do something, never ask a question it
could answer itself.

**Unhurried.** Nothing pulses urgently. Nothing counts *down* aggressively.
Rest is not dead time to be skipped — it is part of the treatment, and should
feel like it was given to her, not endured.

### What this is emphatically not

This is medical care, not fitness content. Avoid, deliberately:

- Flames, trophies, lightning bolts, medals, confetti cannons
- "CRUSH IT", "BEAST MODE", "NO EXCUSES", exclamation marks generally
- Red progress rings, red timers, red anything that isn't a safety warning
- Streak pressure, leaderboards, comparison to other patients, social anything
- Hard-edged blacks, neon gradients, glassmorphism, aggressive drop shadows
- Stock photography of athletic twenty-somethings
- Any implication that stopping early is failure

If a screen would look at home in a supplement advert, start again.

---

## 3 · Where this screen sits

The patient has already: opened the app → seen today's session → completed a
**pain check-in** (rating each painful area 0–10) → been allowed to start.

They are now inside the session, working through **3–6 exercises**, one at a
time. This screen is where 95% of the session's minutes are spent. It is the
single most important screen in the product.

When they finish the last exercise the session ends, their day is marked
complete, and tomorrow's is locked until the calendar rolls over.

---

## 4 · Anatomy

The screen divides roughly **in half**.

```
┌─────────────────────────────────────┐
│  ‹        EXERCISE 2 OF 5           │   chrome: back + position
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░    │   progress across the session
├─────────────────────────────────────┤
│                                     │
│                                     │
│         THE DEMONSTRATION           │   ~half the screen
│         (looping video)             │
│                                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         THE WORK                    │   ~half the screen
│    (changes by state — §5)          │
│                                     │
│         [ primary action ]          │   thumb zone
└─────────────────────────────────────┘
```

**The top half is reference.** A short silent clip of the physiotherapist
demonstrating the movement, looping continuously. Real footage of a real
clinician on a real mat in a real room — not an illustration, not a 3D avatar.
It answers "am I doing this right?" and nothing else.

**The bottom half is the work.** It is the only part that changes, and it must
be readable and reachable without moving her body.

The video **never disappears entirely** while she is exercising — she may need
to check her form mid-set. It may shrink. It may not vanish.

---

## 5 · States

Design **all five**. The transitions between them carry as much weight as the
states themselves.

### 5.1 · READY

She has arrived at this exercise and hasn't begun.

Must contain:

- **Exercise name** — large, unambiguous ("Cat-Cow Stretch")
- **One line of guidance** — what this is for, in plain language. Not a
  paragraph. "Loosens the lower back before you load it."
- **Rep choice — 5 · 10 · 20.** Three options, one preselected. This is the
  most important control on the screen; treat it as such. She should be able to
  hit it without looking carefully.
- **Start** — one primary action, unmissable
- Any warning that applies (see 5.6)

Design question for you to answer: *how do you make choosing 5 feel like a
legitimate clinical choice rather than giving up?* Someone in pain choosing the
smallest number should not feel judged by the interface. This matters more than
it sounds.

### 5.2 · ACTIVE

She tapped Start. She is doing the movement now.

- **The rep count is the hero.** Enormous. Legible from a metre with bad
  eyesight and screen glare. This is the single largest element in the app.
- Progress toward the target must be **instantly graspable** — "7 of 10"
  understood at a glance, without reading. Consider whether the count goes up
  or down, and be able to justify it.
- **Mark complete** — always reachable by one thumb, never accidentally
  tappable mid-movement
- The video keeps looping
- Everything else recedes. This state should be quieter than READY, not busier.

Design question: *does the app count her reps, or does she?* If it counts, at
what pace, and what happens when she falls behind? If she counts, what is she
tapping and how often? Show your answer; this is the crux of the screen.

### 5.3 · COMPLETE

A beat of acknowledgement. Two seconds, not a ceremony.

Warm, quiet, certain — "yes, that was right." A held breath, not a fanfare.
No confetti, no trophy, no score. She did a normal thing correctly.

### 5.4 · REST

**30 seconds** before the next exercise begins **automatically**.

- Time remaining, clearly
- **What's coming next** — name and a thumbnail, so she can prepare her body
- Something calming to rest against: a slow breathing rhythm, a gentle
  expansion and contraction, a settling. **Drawn, not audio.** No music files,
  no sound, nothing linking to another app or service. It must work in
  aeroplane mode.
- **Skip** if she's ready early · **Pause** if she needs longer
- At zero, the next exercise begins on its own

Rest should feel like **permission**, not delay. This is the state most likely
to be designed badly and it's the one that teaches her that recovery is part of
the treatment.

Design question: *what does someone actually look at for thirty seconds?* A
number ticking down is boring and makes 30s feel like 90s. Solve this.

### 5.5 · SESSION COMPLETE

Last exercise done. Brief, warm, and it hands her back to her day. She has
things to do; do not detain her.

### 5.6 · GENTLE MODE (a real state, please design it)

When the patient reports **moderate pain** at check-in, the server withholds
loaded exercise and gives only stretching and mobility work. The screen must
say so — otherwise a shorter session reads as a bug.

This needs a **calm, non-alarming** treatment. She is already worried about her
pain; the interface confirming it must not frighten her. Amber, not red. "We've
kept today gentle" — not "WARNING".

---

## 6 · Motion

Motion here is functional, never decorative.

- **Slow.** Nothing snappier than 200ms; state changes 300–400ms. This app
  breathes out.
- **Easing:** gentle ease-in-out. No bounce, no spring, no overshoot. Nothing
  elastic. The interface does not bounce because Lakshmi's back does not bounce.
- **The rep counter** is the one place a little life is allowed — a soft scale
  or settle as the number changes. Make it feel like a count, not a flicker.
- **Rest breathing** should be genuinely slow: roughly **4 seconds in, 6
  seconds out**. The longer exhale is what actually calms the nervous system —
  do not make it symmetrical because it looks neater.
- **Respect reduced-motion.** Some patients have vestibular conditions.
  Everything must remain usable and calm when animation is off — design that
  version too.
- No parallax. No auto-scrolling. Nothing that moves when she didn't ask.

---

## 7 · Visual system

Use the app's existing language — this screen must sit inside it, not next to
it.

**Colour**

| Role | Light | Dark |
|---|---|---|
| Canvas | `#FAFAF8` | `#0B0B0C` |
| Card / raised | `#FFFFFF` | `#161618` |
| Input fill | `#F2F2F0` | `#1C1C1F` |
| Text primary | `#111214` | `#FFFFFF` |
| Text secondary | `#54565C` | `#B8B8BE` |
| Micro label | `#75777E` | `#9A9AA0` |
| **Accent (mint)** | `#0E9E74` | `#4FE0AC` |
| Warm (amber) | `#B5761A` | `#F5C46B` |
| Danger | `#C4453C` | `#E5675F` |
| Hairline | `#E4E4E2` | `#26262A` |

Mint is the brand. Amber is for "take care" moments — gentle mode, a long rest.
**Danger red appears only for genuine clinical safety warnings** and must never
be used for a timer, a counter, or progress.

Both themes are first-class. The app follows the system setting by default and
patients genuinely use both — a 6am session in a dark bedroom, a 4pm one in
sunlight. **Design both. Neither is an afterthought.**

**Type** — Inter throughout (regular / medium / semibold / bold). One typeface,
separated by weight and size. Micro labels are uppercase with generous letter
spacing (~1.6). Body text never below 13px; anything Lakshmi must read at
distance, far larger.

**Form** — 20px radius on cards, 16px on inputs, full pills for buttons. Primary
buttons ~60px tall, full width. Hairline borders rather than shadows; this
system is flat and calm.

---

## 8 · Constraints (non-negotiable)

- **Thumb zone.** Every action she needs mid-exercise sits in the lower third.
- **Minimum 48px tap targets.** This audience includes arthritic hands and
  reduced grip. 60px for anything used mid-movement.
- **Arm's length legibility.** Assume one metre, imperfect eyesight, glare.
- **No external content.** No web views, no streaming, no third-party media, no
  links out. Fully functional offline — the video is the only network asset and
  it may be cached.
- **Android edge-to-edge.** Content must clear the gesture bar at the bottom
  and the status bar / notch at the top. Show your safe areas.
- **Screen sizes:** design at **390 × 844**. Then show what happens at **360 ×
  640**, where a true half-and-half split stops being viable — this is a real
  device class for this demographic, and "it scrolls" is not an answer for a
  screen used mid-movement.

---

## 9 · Edge cases (design at least four)

These are where the screen actually falls over. Pick the ones you find most
interesting.

1. **No video** — some exercises have no clip yet. What fills the top half so
   it doesn't look broken?
2. **A long exercise name** — "Standing Quadriceps Stretch with Wall Support"
3. **Interrupted** — she takes a phone call mid-set and returns four minutes
   later. What does she come back to? (Do not lose her place.)
4. **She stops early** — she can't finish 10. How does she record 6 without the
   interface making it feel like failure? *This is the most important one.*
5. **One exercise only** — the session progress bar with a single segment
6. **Very long session** — 8 exercises; does the progress indicator still work?

---

## 10 · Give me five directions

**Do not give me five colour variations of one layout.** Vary the underlying
idea. For each, one or two lines on *why it suits Lakshmi specifically*.

**A · The Clinic Card**
Video and controls as two distinct cards floating on the canvas, clearly
separated by whitespace. Ordered, calm, obviously clinical. The safe choice —
show me the best possible version of it.

**B · The Window**
Video bleeds edge-to-edge to the screen borders; controls rise over it on a
solid sheet that grows taller as the state advances (small in READY, dominant
in ACTIVE). Immersive; the movement fills her view.

**C · Counter-First**
The moment she starts, the rep count takes the screen and the video shrinks to
a small persistent reference in a corner. Argues that once you know the
movement, you need the number, not the demonstration.

**D · The Rail**
Session progress as a vertical spine down one edge rather than a bar across the
top, showing all exercises at once — where she's been, where she is, what's
left. More context, less mystery about how much remains.

**E · Your own**
Something I haven't thought of. Take a real position on what matters most in
this moment and design from it. This is the one I most want to see.

---

## 11 · Deliver

- All **five states** for each direction (READY · ACTIVE · COMPLETE · REST ·
  GENTLE MODE)
- **Light and dark** for whichever direction you think is strongest; light-only
  for the others
- At least **four edge cases** from §9
- **Reduced-motion** variant of your strongest direction
- A short note per direction: the idea, why it fits, what it trades away

Annotate anything non-obvious. If you deviate from this brief, say where and
why — a good argued deviation is more useful than obedient mediocrity.

---

## 12 · How I'll judge it

1. **Can Lakshmi use it from a metre away, mid-stretch, without her glasses?**
   Everything else is secondary.
2. **Does it feel like care rather than fitness?** Show it to someone in pain
   and watch their shoulders.
3. **Does the rest state make her feel looked after rather than delayed?**
4. **Does finishing 6 reps out of 10 feel acceptable?** If the design shames
   her, she quits in week two, and the clinical outcome is worse than if the app
   had never existed.
