# Character preview

Walk/hammer character based on `context/Design/animation2.mp4`, the earlier `animation.mp4`, and the two supplied `public/images/character-*-facing.svg` poses. It runs on the portfolio hero CTA at `/` and remains available as a separate study at `/character-preview`.

## Review

Run `npm run dev` and open [the portfolio](http://localhost:4321/) or [the isolated study](http://localhost:4321/character-preview).

- Without hover: repeat drawing A (upright foot in front of the face), drawing B (outer foot raised, opposite leg planted behind), then a short feet-down contact drawing seen in `animation.mp4`. Poses use hold keys. The cube stays upright with a one-pixel body bob and a shoulder-carried hammer. Walk budgets vary from 1.4-3.6 seconds and rests from 0.95-2.4 seconds, sampled afresh each time. Edges can shorten a walk. Patrol speed stays at 62 CSS pixels/second and its step cycle stays at 417ms. During rest, three held poses shift weight back/up, forward/down, then toward centre. Their 200/233/233ms holds give a roughly 667ms loop, with about 3 CSS pixels of lateral travel and a 1.5px dip. Both soles and ankles stay fixed; calves bend to follow the upright body and carried hammer.
- Enter the CTA: immediately interrupt walking/resting, turn and rush toward the cursor. Keep the normal walking poses and 417ms step cycle; only horizontal travel accelerates to 220px/s. Arrive, plant both feet for about 120ms, then repeat the three held hammer poses (500ms per cycle).
- Move inside the CTA: interrupt hammering, rush to the latest horizontal target and plant again before resuming the hammer loop.
- Leave: finish the current strike through recovery, then restart the irregular patrol. Leaving during a rush or planted pause cancels that approach immediately.
- Tap or activate by keyboard: one strike, without navigation.
- The study has a manual pause button. Both pages honor reduced motion, pause offscreen/in hidden tabs and keep a static error fallback.

The hero keeps its 305px desktop / 190px mobile CTA width, with 64px above it for hammer clearance. The portfolio has no inline pause control; manual pause remains in the study. Navigation and CTA destinations remain mocks. There is no audio or particle effect.

## Rebuild

Requires Python 3 and Rive CLI on PATH; no Python dependencies. Verified using Rive CLI 1.5.0.

```sh
npm run rive:build
npm test -- --workers=1
```

With `npm run dev` already running on port 4321, also run `npm run test:dev` to exercise that exact development server. Production checks alone do not detect a stale development dependency cache. If Rive/GSAP module requests return `504 Outdated Optimize Dep`, restart with `npm run dev -- --background --force` and reload the page. Script startup errors now leave the static character visible and show a reload message instead of an endless loading label.

Use one browser worker for motion QA. Concurrent runs produced inconsistent walking captures; run the production suite serially.

The build script parses the supplied SVG paths, normalizes each pose to a 72-unit body width and shared foot baseline, generates `scene.rml`, compiles it through the CLI and copies the resulting `.riv` into `public/animations/`. It also exports `public/animations/character-preview.svg` using the same 240-unit artboard, body centre and y=212 foot baseline. This static fallback has the same scale and placement during loading, reduced motion and failure; the original supplied SVG files stay intact. Two raised pixel-art drawings use the source leg colors and mirror for the opposite direction; the source feet-down drawing supplies the landing beat. Soles are 6 artboard units (3 CSS pixels) thick, and the back calf overlaps the cube so it stays connected at actual size. Opacities use hold keys; walking has no vertex deformation or leg rotation curves. Chopping uses the original legs. Idle deforms only the upper calf vertices; the bottom eight artboard units, including ankle vertices, remain fixed. Three additional pixel-art tool drawings follow the supplied blade silhouettes. Their light-grey blade tint also appears in the walking, idle and static SVG poses. Three compact stepped arm drawings follow the reference poses. Two short grips wrap perpendicular to a single straight shaft, with the near arm folded above the cube and the far arm stepping down its side. Charcoal shafts start inside each head and render above the arm/body: shallow diagonal during wind-up, vertical overhead, horizontal at impact. Grip centres and grip angles come from the same shaft axis. Both green hand grips wrap over the shaft; the head covers the overlapping socket join. Original SVG geometry remains unchanged; only its white blade fill is tinted. Original top-level uniform transforms cancel during normalization. Unexpected path commands and structural changes fail explicitly rather than being approximated.

`scene.rml` is generated: change source SVGs or `generate.py`, then rebuild. The reproducible source and exported runtime asset are kept; CLI logs/captures under `build/` are ignored.

## Runtime contract

- Artboard: `Character`, 240 x 240; foot baseline y=212.
- State machine: `Character Controller`.
- Bound view model: `CharacterControls`, number `pose`.
- Values: 0 idle-right, 1 walk-right, 2 hammer-right, 3 idle-left, 4 walk-left, 5 hammer-left, 6 rush-right, 7 rush-left. The six existing values are preserved.
- Idle: 40 frames / 60fps, with hold keys at frames 0, 12 and 26. The three torso/tool offsets are (3, 0), (-3, 3), (0, 3) artboard units for the left-facing rig; the right-facing rig mirrors x. Upper calf vertices follow both axes, with fixed ankles, soles and actor root. Walking/chopping restore the original calf geometry.
- Rush: matches walking's 25 frames / 60fps (~417ms), with the same three drawings and holds: A at frames 0-8, B at 9-15 and contact at 16-24. Only horizontal movement speeds up, from 62 to 220 CSS pixels/second during cursor pursuit.
- Walk: 25 frames / 60fps at 62 CSS pixels per second. A holds for frames 0–8 (150ms), B for 9–15 (~117ms), and contact for 16–24 (150ms), giving a ~417ms cycle. Both raised drawings lift the torso/eyes/carried hammer by 2 artboard units (1 CSS pixel); contact lowers them. Feet remain on the shared baseline. Entry into walking snaps without a crossfade. GSAP moves the wrapper smoothly along the button. Hammer: 30 frames / 60fps. Behind-head holds for frames 0–9, overhead for 10–19, and impact for 20–29. Tool drawings, arm and body squash use hold keys, without interpolated swing frames. Contact fires at frame 20; single strikes finish at frame 29. All state changes snap. The controller holds a 120ms planted idle pose between pursuit and hammering.
- Outgoing events: `hammer-impact` instantly translates the entire CTA and its text down 7% of the button height, then returns it in 200ms with a restrained spring (under 0.3px overshoot at the current 70px height). Button dimensions and angle stay fixed. `hammer-recovered` ends a single strike or completes a pending departure before patrol resumes.
- Shared artwork/bootstrap: `src/components/ButtonCharacter.astro`, used by `src/components/Hero.astro` and the study page. Each page has one `[data-character-stage]`, a stable `.button-shell`, a native `[data-character-button]` and status; the pause control and motion readout only appear in the study. The responsive initial artwork position is centred before JavaScript loads.
- Browser controller: `src/scripts/character-preview.ts`. Rive owns eight pose timelines; the controller owns patrol/rush/plant/hammer phases, random interval budgets and pointer targets. GSAP owns horizontal placement and the native button's impact translation. The hero entrance moves the outer CTA group. Its separate click spring in `src/scripts/hero.ts` scales only the inner `.work-button-surface`, so it cannot overwrite the hammer translation; the stable native button remains the hit target. The study keeps its plain button treatment. Impact regression captures use hover to isolate contact from intentional click feedback.
- Cursor targets follow the character centre, clamped 34px from either CTA end. A 2px movement tolerance prevents jitter. Input uses the stable button shell so impact transforms cannot cause false departures.
- Rive runtime and both WASM variants are served locally; no CDN or Rive account is needed for this script-free file.

The pinned Rive 2.x runtime supports the event callbacks used here but marks them deprecated. There is a code `shortcut:` comment: migrate contact/recovery reporting to bound trigger observers before adopting Rive 3. View-model state selection already uses the modern API. This limitation does not block the current working preview.

## Timing evidence

Rechecked `context/Design/animation.mp4` at its native 30fps on 2026-10-16. In the first 2.5 seconds, complete raised/contact cycles span about 400–433ms. The two-feet-down drawing occurs inside the walk, in addition to longer idle pauses. Recording quantization limits individual measurements to about 33ms.

Rechecked the first second of `animation2.mp4` at native 30fps for idle timing. The recorded poses shift by about four source pixels horizontally and two vertically across a roughly 47px body width. The clearest holds last about 6-7 recording frames (200-233ms), giving an approximately 0.63-0.67 second cycle. The preview uses three holds over 40 runtime frames and mirrors the shift by facing direction.

The swing section of `animation2.mp4` at 6.4–8 seconds holds each of the three supplied poses for about 4–5 recording frames (133–167ms), producing roughly a 467–500ms loop. The preview uses three equal 167ms holds.

Rechecked the CTA response in that segment: its roughly 58px height stays fixed while the top edge drops from y=119 to y=123, about 7%. Each pulse returns within roughly six recording frames (200ms). The preview scales this translation with button height and starts it on Rive's contact event.

Body tracking over that segment gives ~79.9 source pixels/second and a mean body width of ~46.7 pixels. Scaling to the preview's 36px body gives ~61.6px/s, rounded to 62px/s. The old 133ms A/B-only loop and 28px/s travel were not matched to this recording.

Rewatched cursor pursuit around 7.8-8.6 seconds of `animation2.mp4` at native 30fps. The character covers more distance while retaining held walking poses. The rush timelines now match the normal 25-frame walking cycle; pursuit changes horizontal travel speed only.

## Verification

CLI compilation and native/browser frame captures check geometry and contact. Browser checks verify three held drawings in each direction, measured cycle duration, visible ink across the bottom three CSS rows of each sole, an upright boot near the lower face, a planted foot, small body bob, autonomous movement with varying walk/rest lengths and constant walking speed, three held idle drawings, lateral weight shift and dip/rise with changing calves and identical sole pixels, synchronized body/tool movement on both axes, direction reversal, rest interruption, immediate cursor-facing pursuit, unchanged walking cadence during faster cursor pursuit, a planted/stationary hammer position, rapid retargets, completion of a departing strike, cancellation while approaching, exactly three held hammer drawings in both directions, a roughly half-second hammer cycle, distinct behind-head/overhead/impact blade positions, visible shafts connected to the head, vertical/horizontal shaft bounds and a shallow wind-up angle, plus both hand colours in contact with the shaft in every hammer pose, light-grey blades without pure-white pixels, head lift/body squash, repeated contact, walking after hover, pause, one-shot touch/keyboard behavior, reduced-motion changes and load failure. Actual-size browser crops were inspected on the white page and black button. The existing hero checks run alongside these regressions.

The character regression suite runs against both pages. Hero checks also cover hammer clearance, CTA sizing and static behavior at 360/402/768/1440px and without JavaScript. Actual phone/Safari behavior and performance have not been measured; mobile checks use Chromium touch emulation.
