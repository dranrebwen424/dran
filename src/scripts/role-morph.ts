import { gsap } from 'gsap';

type Position = { character: string; index: number; x: number; width: number };
type Letter = Position & { node: HTMLSpanElement; glyph: HTMLSpanElement };

export function startRoleMorph() {
  const role = document.querySelector<HTMLElement>('.hero-role')!;
  const copy = role.querySelector<HTMLElement>('.role-copy')!;
  const title = role.querySelector<HTMLElement>('.role-title')!;
  const roles = ['GRAPHIC DESIGNER', 'MOTION GRAPHICS DESIGNER', 'UI/UX DESIGNER', 'FULL-STACK DEVELOPER'];
  const prefix = "I'M A ";
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure = document.createElement('span');
  measure.className = 'role-measure';
  let letters: Letter[] = [];
  let animation: gsap.core.Animation | undefined;
  let current = 0, visible = false, fontReady = false, disposed = false;

  const positions = (text: string): Position[] => {
    measure.textContent = prefix + text;
    const node = measure.firstChild!;
    const range = document.createRange();
    const bounds = copy.getBoundingClientRect();
    const scale = bounds.width / parseFloat(getComputedStyle(copy).width);
    const result: Position[] = [];
    for (let index = 0; index < node.textContent!.length; index++) {
      const character = node.textContent![index];
      if (character === ' ') continue;
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const box = range.getBoundingClientRect();
      result.push({ character, index, x: (box.left - bounds.left) / scale, width: box.width / scale });
    }
    return result;
  };
  const create = (position: Position): Letter => {
    const node = document.createElement('span');
    const glyph = document.createElement('span');
    node.className = 'role-letter';
    glyph.className = 'role-glyph';
    glyph.textContent = position.character;
    node.append(glyph);
    copy.append(node);
    gsap.set(node, { x: position.x, width: position.width });
    return { ...position, node, glyph };
  };
  const sync = () => {
    if (!disposed) animation?.paused(!visible || !fontReady || document.hidden || reduced.matches);
  };
  const schedule = () => {
    animation = gsap.delayedCall(2.6, transition).pause();
    sync();
  };
  const transition = () => {
    const next = (current + 1) % roles.length;
    const available = new Set(letters);
    const outgoing: Letter[] = [];
    const timeline = gsap.timeline({ paused: true, onComplete: () => {
      outgoing.forEach((letter) => letter.node.remove());
      letters.forEach((letter) => copy.append(letter.node));
      current = next;
      title.textContent = roles[current];
      schedule();
    } });
    letters = positions(roles[next]).map((position, index) => {
      // Keep the prefix intact; reuse the nearest available copy of each role letter.
      const reused = [...available].filter((letter) => letter.character === position.character && (
        position.index < prefix.length ? letter.index === position.index : letter.index >= prefix.length
      )).sort((a, b) => Math.abs(a.x - position.x) - Math.abs(b.x - position.x))[0];
      if (reused) {
        available.delete(reused);
        timeline.to(reused.node, {
          x: position.x, width: position.width, duration: .8, ease: 'power3.inOut',
        }, index % 5 * .025);
        return { ...reused, ...position };
      }
      const letter = create(position);
      const horizontal = index % 3 === 0;
      const direction = index % 2 ? -110 : 110;
      gsap.set(letter.glyph, {
        xPercent: horizontal ? direction : 0,
        yPercent: horizontal ? 0 : direction,
        opacity: 0,
      });
      timeline.to(letter.glyph, { xPercent: 0, yPercent: 0, opacity: 1, duration: .62, ease: 'power3.out' }, .16 + index % 5 * .035);
      return letter;
    });
    [...available].forEach((letter, index) => {
      outgoing.push(letter);
      timeline.to(letter.glyph, {
        yPercent: index % 2 ? -110 : 110, opacity: 0, duration: .38, ease: 'power2.in',
      }, index % 4 * .025);
    });
    animation = timeline;
    sync();
  };
  const restore = () => {
    animation?.kill();
    copy.querySelectorAll('.role-letter').forEach((node) => node.remove());
    measure.remove();
    letters = [];
    copy.classList.remove('has-role-letters');
    title.textContent = roles[current];
  };
  const render = () => {
    if (disposed || !fontReady || reduced.matches) return;
    copy.append(measure);
    letters = positions(roles[current]).map(create);
    copy.classList.add('has-role-letters');
    schedule();
  };
  const onPreference = () => {
    current = 0;
    restore();
    render();
  };
  const onResize = () => {
    restore();
    render();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: .1 });
  const stop = () => {
    disposed = true;
    current = 0;
    restore();
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', onPreference);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', stop);
  };

  observer.observe(role);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', onPreference);
  window.addEventListener('resize', onResize);
  window.addEventListener('pagehide', stop);
  document.fonts.load('400 24px Gilroy').then(() => document.fonts.ready).then(() => {
    fontReady = true;
    render();
  }).catch(stop);
}
