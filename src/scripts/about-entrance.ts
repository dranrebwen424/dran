import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const intro = document.querySelector<HTMLElement>('.intro-stack')!;
const hero = intro.querySelector<HTMLElement>('.hero')!;
const shade = hero.querySelector<HTMLElement>('.hero-shade')!;
const about = document.querySelector<HTMLElement>('#about')!;
const education = about.querySelector<HTMLElement>('.about-education')!;
const heading = about.querySelector<HTMLElement>('.about-copy h3')!;
const description = about.querySelector<HTMLElement>('.about-copy > p')!;
const smiley = about.querySelector<HTMLElement>('.about-smiley')!;
const actions = about.querySelector<HTMLElement>('.about-actions')!;
const buttons = [...actions.querySelectorAll<HTMLElement>('a')];
let revealed = false, copyRevealed = false, actionsRevealed = false;

function startAboutMotion() {
  const media = gsap.matchMedia();
  media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    const header = document.querySelector<HTMLElement>('.site-header')!;
    const resize = () => hero.style.setProperty('--hero-sticky-top', `${Math.min(0, innerHeight - hero.offsetHeight)}px`);
    resize();
    intro.setAttribute('data-stacking', '');
    const sizes = new ResizeObserver(resize);
    sizes.observe(hero);
    window.addEventListener('resize', resize);
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches(':focus-visible') && about.getBoundingClientRect().top < hero.getBoundingClientRect().bottom) {
        intro.scrollIntoView({ block: 'start' });
      }
    };
    hero.addEventListener('focusin', focus);
    const aboutTop = () => about.getBoundingClientRect().top + scrollY;
    // Native sticky positioning owns movement; only the covering layer's opacity changes.
    gsap.to(shade, {
      opacity: .5, ease: 'none',
      scrollTrigger: {
        trigger: about, start: () => Math.max(0, aboutTop() - innerHeight),
        end: () => aboutTop() - header.offsetHeight, scrub: true, invalidateOnRefresh: true,
      },
    });
    return () => {
      sizes.disconnect();
      window.removeEventListener('resize', resize);
      hero.removeEventListener('focusin', focus);
      intro.removeAttribute('data-stacking');
      hero.style.removeProperty('--hero-sticky-top');
    };
  });
  media.add('(prefers-reduced-motion: no-preference)', () => {
    let copy: gsap.core.Timeline | undefined;
    let fade: gsap.core.Tween | undefined;
    if (!copyRevealed) {
      gsap.set([heading, description], {
        '--copy-wipe': '0%', maskImage: 'linear-gradient(90deg, #000 calc(var(--copy-wipe) - 12%), transparent var(--copy-wipe))',
      });
      gsap.set(smiley, { autoAlpha: 0, scale: 0, transformOrigin: '50% 70%' });
      heading.dataset.reveal = 'armed';
      smiley.dataset.entrance = 'waiting';
      copy = gsap.timeline({
        scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
        onStart: () => { copyRevealed = true; heading.dataset.reveal = 'playing'; },
        onComplete: () => {
          gsap.set(smiley, { clearProps: 'opacity,visibility,transform,transformOrigin' });
          smiley.dataset.entrance = 'done';
        },
      }).to(heading, {
        '--copy-wipe': '112%', duration: 2, ease: 'sine.inOut',
        onComplete: () => { gsap.set(heading, { clearProps: 'maskImage,--copy-wipe' }); heading.dataset.reveal = 'done'; },
      }, 0).to(description, {
        '--copy-wipe': '112%', duration: 1.8, ease: 'sine.inOut',
        onComplete: () => { gsap.set(description, { clearProps: 'maskImage,--copy-wipe' }); },
      }, .2).to(smiley, {
        autoAlpha: 1, scale: 1, duration: .55, ease: 'back.out(1.9)',
        onStart: () => { smiley.dataset.entrance = 'playing'; },
      }, 2.1);
    }
    if (!actionsRevealed) {
      actions.dataset.entrance = 'armed';
      fade = gsap.fromTo(buttons, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: .85, stagger: .12, ease: 'power2.out',
        scrollTrigger: { trigger: actions, start: 'top 92%', once: true },
        onStart: () => { actionsRevealed = true; actions.dataset.entrance = 'playing'; },
        onComplete: () => { gsap.set(buttons, { clearProps: 'opacity,transform' }); actions.dataset.entrance = 'done'; },
      });
    }
    const focusActions = () => { fade?.progress(1); };
    actions.addEventListener('focusin', focusActions);
    const wipe = revealed ? undefined : gsap.fromTo(education, { clipPath: 'inset(0% 0% 100% -8px)' }, {
      clipPath: 'inset(0% 0% 0% -8px)', duration: 1.65, ease: 'power2.inOut',
      onStart: () => { revealed = true; education.dataset.timelineReveal = 'playing'; },
      onComplete: () => { gsap.set(education, { clearProps: 'clipPath' }); education.dataset.timelineReveal = 'done'; },
      scrollTrigger: { trigger: education, start: 'top 85%', once: true },
    });
    if (wipe) education.dataset.timelineReveal = 'armed';
    const visibility = () => {
      if (revealed) wipe?.paused(document.hidden);
      if (copyRevealed) copy?.paused(document.hidden);
      if (actionsRevealed) fade?.paused(document.hidden);
    };
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      actions.removeEventListener('focusin', focusActions);
      education.dataset.timelineReveal = 'done';
      heading.dataset.reveal = 'done';
      smiley.dataset.entrance = 'done';
      actions.dataset.entrance = 'done';
    };
  });
  return media;
}

let motion = startAboutMotion();
window.addEventListener('pagehide', () => motion.revert());
window.addEventListener('pageshow', event => { if (event.persisted) motion = startAboutMotion(); });
