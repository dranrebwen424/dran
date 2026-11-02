import { gsap } from 'gsap';
import type { SplitText } from 'gsap/SplitText';
import { startHeadlineSway } from './headline-sway';
import { startHeroEntrance } from './hero-entrance';
import { prepareHeadlineEntrance } from './headline-entrance';

const header = document.querySelector<HTMLElement>('.site-header')!;
const indicator = document.querySelector<HTMLElement>('.section-indicator')!;
const sections = [...document.querySelectorAll<HTMLElement>('.section-button')];
const sectionHashes = sections.map(control => control.getAttribute('href') ?? '#graphic-design');
const desktopProjects = document.querySelector<HTMLDetailsElement>('.desktop-projects')!;
const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
const mobileNav = document.querySelector<HTMLElement>('.mobile-nav')!;
const mobileProjects = document.querySelector<HTMLDetailsElement>('.mobile-projects')!;
const menuEntries = [...mobileNav.querySelectorAll<HTMLElement>('.mobile-nav-entry')];
const projectEntries = [...mobileNav.querySelectorAll<HTMLElement>('.mobile-project-list > *')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width: 767px)');
const workSurface = document.querySelector<HTMLElement>('.work-button-surface')!;
let selected = 0;

async function revealHeadline(animate = true) {
  const root = document.documentElement;
  const headline = document.querySelector<HTMLElement>('#hero-title')!;
  let split: SplitText | undefined;
  let entrance: gsap.core.Timeline | undefined;
  let stopSway: (() => void) | undefined;
  let disposed = false;
  const finish = () => {
    disposed = true;
    entrance?.kill();
    stopSway?.();
    split?.revert();
    root.dataset.headlineEntrance = 'done';
    reduceMotion.removeEventListener('change', onPreference);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', finish);
  };
  const onPreference = () => { if (reduceMotion.matches) finish(); };
  const onResize = () => {
    finish();
    if (!reduceMotion.matches) void revealHeadline(false);
  };
  if (animate && root.dataset.headlineEntrance !== 'pending') return;
  reduceMotion.addEventListener('change', onPreference);
  window.addEventListener('pagehide', finish);

  try {
    const style = getComputedStyle(headline);
    await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`);
    await document.fonts.ready;
    if (animate) await shapesReady;
    if (disposed || reduceMotion.matches || (animate && root.dataset.headlineEntrance !== 'pending')) return finish();
    const prepared = prepareHeadlineEntrance(headline, () => {
      root.dataset.headlineEntrance = 'done';
      stopSway = startHeadlineSway(headline, prepared.glyphs.slice(6, 9));
    });
    split = prepared.split;
    entrance = prepared.entrance;
    // Hand off at the visible finish, before the spring's nearly still tail.
    entrance.call(() => { root.dataset.headlineSettled = 'true'; }, [], entrance.duration() - .4);
    entrance.call(() => { root.dataset.portraitEntrance = 'playing'; }, [], entrance.duration() * .45);
    // Layout reads take time; refresh the clock before starting the prepared timeline.
    gsap.ticker.tick();
    if (animate) {
      root.dataset.headlineEntrance = 'playing';
      entrance.play(0);
    } else entrance.progress(1);
    window.addEventListener('resize', onResize);
  } catch {
    finish();
  }
}

const shapesReady = startHeroEntrance();
void revealHeadline();
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    if (!reduceMotion.matches) void revealHeadline(false);
  }
});

document.querySelector<HTMLAnchorElement>('.work-button')!.addEventListener('click', () => {
  // Apply the press now so reduced-motion cleanup cannot precede a deferred starting pose.
  if (!reduceMotion.matches) gsap.fromTo(workSurface, { scale: 0.96 }, {
    scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)', overwrite: true, lazy: false,
  });
});

function selectSection(index: number) {
  selected = index;
  sections.forEach((control, i) => {
    if (i === index) control.setAttribute('aria-current', 'location');
    else control.removeAttribute('aria-current');
  });
  gsap.to(indicator, {
    xPercent: index * 100,
    duration: reduceMotion.matches ? 0 : 0.7,
    ease: 'elastic.out(1, 0.55)',
    overwrite: true,
  });
}

sections.forEach((control, index) => control.addEventListener('click', () => {
  if (!(control instanceof HTMLAnchorElement)) return;
  selectSection(index);
  setMenu(false);
  document.querySelector<HTMLElement>(control.hash)?.focus({ preventScroll: true });
}));

const selectHash = () => {
  const index = sectionHashes.indexOf(['#motion-graphics', '#sublimation', '#logo', '#web-projects'].includes(location.hash) ? '#graphic-design' : location.hash);
  if (index >= 0 && index !== selected) selectSection(index);
};
selectHash();
window.addEventListener('hashchange', selectHash);
document.querySelector('.brand')!.addEventListener('click', () => { selectSection(0); setMenu(false); });

function setMenu(open: boolean) {
  open = open && mobile.matches;
  if (open === header.hasAttribute('data-menu-open')) return;
  header.toggleAttribute('data-menu-open', open);
  document.documentElement.toggleAttribute('data-mobile-menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close section menu' : 'Open section menu');
  resetMenuAnimation();
  mobileProjects.open = false;
  mobileNav.scrollTop = 0;
  if (open && !reduceMotion.matches) {
    gsap.fromTo(menuEntries, { y: 16, opacity: 0 }, {
      y: 0, opacity: 1, duration: .4, stagger: .075, ease: 'power3.out', clearProps: 'transform,opacity',
    });
  }
}

function resetMenuAnimation() {
  gsap.killTweensOf([...menuEntries, ...projectEntries]);
  gsap.set([...menuEntries, ...projectEntries], { clearProps: 'transform,opacity' });
}

mobileProjects.addEventListener('toggle', () => {
  gsap.killTweensOf(projectEntries);
  gsap.set(projectEntries, { clearProps: 'transform,opacity' });
  if (mobileProjects.open && !reduceMotion.matches && header.hasAttribute('data-menu-open')) {
    gsap.fromTo(projectEntries, { y: 10, opacity: 0 }, {
      y: 0, opacity: 1, duration: .3, stagger: .05, ease: 'power3.out', clearProps: 'transform,opacity',
    });
  }
});
mobileNav.querySelectorAll<HTMLAnchorElement>('a').forEach(link => link.addEventListener('click', () => {
  if (link.hash !== '#contact') selectSection(link.hash === '#hero' ? 0 : link.hash === '#about' ? 1 : 2);
  setMenu(false);
  document.querySelector<HTMLElement>(link.hash)?.focus({ preventScroll: true });
}));
desktopProjects.querySelectorAll<HTMLAnchorElement>('a').forEach(link => link.addEventListener('click', () => {
  selectSection(2);
  desktopProjects.open = false;
  document.querySelector<HTMLElement>(link.hash)?.focus({ preventScroll: true });
}));
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
header.addEventListener('focusout', event => {
  if (event.relatedTarget instanceof Node && !desktopProjects.contains(event.relatedTarget)) desktopProjects.open = false;
  if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) setMenu(false);
});
window.addEventListener('pagehide', () => { setMenu(false); desktopProjects.open = false; });
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) resetMenuAnimation(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && desktopProjects.open) {
    desktopProjects.open = false;
    sections[2].focus();
  }
  if (event.key === 'Escape' && header.hasAttribute('data-menu-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !desktopProjects.contains(event.target)) desktopProjects.open = false;
  if (event.target instanceof Node && !header.contains(event.target)) setMenu(false);
});
mobile.addEventListener('change', () => {
  if (!mobile.matches && (header.hasAttribute('data-menu-open') || document.activeElement === menuToggle)) sections[selected].focus();
  if (mobile.matches && (sections.includes(document.activeElement as HTMLElement) || desktopProjects.contains(document.activeElement))) menuToggle.focus();
  desktopProjects.open = false;
  setMenu(false);
});

document.querySelectorAll<HTMLElement>('[data-press], .section-button').forEach((button) => {
  const press = () => {
    if (!reduceMotion.matches) gsap.to(button, { scale: 0.96, duration: 0.1, overwrite: true });
  };
  const release = () => gsap.to(button, {
    scale: 1, duration: reduceMotion.matches ? 0 : 0.45, ease: 'elastic.out(1, 0.45)', overwrite: true,
  });
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') press();
  });
  button.addEventListener('keyup', release);
  button.addEventListener('blur', release);
});

// Reset interactive transforms when reduced motion changes.
const motion = gsap.matchMedia();
motion.add('(prefers-reduced-motion: no-preference)', () => {
  return () => {
    gsap.killTweensOf([indicator, workSurface, ...sections, ...document.querySelectorAll('[data-press]')]);
    gsap.set(indicator, { xPercent: selected * 100 });
    gsap.set('[data-press], .section-button, .work-button-surface', { clearProps: 'transform' });
    resetMenuAnimation();
  };
});
