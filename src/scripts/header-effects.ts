import { gsap } from 'gsap';

const header = document.querySelector<HTMLElement>('.site-header')!;
const brand = header.querySelector<HTMLAnchorElement>('.brand')!;
const mark = header.querySelector<HTMLImageElement>('.brand-mark')!;
const glint = header.querySelector<HTMLElement>('.brand-glint')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function mount() {
  let sequence: gsap.core.Timeline | undefined;
  let previousY = Math.max(0, scrollY), scrollFrame = 0;
  const reveal = () => {
    header.removeAttribute('data-scroll-hidden');
    previousY = Math.max(0, scrollY);
  };
  const updateScroll = () => {
    scrollFrame = 0;
    const y = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
    if (y > header.offsetHeight && Math.abs(y - previousY) < 8) return;
    const engaged = header.hasAttribute('data-menu-open') || !!header.querySelector(':focus-visible, details[open]');
    header.toggleAttribute('data-scroll-hidden', y > header.offsetHeight && y > previousY && !engaged);
    previousY = y;
  };
  const scroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
  const settle = () => {
    sequence?.kill();
    gsap.set(mark, { clearProps: 'transform' });
    gsap.set(glint, { clearProps: 'transform,opacity,visibility' });
  };
  const react = () => {
    if (reduced.matches || document.hidden || sequence?.isActive()) return;
    settle();
    sequence = gsap.timeline({ onComplete: settle });
    const launch = .15, landing = launch + .78;
    sequence.to(mark, { scaleX: 1.18, scaleY: .72, duration: launch, ease: 'power2.in' }, 0)
      .to(mark, { y: -17, duration: .39, ease: 'power1.out' }, launch)
      .to(mark, { y: 0, duration: .39, ease: 'power1.in' }, launch + .39)
      .to(mark, { rotationY: 180, transformPerspective: 500, duration: .3, ease: 'power1.inOut' }, launch + .04)
      .to(mark, { rotationY: 0, duration: .3, ease: 'power1.inOut' }, launch + .34)
      .to(mark, { scaleX: .88, scaleY: 1.14, duration: .12, ease: 'power1.out' }, launch)
      .to(mark, { scaleX: 1, scaleY: 1, duration: .16 }, launch + .12)
      .to(mark, { scaleX: 1.25, scaleY: .65, duration: .07, ease: 'power2.out' }, landing)
      .to(mark, { y: -3.2, scaleX: .94, scaleY: 1.1, duration: .13, ease: 'power1.out' }, landing + .07)
      .to(mark, { y: 0, scaleX: 1.1, scaleY: .86, duration: .13, ease: 'power1.in' }, landing + .2)
      .to(mark, { y: -1.1, scaleX: .98, scaleY: 1.04, duration: .1, ease: 'power1.out' }, landing + .33)
      .to(mark, { y: 0, scaleX: 1.04, scaleY: .94, duration: .1, ease: 'power1.in' }, landing + .43)
      .to(mark, { scaleX: 1, scaleY: 1, duration: .3, ease: 'elastic.out(1, .45)' }, landing + .53);
    sequence.fromTo(glint, { xPercent: -180, autoAlpha: .85 }, { xPercent: 300, duration: .85, ease: 'power2.inOut' }, '+=.08');
  };
  const visibility = () => {
    sequence?.paused(document.hidden);
    header.toggleAttribute('data-effects-paused', document.hidden);
  };
  const preference = () => { if (reduced.matches) settle(); };
  const tap = (event: PointerEvent) => { if (event.pointerType === 'touch') react(); };
  const stop = () => {
    settle();
    cancelAnimationFrame(scrollFrame);
    reveal();
    header.setAttribute('data-effects-paused', '');
    brand.removeEventListener('pointerenter', react);
    brand.removeEventListener('pointerdown', tap);
    brand.removeEventListener('focus', react);
    reduced.removeEventListener('change', preference);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', stop);
    window.removeEventListener('scroll', scroll);
    window.removeEventListener('resize', reveal);
    header.removeEventListener('focusin', reveal);
  };
  brand.addEventListener('pointerenter', react);
  brand.addEventListener('pointerdown', tap);
  brand.addEventListener('focus', react);
  reduced.addEventListener('change', preference);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', stop);
  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('resize', reveal);
  header.addEventListener('focusin', reveal);
  reveal();
  visibility();
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
