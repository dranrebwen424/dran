import { gsap } from 'gsap';

export function headlineMetrics(headline: HTMLElement) {
  const style = getComputedStyle(headline);
  const context = document.createElement('canvas').getContext('2d')!;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const cap = context.measureText('H');
  const baseline = (parseFloat(style.lineHeight) - cap.fontBoundingBoxAscent - cap.fontBoundingBoxDescent) / 2 + cap.fontBoundingBoxAscent;
  return { context, baseline };
}

export function startHeadlineSway(headline: HTMLElement, glyphs: HTMLElement[]) {
  const { context, baseline } = headlineMetrics(headline);
  const ink = glyphs.map((glyph) => context.measureText(glyph.textContent!));
  const left = glyphs.map((glyph, index) => glyph.getBoundingClientRect().left - ink[index].actualBoundingBoxLeft);
  const right = glyphs.map((glyph, index) => glyph.getBoundingClientRect().left + ink[index].actualBoundingBoxRight);
  const contactY = baseline - (ink[1].actualBoundingBoxAscent - ink[1].actualBoundingBoxDescent) / 2;
  const levers = ink.map((metrics) => baseline + metrics.actualBoundingBoxDescent - contactY);
  const mass = [1.25, .28, 6];
  const stiffness = [100, 18, 130];
  const damping = [6, 1.2, 19.3];
  const position = [0, 0, 0], velocity = [0, 0, 0];
  const leanI = gsap.quickSetter(glyphs[0], 'skewX', 'deg');
  const moveApostrophe = gsap.quickSetter(glyphs[1], 'x', 'px');
  const leanM = gsap.quickSetter(glyphs[2], 'skewX', 'deg');
  const kick = (left[1] - right[0] + levers[0] * .14) * Math.sqrt(stiffness[0] / mass[0]) * 1.7;
  // Favor quick encores, with enough range for an occasional long, quiet pause.
  const nextRest = () => .7 + Math.random() ** 2 * 17.3;
  let waiting = nextRest(), active = false;
  let visible = false, attached = false;

  glyphs.forEach((glyph, index) => {
    glyph.parentElement!.style.overflow = 'visible';
    gsap.set(glyph, { transformOrigin: `50% ${baseline + ink[index].actualBoundingBoxDescent}px` });
  });

  const render = () => {
    leanI(-Math.atan(position[0] / levers[0]) * 180 / Math.PI);
    moveApostrophe(position[1]);
    leanM(-Math.atan(position[2] / levers[2]) * 180 / Math.PI);
  };

  const tick = (_time: number, delta: number) => {
    let remaining = Math.min(delta / 1000, .05);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      remaining -= dt;
      if (!active) {
        waiting -= dt;
        if (waiting <= 0) {
          velocity[0] = kick;
          active = true;
        }
        continue;
      }
      for (let index = 0; index < 3; index++) {
        velocity[index] += (-stiffness[index] * position[index] - damping[index] * velocity[index]) / mass[index] * dt;
        position[index] += velocity[index] * dt;
      }
      // Contacts transfer momentum; the lighter apostrophe travels between the planted letters.
      for (let index = 0; index < 2; index++) {
        const next = index + 1;
        const overlap = right[index] + position[index] - left[next] - position[next];
        if (overlap <= 0) continue;
        const inverseMass = 1 / mass[index] + 1 / mass[next];
        position[index] -= overlap / inverseMass / mass[index];
        position[next] += overlap / inverseMass / mass[next];
        const closingSpeed = velocity[index] - velocity[next];
        if (closingSpeed > 0) {
          const impulse = 1.75 * closingSpeed / inverseMass;
          velocity[index] -= impulse / mass[index];
          velocity[next] += impulse / mass[next];
        }
      }
      if (position.every((value) => Math.abs(value) < .025) && velocity.every((value) => Math.abs(value) < .2)) {
        position.fill(0);
        velocity.fill(0);
        active = false;
        waiting = nextRest();
      }
    }
    render();
  };

  const sync = () => {
    const running = visible && !document.hidden;
    if (running === attached) return;
    attached = running;
    if (running) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: .1 });
  observer.observe(headline);
  document.addEventListener('visibilitychange', sync);

  return () => {
    gsap.ticker.remove(tick);
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    gsap.set(glyphs, { x: 0, skewX: 0 });
  };
}
