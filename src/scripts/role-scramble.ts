import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

export function startRoleScramble() {
  const role = document.querySelector<HTMLElement>('.hero-role')!;
  const title = role.querySelector<HTMLElement>('.role-title')!;
  const roles = ['GRAPHIC DESIGNER', 'MOTION GRAPHICS DESIGNER', 'UI/UX DESIGNER', 'FULL-STACK DEVELOPER'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timeline = gsap.timeline({ paused: true, repeat: -1 });
  let visible = false, fontReady = false, disposed = false;

  for (const text of [...roles.slice(1), roles[0]]) {
    timeline.to(title, {
      duration: 1.15,
      ease: 'none',
      scrambleText: { text, chars: 'upperCase', speed: .8, revealDelay: .3 },
    }, '+=2.6');
  }

  const sync = () => {
    if (!disposed) timeline.paused(!visible || !fontReady || document.hidden || reduced.matches);
  };
  const onPreference = () => {
    if (reduced.matches) {
      timeline.pause(0);
      title.textContent = roles[0];
    }
    sync();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: .1 });
  const stop = () => {
    disposed = true;
    timeline.kill();
    title.textContent = roles[0];
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', onPreference);
    window.removeEventListener('pagehide', stop);
  };

  observer.observe(role);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', onPreference);
  window.addEventListener('pagehide', stop);
  document.fonts.load('400 24px Gilroy').then(() => document.fonts.ready).then(() => {
    fontReady = true;
    sync();
  }).catch(stop);
}
