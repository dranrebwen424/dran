import { gsap } from 'gsap';
import { startBackgroundGrid } from './background-grid';
import { startRoleMorph } from './role-morph';

export function startHeroEntrance() {
  const root = document.documentElement;
  root.dataset.pageEntranceReady = 'true';
  root.dataset.aboutEntranceReady = 'true';
  const grid = document.querySelector<HTMLElement>('.background-grid')!;
  const content = [...document.querySelectorAll<HTMLElement>('.hero-role, .hero-summary, .hero-action')];
  const portrait = document.querySelector<HTMLElement>('.portrait-interaction')!;
  const portraitShapes = document.querySelector<HTMLElement>('.portrait-shapes')!;
  const portraitButtons = [...portraitShapes.querySelectorAll<HTMLElement>('[data-shape]')];
  const shapes = document.querySelector<HTMLElement>('.hero-shapes')!;
  const shapeButtons = [...shapes.querySelectorAll<HTMLElement>('.hero-shape')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let sequence: gsap.core.Timeline | undefined;
  let portraitSequence: gsap.core.Timeline | undefined;
  let shapesStartup: Promise<void> | undefined;
  let gridStarted = false, contentStarted = false, stopped = false;

  const startGrid = (animate: boolean) => {
    if (gridStarted) return;
    gridStarted = true;
    startBackgroundGrid(animate);
  };
  const startContent = () => {
    if (contentStarted) return;
    contentStarted = true;
    startRoleMorph();
  };
  const startShapes = () => shapesStartup ??= import('./hero-shapes').then(({ startHeroShapes }) => {
    if (stopped) return;
    // A stalled download may have already triggered the static-page watchdog.
    if (root.dataset.headlineEntrance !== 'pending' && root.dataset.pageEntrance === 'pending') {
      shapes.dataset.state = 'fallback';
      return;
    }
    startHeroShapes();
  }).catch(() => { if (!stopped) shapes.dataset.state = 'fallback'; });
  const visibility = () => { sequence?.paused(document.hidden); portraitSequence?.paused(document.hidden); };
  const settlePortrait = () => {
    portraitSequence?.kill();
    portraitSequence = undefined;
    gsap.set(portrait, { clearProps: 'clipPath' });
    root.dataset.aboutEntrance = 'done';
    root.dataset.portraitEntrance = 'done';
  };
  const startPortrait = () => {
    if (portraitSequence || root.dataset.aboutEntrance === 'done') return;
    root.dataset.aboutEntrance = 'playing';
    portraitSequence = gsap.timeline({ onComplete: settlePortrait })
      .fromTo(portrait, { clipPath: 'inset(100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0%)', duration: 1.25, ease: 'power2.inOut' }, 0);
    visibility();
  };
  const settle = () => {
    sequence?.kill();
    sequence = undefined;
    settlePortrait();
    observer.disconnect();
    root.dataset.pageEntrance = 'done';
    gsap.set([grid, ...content, shapes, portraitShapes], { clearProps: 'opacity,visibility,transform' });
    gsap.set([...shapeButtons, ...portraitButtons], { clearProps: '--shape-entrance-scale' });
    reduced.removeEventListener('change', complete);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', complete);
  };
  const complete = () => {
    if (stopped) return;
    settle();
    startGrid(false);
    startContent();
    startShapes();
  };
  const inspect = () => {
    if (reduced.matches || root.dataset.pageEntrance !== 'pending') return complete();
    if (root.dataset.portraitEntrance === 'playing') startPortrait();
    if (sequence || (root.dataset.headlineSettled !== 'true' && root.dataset.headlineEntrance !== 'done')) return;
    sequence = gsap.timeline({ onComplete: complete })
      .to(grid, { autoAlpha: 1, duration: .5, ease: 'power2.out' }, 0)
      .call(() => startGrid(true), [], .5)
      .call(startContent, [], 0)
      .fromTo(content, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out',
      }, 0)
      .set([shapes, portraitShapes], { autoAlpha: 1 }, .7)
      .fromTo(shapeButtons, { '--shape-entrance-scale': .18 }, {
        '--shape-entrance-scale': 1, duration: .95, stagger: .055, ease: 'elastic.out(1, .5)',
      }, .7)
      .fromTo(portraitButtons, { '--shape-entrance-scale': .18 }, {
        '--shape-entrance-scale': 1, duration: .95, stagger: .055, ease: 'elastic.out(1, .5)',
      }, .7);
    visibility();
  };
  const observer = new MutationObserver(inspect);
  const stop = () => {
    stopped = true;
    settle();
    shapes.dataset.state = 'static';
    window.removeEventListener('pagehide', stop);
  };
  observer.observe(root, { attributes: true, attributeFilter: ['data-headline-settled', 'data-headline-entrance', 'data-page-entrance', 'data-portrait-entrance'] });
  reduced.addEventListener('change', complete);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', complete);
  window.addEventListener('pagehide', stop);
  inspect();
  return startShapes();
}

window.addEventListener('pageshow', (event) => { if (event.persisted) startHeroEntrance(); });
