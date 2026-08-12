# Revision — the ACTIVE (exercise in progress) screen

The other four states are approved as-is. This one needs another pass.

Keep everything from the original brief: Lakshmi (52, on a mat at 6:40am, phone
propped a metre away, no reading glasses), the mint/amber palette, Inter, calm
clinical tone, no fitness-app energy.

---

## What's wrong with the current version

**1 · The video is too small and the body is cropped.**
It occupies roughly 37% of the screen, not half — and the demonstrator's head is
cut off at the top edge. This is the real failure. The only reason that video
exists is to answer *"am I doing this right?"*, and a patient cannot check her
spine, neck and hip alignment against a body she can only partly see. A cropped
form video is worse than no video, because it invites her to copy a movement she
can't fully see.

**2 · Pause and skip are at the top of the sheet.**
They sit at roughly 62% screen height, top corners of the control sheet. She is
on all fours on a mat. That is the hardest place on the screen for her to reach,
and these are precisely the controls she needs *mid-movement*, when she can least
afford to shift her weight and reach up.

**3 · The rep ring is mostly empty.**
A large circle with a number floating in the middle, at the exact centre of the
screen — the most valuable space available — and most of it is dead. Either that
space earns its place or the ring gets smaller and gives the space back to the
video.

**4 · The hierarchy is competing.**
"CURRENT SET", the exercise name, two icon buttons, a ring, a label, and a
primary button — seven things. ACTIVE should be the *calmest* state in the flow,
not the busiest. She already knows what exercise she's doing; she chose it thirty
seconds ago.

---

## What this screen must do

In priority order. If something doesn't serve one of these, remove it.

1. **Show the full movement, continuously.** Whole body in frame, uncropped,
   looping, large enough to check form at a metre.
2. **Say where she is** — 7 of 10 — readable in a glance, without focusing.
3. **Let her finish** with one thumb, without changing position.
4. **Let her stop or pause** without hunting.

Everything else is decoration.

---

## Constraints for this pass

- **Video: at least 50% of the screen height**, and the demonstrator's **whole
  body must be in frame.** Never crop the head or feet. If the source clip is
  portrait, use it portrait; letterbox rather than crop.
- **All controls in the bottom third.** Pause, skip and Mark Complete are all
  reachable by a thumb without her lifting a hand off the mat.
- **The rep count must survive glare and distance.** Assume 1m, no glasses,
  morning sun on the screen.
- **Mark Complete must not be tappable by accident.** She may brush the screen
  mid-movement. Give it separation, or weight, or both.
- Keep the top session-progress bar (exercise 2 of 5).
- Both light and dark.

---

## Give me three options for this screen only

**A · Video-dominant, minimal overlay.**
Video takes 60–65%. Reps and the primary action ride over the bottom of it on a
translucent scrim rather than a solid sheet, so the frame is never occluded.
Argue whether text over video stays legible — and prove it with a real still.

**B · Video-dominant, compact sheet.**
Video at a clean 50%. The control sheet below is *shorter and denser* than the
current one: the rep count and Mark Complete only, transport controls demoted to
small icons at the very bottom edge, in the thumb zone.

**C · Reps in the frame.**
Kill the ring entirely. The rep count sits as a large numeral in a bottom corner
of the video itself, the way a stopwatch overlays a broadcast. Video gets almost
the whole screen; the only chrome is Mark Complete.

For each: one line on what it trades away.

---

## Two questions to answer in the design

**Who counts the reps?**
If the app counts on a timer, what happens when Lakshmi is slower than the timer
— does the number run ahead of her body? If *she* taps each rep, is that
realistic for someone on all fours with both palms on a mat? There is a third
answer: **don't count at all** — show the target, and let Mark Complete be the
only interaction. Show me whichever you'd defend, and say why.

**How does she record 6 of 10?**
She can't finish. Today her back is worse than she expected. She must be able to
stop at 6 and have that recorded honestly — the clinician needs the real number,
not the prescribed one — **without the screen making it feel like failure.**
This is the single most important interaction in the app. If the design shames
her here, she stops opening it, and the clinical outcome is worse than if she
had never installed it.

Do not solve this with a modal that asks "are you sure you want to quit?".
