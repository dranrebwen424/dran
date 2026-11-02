# Dranreb Portfolio

## Web3Forms contact delivery - 2026-11-02

Replaced FormSubmit with Web3Forms using the owner's public access key in `Contact.astro`. The existing modal submits Name, Email and Message directly from the browser to `https://api.web3forms.com/submit`; there is no server proxy or mail credential. The form includes Web3Forms' subject/from-name fields and hidden botcheck. `contact.ts` sends multipart FormData with an Accept JSON header, avoiding a preflight and the URL-encoded redirect documented by the provider. It preserves validation, duplicate-send protection, pending controls, the 20s timeout, draft recovery and lifecycle cleanup. Only an HTTP success with boolean `success: true` clears the message. Provider errors are displayed as plain text; network/CORS failures keep the generic retry/email fallback.

The owner registered localhost for testing. Before deployment, update the website/domain in Web3Forms and, if domain restrictions are enabled, allow the production hostname. The access key is intentionally public and tied to the recipient configured in Web3Forms. See [AJAX integration](https://docs.web3forms.com/getting-started/examples/ajax-contact-form-using-javascript), [FormData/CORS guidance](https://docs.web3forms.com/getting-started/troubleshooting) and [public keys/domain restrictions](https://docs.web3forms.com/getting-started/faq).

Validation: production build/type checks pass, as do the focused form tests for the new multipart payload, subject/key, trimmed Unicode/multiline text, botcheck, pending lock, safe provider errors, strict acknowledgement, retry and lifecycle handling. Modal, touch and no-script checks also passed during this migration. **Live delivery is verified by the owner:** after refreshing localhost in normal Chrome and submitting the form, they confirmed “Message sent and email received”. Automated tests from `http://localhost:4335` were blocked by Web3Forms' server/automation protection; a read-only preflight diagnostic returned HTTP 403 requiring client-side use. This did not prevent the owner's normal browser submission. The implementation runs in the client; do not add a server proxy to work around the test-environment restriction. The automated failure capture (`output/contact-web3forms-live-result.json` and `.png`) predates the successful owner test. The full suite, other engines, physical devices and production-domain delivery were not checked.

## On-site contact form and square modal - 2026-11-02

The section's Get in touch action now opens a dark, square modal with Name/Email fields, a Message box and Send message, followed by Email/GitHub alternatives. Labels interrupt the thin input outlines to follow the supplied reference. Name/Email share a desktop row and stack on small phones; the close control stays reachable while scrolling. Keyboard focus wraps across the current enabled form controls and links. Existing modal dismissal, native email fallback and Contact decorations remain.

The static site sends JSON with fetch to FormSubmit's AJAX endpoint for `dranrebwen2505@gmail.com`, keeping visitors on the page. Name/email/message are required, whitespace-only fields are rejected, a honeypot filters automated submissions, and concurrent sends are prevented. Inputs remain intact after provider rejection, malformed/offline responses, timeout or interrupted navigation. Only an HTTP success with an explicit boolean/string true acknowledgement clears the draft and shows success. Pending requests are cancelled on pagehide; restored pages can retry safely.

**Superseded delivery setup:** the owner later confirmed FormSubmit activation, but live submissions continued to time out. The Web3Forms integration above replaces this provider. No real FormSubmit inbox delivery was verified.

Validation: production build/type checks and seven focused Chromium cases pass. Tests mock every FormSubmit request, so no real emails were sent. Coverage includes desktop/phone/short-screen layout at 320/390/768/1440px, label/border geometry, focus trapping, native validation, trimmed payloads, duplicate-send protection, confirmed success, rejected/malformed/offline responses, retry, timeout, page lifecycle, existing Rive/Contact interactions, touch and no-script email access. Captures: `output/contact-form-1440.png`, `output/contact-form-390.png` and `output/contact-form-alternatives-mobile.png`. Live delivery, the full suite, other browser engines, physical devices and deployment were not checked.

## Reversible Developments handoff - 2026-11-02

Rewatched the handoff closely. Project names and the arrow/View group now slide and grow in for the active project, then reverse out as the next project becomes active. Scrolling upward reverses the same handoff: Liquifi returns while DILG-Survey retreats. Shared ScrollTrigger boundaries at the next card's center reaching 65% of the viewport make both transitions change direction together. This replaces the one-time reveal; interrupted animations reverse from their current position. Normal page scrolling, static previews and preview-only borders remain.

The reference arrow's measured pulse repeats about every .7 seconds. The arrow now uses a quicker rightward pulse with a dedicated slot before View, and runs only for the active project while the page is visible. Keyboard focus centers/selects its project and shows its labels immediately. Reduced-motion/no-script visits keep all labels visible with static arrows; lifecycle restoration derives the active card from its actual scroll position.

Validation: production build/type checks and six focused Chromium cases pass across final runs. Frame checks cover repeated down/up handoffs, outgoing and incoming transforms/opacity, active-arrow motion, responsive layout, native keyboard/new-tab links, reduced-motion cleanup, lifecycle, Contact/Home navigation, touch and no-script access. Additional rapid mid-animation reversals pass at 1440px and 390px, settling on the correct project without arrow/text overlap. The lifecycle fixture returns to the active project after preference switching instead of assuming the old scroll position. Inspected captures: `output/developments-active-{0,1}-{1440,390}.png`; close reference: `output/developments-handoff-close.png`. The full suite, other browser engines, physical devices and deployment were not checked.

## Developments clarification: preview border and side entrances - 2026-11-02

The user's latest clarification supersedes the preceding Developments scroll sequence. Restored normal page scrolling and the original row spacing/layout: removed sticky holds, extra scroll space, preview panning and scroll-driven scaling. Only the website preview has a subtle 1px gray border; the surrounding project row has no border or padding. Existing preview hover zoom and the generic card entrance remain.

Project names and the `arrow -> View` group now enter from the left when their card reaches the viewport. The arrow is before View and continuously nudges right/back while the card is visible. Offscreen/hidden-page arrows pause, and reduced motion/no scripts show a static arrow. Keyboard focus completes the name/View entrance immediately. Match-media and page lifecycle cleanup remain; the existing Developments heading animation and native destinations are preserved.

Validation: production build/type checks and six focused Chromium cases pass. Checks cover preview-only borders, original spacing, normal scroll movement/no panning at 320/390/768/1440/1920px, actual desktop/mobile entrance frames and arrow motion/pause, keyboard destinations, reduced motion, lifecycle, Contact/Home navigation, responsive content, touch and no-script access. Rewatched/cropped the reference for the names and repeating arrow: `output/developments-label-reference.png` and `output/developments-arrow-reference.png`. Final visual captures: `output/developments-final-desktop.png` and `output/developments-final-mobile.png`. The full suite, other browser engines, physical devices and deployment were not checked.

## Developments scroll sequence and borders - 2026-11-02

Reviewed the user's 7.23-second reference. Developments now holds each project card near the viewport center while its existing screenshot pans from top to bottom, then releases it for the next project. The project title, View action and preview grow gently on approach and recede on exit. Native sticky positioning owns the hold; GSAP uses direct scroll progress for the image and emphasis, so reversing scroll reverses the sequence. Each card has a subtle 1px border using the existing border color. Responsive padding and preview height limits keep cards within short desktop/mobile viewports.

`web-projects.ts` owns this section's motion and retains its existing heading animation. The generic gallery fade no longer targets these cards. Reduced-motion/no-script visits show the ordinary static list, and preference changes/page lifecycle remove the extra scroll space and styles. Existing preview assets, native project links and hover feedback remain.

Validation: production build/type checks and five focused Chromium cases pass. Coverage includes both cards at 1440x1000, 1920x650, 390x844 and 320x700; native hold geometry, image progress/reversals, no stationary drift, scaling/borders, resizing, keyboard/new-tab destinations, reduced-motion cleanup/re-enable, page lifecycle, Contact/Home navigation, responsive content, touch and no-script access. Separate direct-link checks pass for #contact and #web-projects. Desktop/mobile captures were inspected: `output/developments-scroll-1440.png` and `output/developments-scroll-390.png`; reference: `output/developments-reference-sequence.png`. The full suite, other browser engines, physical devices and deployment were not checked.

## Video reference: hover and mouse-out shuffle - 2026-11-01

Reviewed the supplied `Screen Recording 2026-10-20 220741.mp4` around 8 seconds and its later mouse-out. The header Get in touch and About Certificates/Resume now scramble the entire label immediately, then resolve left to right at 60ms intervals. The same effect restarts on pointer exit, including during an unfinished entrance; keyboard focus/blur also play it. This supersedes the earlier slower letter-by-letter startup and immediate reset on mouse-out. Original label widths, accessible names, links and reduced-motion/visibility/page cleanup remain.

Validation: production build/type checks and six focused Chromium cases pass across the final runs. Actual frame/mutation checks cover both directions on all three labels, simultaneous scrambling and sequential restoration, stable dimensions/names, interrupted exits, desktop/mobile keyboard focus, reduced motion, header behavior, touch navigation, document links and no-script access. The updated regression fails against the previous effect. One header check raced a reduced-motion preference switch and passed on its isolated rerun; no header code changed. Reference crops: `output/button-reference-enter.png` and `output/button-reference-leave.png`. The full suite, other browser engines, physical devices and deployment were not checked.

## Header scroll behavior and button shuffle - 2026-11-01

Desktop Project now has a fixed-size chevron with an 8px gap. The top bar slides upward on downward scrolling and returns on upward scrolling, with a small movement threshold to avoid flicker. Open menus and keyboard focus keep navigation available. Desktop Hero sticky positioning fills the space below the hidden bar without a JavaScript counter-translation.

Header Get in touch and About Certificates/Resume share `ShuffleLabel.astro` and `button-shuffle.ts`. Each letter scrambles for 360ms; the next starts 180ms later. Original glyph widths and accessible names remain stable. Pointer exit, blur, hidden pages and reduced motion restore readable labels immediately; quick re-entry can restart. Native links and no-script text remain usable.

Validation: production build/type checks and 12 focused Chromium cases pass across the final runs. Coverage includes actual letter mutation timing, overlap and dimensions; cancellation/restart; reduced motion; header direction/menu/focus behavior on desktop/mobile; Project spacing/dropdown; responsive content/native destinations; stack reversals/short windows/breakpoints/Home anchors; About/smiley entrances; touch navigation; document pages and no-script access. Desktop/mobile captures were inspected. The full suite, Safari, Firefox, physical devices and deployment were not checked for this update.

## Native desktop stack and normal mobile scrolling - 2026-11-01

Revisited the supplied 4.73-second reference and replaced the scroll counter-translation with native CSS sticky positioning on desktop. Only the full-width shade opacity follows scroll progress. The static `#hero` wrapper preserves Home anchors; the visual `.hero` is sticky inside it. Short desktop windows can scroll to the Hero's bottom, and keyboard focus reveals a Hero control obscured by About. About's full-width white foreground also blocks pointer clicks through its gutters.

Below 768px, stacking, dimming and portrait scroll parallax are removed entirely. About text, smiley, timeline and button entrances remain. This supersedes earlier entries describing translated/scaled Hero layers and portrait parallax. Native-position checks cover rapid reversals, 768-1920px desktop widths, short windows, mobile widths through 767px, resizing, reduced motion and Home navigation. Captures: `output/native-stack-desktop.png` and `output/no-stack-mobile.png`.

## Scroll stack reversal fix - 2026-11-01

Reviewed the user's 5.3-second mobile recording and reproduced over 200px of Hero movement after scrollY stopped changing. The stack counter-translation and portrait parallax both had half-second scrub catch-up, which made the Hero chase the page and jump during reversals. Both now follow scroll progress directly. Existing scale/dimming, native section geometry, About reveals and reduced-motion behavior remain.

Validation: production build/type checks and four focused Chromium cases pass. A new regression failed before the fix with 218px of stationary-scroll drift; after the fix it verifies less than 2px of Hero drift and stable dimming/portrait offset through repeated down/up reversals at 364×800 and 1440×1000. Existing stack/Home navigation, About animation and no-script checks also pass. Reference: `output/stack-glitch-full-reference.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Draggable Subli carousel - 2026-11-01

Subli Folio now supports horizontal mouse/touch dragging from the rolling track's current position, with grab/grabbing cursors. Dragging pauses the loop and scrubs its existing animation, including seamless wrapping; ordinary taps/clicks still open the viewer. A completed drag suppresses accidental artwork activation. Touch vertical scrolling/pinch remain native, and reduced-motion/keyboard browsing use the existing scrollable originals. Resize, cancellation and pagehide release captures and listeners. No dependency or new pause control was added.

Validation: production build/type checks and five focused Chromium cases pass across the final runs, including both drag directions, loop wrapping/resume, reduced motion, resize cancellation, real CDP touch swipes and vertical scrolling, taps/viewer, keyboard access and no-script fallback. Touch capture transfer is explicitly handled to avoid cancelling a swipe when the gallery takes capture from the pressed card. Capture: `output/subli-drag-desktop.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Block smiley reference - 2026-11-01

The user's clarified pixel reference supersedes the previous round low-resolution face. Native Rive geometry is now a stepped outline with tall bar eyes and a block smile; blink/giggle artwork uses matching angular shapes. The shared 14-cell grid also generates the SVG fallback, and the runtime renders at 28px. Existing gaze, interaction, pop-in and About timing remain.

Validation: native asset rebuild, production build/type checks and three focused Chromium cases pass for actual animated pixels at DPR 1/2, resizing, exact fallback shape probes, interaction/pop timing and no-script access. Preview: `output/block-smiley-static.png`; live idle captures: `output/block-smiley-idle-{390,1440}.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Geometry timing, slower About reveal and pixel smiley - 2026-11-01

Portrait crown/cube/starburst now share the main Hero geometry entrance instead of appearing during the portrait wipe. About heading and paragraph reveal over roughly two seconds with softer easing; the smiley still waits for the heading to finish. Education and button reveals are slower too. The existing interactive Rive smiley now renders on a fixed 24px pixel grid, with nearest-neighbor scaling and a matching generated SVG fallback for reduced motion, loading errors and no-script access.

Validation: native Rive/fallback rebuild, production build/type checks and all 17 focused Chromium cases pass across the final runs, covering synchronized geometry, real smiley pixels and giggle animation at DPR 1/2, resizing, fallback rendering and existing interactions. Reveal assertions sample heading/subheader state together to avoid comparing different animation frames. Captures: `output/pixel-smiley-{390,1440}.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Video reference: full-width stack and About entrance - 2026-11-01

Reviewed the supplied 4.73-second recording. The dim layer now covers the full Hero section, including the outer margins, while the inner content recedes gently beneath About. A soft horizontal mask reveals the About heading and supporting copy in monochrome; the existing Rive smiley pops in only after the heading finishes. Certificates and Resume fade upward on entering view, and keyboard focus completes their reveal immediately. Timeline wipe, portrait entrance, Rive interactions, native anchors and reduced-motion/no-script behavior remain.

Validation: production build/type checks and all 15 focused Chromium cases pass, covering full-width dimming through 1920px, desktop/mobile text and smiley timing, button motion/focus, live Rive interaction and existing regressions. Reference frames: `output/stack-reference-contact-sheet.png`; implementation captures: `output/hero-about-stack-1920.png` and `output/about-copy-reveal-{390,1440}.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Portrait wipe and About scroll motion - 2026-11-01

The portrait now wipes from bottom to top at 45% of the headline entrance, with no animated opacity fade. Its geometry entrance, shatter interaction and parallax remain. A separate Hero visual layer recedes and dims as About rises over it; the section itself stays in normal flow so Home anchors and mobile scrolling remain accurate. Education content, including the line and circle, reveals once with a top-to-bottom wipe as it enters the viewport. Reduced motion and no-script visits show static content; page visibility and pagehide/pageshow cleanup remain supported.

Validation: production build/type checks and all 14 focused Chromium cases passed across the final runs. New checks cover wipe direction/timing and opacity, desktop/mobile stacking, Home navigation, timeline reveal timing and persistence, reduced-motion cleanup and no-script visibility. The timeline regression caught and corrected premature offscreen playback. Captures: `output/portrait-wipe.png`, `output/hero-about-stack-{390,1440}.png` and `output/timeline-wipe-{390,1440}.png`. Safari, Firefox, physical devices and deployment remain unchecked.

## Education timeline and desktop Project menu - 2026-11-01

The Education timeline ends inside its circle on desktop and mobile. Desktop navigation now has a native `Project` disclosure with a down chevron and the same category links as mobile, drawn from one shared list. Selection updates the section indicator and focus; Escape, outside interaction and resizing close the dropdown. Native navigation works without scripts. Existing entrance and header effects remain.

Validation: production build/type checks and all 11 focused Chromium cases passed across the final runs, including timeline geometry, desktop keyboard/selection/dismissal, mobile menu handoff, resizing and native no-script access. The carousel check now focuses its stable section target instead of depending on the heading entrance finishing first. Captures: `output/desktop-project-dropdown.png` and `output/about-timeline-{390,1440}.png`. Other browsers, physical devices and deployment remain unchecked.

## LCAT scale and section spacing - 2026-11-01

Resized and aligned the supplied LCAT phone beside staggered artwork rows, using the Figma desktop context and the user's latest screenshots. The phone keeps its overlap above the full-width grey background and aligns near the artwork's bottom. Grey now ends 24px below the brochure/poster row (16px on mobile); the following Subli Folio section supplies the white breathing room. Existing artwork links, viewers and animations remain.

Validation: production build/type checks and four focused Chromium cases covering 320–1920px layout, phone scale/overlap, artwork access, the grey-to-white transition, touch and no-script fallbacks. Desktop/mobile captures are in `output/lcat-vawc-*.png` and `output/social-subli-transition.png`. Other browser engines, physical devices and deployment remain unchecked.

## LCAT presentation and animation startup - 2026-11-01

Removed the blue radial glows and the visible Home/Contact shape pause controls and Subli carousel pause button at the user's request. Hover, keyboard, viewer, visibility and reduced-motion suspension remain. LCAT-VAWC now uses the supplied transparent `public/graphic-design/lcat-vawc/phone.png`, overlapping the artwork and the top of a full-width grey background that continues through the final Social Media artwork row and section spacing.

Fixed the portrait shapes freezing at their entrance scale: the renderer now observes the parent's visibility handoff as well as the shapes' own styles. A fresh-load draw-count regression failed before the fix and passes afterward without a click or resize. Production build/type checks and all nine focused Chromium cases pass, covering the overlapping mockup/background, no visible pause controls/glows, carousel, shape spacing, Rive, viewers, keyboard/touch, reduced motion and no-script access. Safari, Firefox, physical devices and deployment remain unchecked.


## Layout and motion adjustments - 2026-11-01

Home geometry now uses separate asymmetric positions for desktop, tablet and mobile, with gentler drift and clearance around the copy, button and character. The Rive smiley follows the About statement. All rendered Lottie decorations and the Contact particle field are removed; headline/stagger animations, the Rive characters, grid and interactive geometry remain.

Desktop work galleries now use narrow 24px gutters without a maximum-width cap and tighter section spacing. Contact spans the entire viewport. Subli Folio rolls continuously, pauses on hover, and has a manual pause button. Keyboard browsing, an open viewer, hidden/offscreen states and reduced motion stop the movement; no-script/reduced-motion layouts retain native horizontal browsing. Artwork viewers and original media links remain.

Validation: production build/type checks and all seven focused Chromium cases pass. Coverage includes 320/390/768/1024/1440/1920px layout, shape separation from other shapes/text/button/character, carousel rolling/hover/pause/loop/keyboard/viewer access, no Lottie requests or particle canvas, both Rive instances, contact focus, touch, reduced motion, no scripts and document pages. Updated desktop/mobile captures were inspected. Safari, Firefox, physical devices and deployment were not checked.


## Figma refresh - 2026-11-01

The current desktop (387:182) and mobile (691:694) Figma frames now guide the portfolio. Display headings use the supplied local Cold Warm font; supporting text remains Gilroy. The portrait and its interactions move into the hero, About becomes a statement and education layout, artwork uses the Figma collages, development links show local project previews, and the contact/footer use the new structure. Motion Graphics is removed from the page at the user's explicit request; its source and media remain available.

Existing headline entrances, staggered reveals, role morphing, Rive, Lottie, portrait shatter, geometry, media viewers and contact dialog remain. Contact reuses the hero's grid, geometric scene and Rive controller with independent state and unique SVG IDs. No dependencies or external services were added.

Reference exports: `output/figma-desktop-current.png` and `output/figma-mobile-current.png`. Figma was confirmed installed, but connector design tools were not exposed; the current frames were inspected/exported from the open Figma app. Implementation captures: `output/figma-implemented-desktop.png` and `output/figma-implemented-mobile.png`.

Verification: `npm.cmd run build`; `npx.cmd playwright test --config playwright.figma.config.ts` (build first). Five focused Chromium cases cover 320/390/768/1440px layout, local font/images, independent Rive/shape instances, dialog focus, touch navigation/viewers, reduced motion, no-script fallbacks, document pages and the standalone Rive study. Safari, Firefox, physical devices and deployment are not checked. Earlier visual-direction notes below are historical.


## Contact particle braces - 2026-10-23

The contact card now scatters soft blue-white particles across its background. Hovering the card or focusing its action gathers them into curly braces around the copy; leaving disperses them. Touch visitors can tap the card background to toggle the effect without intercepting links or scrolling. The field drifts continuously before hover and ripples subtly inside the formed braces. Following the supplied image, the braces trace broad, rounded, closed outlines with hollow centers; tighter particle placement preserves both contours. Their width scales down on mobile. A small pause control freezes ambient drift; user-triggered formation changes still work. Hidden/offscreen cards and an open contact dialog suspend animation; reduced motion keeps a static field, and no scripts or unavailable Canvas retain the original contact card.

Implementation: `src/scripts/contact-particles.ts`, the decorative canvas in `Contact.astro`, and two particle color tokens. No dependency, layout or contact destination changes. Production build/type checks and all 12 focused contact/particle Chromium cases passed after the outline update, including real particle-pixel concentration, separated contours with a hollow center, idle/hover motion, pause/resume, keyboard/touch input, 320-1440px resizing, hidden/offscreen suspension, reduced motion, BFCache and native no-script email access. Desktop/mobile captures were inspected. Temporary test server/config removed; the user's development server is preserved. Safari, Firefox, physical devices and deployment were not checked.

## Work refinements - 2026-10-23

Expanded Motion Graphics copy; Work headings now use .05em tracking. Numbered discipline labels are removed. Gallery thumbnails cover-fill their frames; enlarged viewers retain full-image fitting. Hero discipline shortcuts are hidden on mobile, where gallery corners reduce to 10px. Production build/type checks and a 360px browser inspection passed; the full browser suite was not rerun for these refinements. Earlier validation below applies to the prior refresh.

## Visual refresh - 2026-10-23

An Antigravity-inspired finish now carries through the existing portfolio: local Gilroy mixed-case headlines, stronger contrast, generous spacing, a softer grid, rounded galleries, pill actions and subtle hover/focus feedback. Hero discipline links make the existing work easy to explore. The new footer includes resume, GitHub and back-to-top links. Original artwork, projects, character, geometric interactions, viewers and contact destinations remain.

Gallery/contact surfaces reveal once as they enter the viewport. These short native animations pause in hidden tabs, cancel for reduced motion and clean up on pagehide. Content remains visible without scripts. No dependencies or externally hosted fonts were added.

Validation: production build and type checks passed. All 63 unique focused Chromium cases passed across the final runs, covering responsive layouts through 320-1440px, keyboard/touch navigation, gallery viewers, contact, document pages, font loading, spring calibration, visibility suspension, reduced motion and no-script access. The temporary test config/server were removed; the existing development server remains available. Safari, Firefox, physical devices and the complete unrelated test suites were not checked. Deployment remains pending. Existing Rive deprecation and bundle-size notices remain.

The section notes below predate this refresh; their earlier typography, corner styles and unstarted-footer status are superseded by the direction above.

Astro with strict TypeScript and static output. Hero and About are accepted, including document pages. Motion Graphics is complete and accepted (2026-10-19); Stage 6 Graphic Design is accepted; Stage 7 Subli Folio is accepted; Stage 8 Logo Folio, Stage 9 Website & Web-App and Stage 10 Contact are implemented for review. Home/About navigation is functional; Projects and View My Work link to Motion Graphics at the start of Work. Get in touch links to the Contact section. The refreshed desktop header replaces the utility icons with Get in Touch; mobile uses a three-line dropdown menu.

The top bar appears first while the 3D scene prepares, followed by the existing headline animation. As soon as the headline visually settles, the role line and CTA slide up together while the grid fades in and ripples. Each geometric shape zooms in with a staggered spring as soon as the role line and CTA finish entering, while the ripple continues. Reduced motion and back/forward restoration show the completed layout immediately; script failure leaves readable static content.

The hero's floating geometric motifs use an asynchronously loaded Three.js scene. Grab a shape to turn it and move it a little; release gives it momentum and a spring return. Nearby cursor passes gently nudge shapes in the direction of travel. Click/tap or keyboard activation still spins them; the small pause icon freezes ambient motion. Touch supports horizontal grabs while vertical swipes scroll. Different depths drive scale and scroll parallax wherever the page has scroll room. Reduced motion, unavailable WebGL and no JavaScript retain static SVG artwork.

## Top bar

The brand reacts to hover, focus or touch with one jump, a mirror flip and reverse flip in midair, then playful squishy rebounds and a shine across the full lockup. The Home/About Me/Projects selector has a subtle red/cyan lens fringe confined to both rounded ends of its active pill, with crisp labels. Get in Touch occasionally shines and pops into a black fill on hover/focus. Home/About/Projects and the Hero View my work CTA are native anchors; the two work links target #motion-graphics and work without JavaScript. Get in touch links to the Contact section. Below 768px, the CTA and pill are replaced by a three-line burger and a full-width white dropdown with staggered Home/About me/Projects/Contact rows. Projects expands to the five linked project categories; Contact links to the Contact section. The menu scrolls independently, closes on navigation/Escape/focus exit/resize, and honors reduced motion. Hidden-tab/BFCache cleanup is preserved.

## About portrait

Click or tap the SVG portrait to shatter that spot into textured triangular pieces; it tilts gently toward the hit, then reassembles. Focus Shatter portrait and use Enter/Space for a centered burst. Existing reveal, parallax and shape controls remain. Reduced motion, missing Canvas and no JavaScript retain the original image; drawing stops when idle, hidden or offscreen.

## Motion Graphics

`/#motion-graphics` presents the supplied Aquaguard video, logo animation and floating-pen Lottie in three desktop columns and stacked mobile panels. Its scroll-triggered heading shares the Hero letter reveal; the background grid eases out on entry and returns on upward exit. After Effects/CapCut copy enters word by word. Passing over the heading swings individual letters; the A in Graphics squashes, jumps and flips back with a spring landing, and occasionally repeats on its own while visible. Tap a letter or focus the heading and press Enter/Space for the same reaction.

Videos and Lottie loop silently while visible. Clicking opens a larger modal with native video controls and audio; the supplied Lottie itself has no audio. The user removed the gallery pause control and secondary captions. Square media frames keep project names inside their bottom-left corners over a soft vignette. Previews crop to fill; hover/focus lifts the frame and reveals a centered view label with an animated diagonal arrow. Offscreen/hidden suspension, reduced-motion defaults, keyboard/Escape/backdrop handling and static/direct-file fallbacks remain; modals show the full frame. The local Lottie runtime loads on visibility after the heading settles, or immediately on a modal open. Floating-pen initialization/rendering runs in the official DotLottie worker so it cannot block the Graphic Design entrance below. Gallery loops use smaller silent 640x360 copies (Aquaguard about 5.9 MB); the original files, including Aquaguard's 222 MB full-resolution video, load only in the modal.

`tests/motion-graphics.spec.ts` covers responsive layout, scroll/reverse transitions, real media playback, delayed loads, keyboard input, lifecycle and fallback states. Run `npm test -- tests/motion-graphics.spec.ts` for the focused production checks.

## Social Media

Renamed from Graphic Design on 2026-10-22; the section heading and mobile Projects label are Social Media, while the existing `#graphic-design` anchor is retained.

`/#graphic-design` presents all 16 supplied artworks in separate SK Resignation, LCAT-VAWC, Safer School Zones and combined Posters & Brochures collections. Each grid follows the two/three/two reference at desktop and mobile widths. Previews cover-fill their frames; the image-only lightbox preserves uncropped artwork over a dimmed background, with an X to close. The heading shares Motion Graphics scroll/letter interactions; the supplied typing dotLottie sits alongside it. Artwork sources stay unchanged, with smaller WebP derivatives and a content catalog in `src/data/graphic-design.json`. Typing renders at native device pixel density, resizes automatically and starts on visibility independently of the heading, with automatic visibility suspension and reduced-motion/static fallbacks. There is no manual typing control or individual tile caption; accessible artwork names and the full-image viewer remain. Original links work without JavaScript. Both work sections omit decorative background text and use square media frames and viewer containers.

Run `npm test -- tests/graphic-design.spec.ts` for the focused checks. Graphic Design is accepted (2026-10-20).

## Subli Folio

`/#sublimation` follows the latest desktop/mobile Figma three-image row. All three apparel designs use uncropped, contain-fit WebP previews. Clicking opens the shared Graphic Design image-only viewer over a dimmed background with an X exit; Escape/backdrop dismissal, focus and scroll restoration remain. Native original-file links provide no-script access, and a failed enlarged preview exposes its original-file link. The header uses the supplied transparent Rocket in Space dotLottie, fitted inside the existing illustration slot, with no play/pause button. It plays automatically while visible and suspends offscreen, in hidden tabs and while the image viewer is open. A transparent static poster covers reduced motion, no script and animation failure. The former 3D shirt implementation and generated assets are removed. The title stacks black SUBLI above white FOLIO on a black rectangle, retaining the shared letter entrance and spring interactions. After the title finishes, the sublimation description slides/fades in from the left word by word. Reduced motion, keyboard/touch input and no-script access remain; mobile Projects links directly to the section. Original files stay unchanged; regenerate affected previews and component content dimensions after replacing them.

Run `npm test -- tests/subli-folio.spec.ts tests/subli-rocket.spec.ts` for focused checks. Subli Folio is accepted; Logo Folio is implemented for review; Website & Web-App is implemented for review; Contact is implemented for review; footer remains unstarted.

## Logo Folio

`/#logo` follows Subli Folio with the same stacked title, once-only letter entrance, spring reactions and subsequent word-by-word description swipe. The supplied Wonder Things - Monochrome dotLottie plays to the right of the header, with automatic suspension and a transparent static fallback. Kasama and Wenn brand boards use contain-fit previews in two desktop columns and one vertical mobile column. Both open in the shared image-only viewer; original links work without JavaScript. Source artwork remains unchanged. Subli and Logo share their existing illustration/viewer lifecycle through `src/scripts/illustrated-folio.ts`.

Run `npm test -- tests/logo-folio.spec.ts tests/logo-animation.spec.ts` for focused checks. Logo Folio awaits user acceptance; Contact is implemented for review; footer, release review and deployment remain unstarted.

## Website & Web-App

`/#web-projects` follows Logo Folio with the shared Motion Graphics letter entrance, overlapping description-word stagger and spring reactions. The stacked title puts WEB-APP in white on a black rectangle. Liquifi and DILG-Survey use text-led cards with concise summaries and flowing SVG contour backgrounds inspired by the latest reference. There are no website screenshots or browser frames. Project cards invert to black with light text and contours on hover or keyboard focus, retaining the lift and staggered arrow. A full-width black View my GitHub card below them includes the official GitHub mark and links to `https://github.com/dranrebwen424`; it stays dark on hover/focus. The icon license lives in `public/licenses/primer-octicons.txt`. Two desktop project columns become a mobile vertical stack; native links open a clearly named new tab. Static/no-script access and reduced-motion color feedback remain.

Run `npm test -- tests/web-projects.spec.ts tests/mobile-navigation.spec.ts` for focused checks. Website & Web-App and Contact are implemented for review; footer and deployment remain unstarted.

## Contact

`/#contact` follows Web projects with a black panel matching the supplied Figma desktop reference: 1283x545 at 1440px, 32px corners, centered white copy in Gilroy and a 300x81 white Get in touch action. The header CTA and mobile menu Contact link navigate to this section. Only the white section action opens a centered native modal on desktop or a bottom sheet below 768px. The mobile menu closes on navigation. It offers the email from the supplied resume, `dranrebwen2505@gmail.com`, and the existing GitHub profile. Email opens the visitor's email client; GitHub opens a clearly named new tab.

Escape, X and backdrop dismissal restore focus and scrolling; keyboard focus stays inside. Responsive resize, reduced motion and BFCache cleanup are supported. The section CTA retains its native email link without scripts. No contact form or backend is added. Run `npm test -- tests/contact.spec.ts tests/mobile-navigation.spec.ts` for focused checks. Contact is implemented for review; footer remains unstarted.

## Requirements

Node.js 22.12.0 or later and npm. The initial setup was verified with Node.js 24.12.0 and npm 11.6.2.

## Commands

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

`dev` starts the local development server (normally http://localhost:4321). `build` checks Astro/TypeScript before producing the static site in `dist/`. `preview` serves that production build locally.

## Browser checks

```sh
npx playwright install chromium
npm test
```

The focused hero checks build the site and start an isolated production preview on port 4322, leaving any existing development server alone. They cover mock selection, mobile menu/touch behavior, keyboard interaction, responsive overflow, reduced motion and the no-JavaScript heading fallback. Screenshots are written to the ignored `test-results/` directory.

`tests/hero-shapes.spec.ts` checks actual rendered shape pixels, click/keyboard/touch activation, pause/settling, depth-dependent parallax, responsive spacing, GPU suspension and static/context-loss/BFCache fallbacks. `tests/background-grid.spec.ts` covers the stationary grid, opening ripple and hover trail.

With the development server already running on port 4321, run `npm run test:dev` to check the character interaction on that same server. This catches development-only module/asset loading failures that production checks cannot cover. If development requests return `504 Outdated Optimize Dep` after installing dependencies, restart with `npm run dev -- --background --force`, then reload the browser.

## Character motion study

Open `/character-preview` to review the standalone Rive walk/hammer interaction. The portfolio Hero uses the same character controller and artwork. Rebuild its source/export with `npm run rive:build` (requires Python 3 and Rive CLI); the committed `.riv` runs without those tools. See [the animation notes](rive/character-preview/README.md). `npm test` also covers this preview's rendering, pointer/touch/keyboard behavior and static fallbacks.

## Project context

Read [context/README.md](context/README.md) and [the build plan](context/build-plan.md) before implementing a section. Supplied fonts, profile assets, Figma snapshots, and reference documents are preserved in their existing directories. They are not automatically published as public assets.
