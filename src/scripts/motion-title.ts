import { gsap } from 'gsap';
import { headlineMetrics } from './headline-sway';

export function startMotionTitleReaction(title: HTMLElement, glyphs: HTMLElement[]) {
  const { context, baseline } = headlineMetrics(title);
  const letters = glyphs.map(glyph => glyph.parentElement!.parentElement!);
  const jumpIndex = glyphs.findIndex(glyph => glyph.textContent!.toUpperCase() === 'A');
  const ink = context.measureText('A');
  const halfHeight = ink.actualBoundingBoxAscent / 2;
  const height = parseFloat(getComputedStyle(title).fontSize) * .85;
  const angles = glyphs.map(() => 0), velocities = glyphs.map(() => 0);
  let jumpTime: number | undefined, scale = 1, scaleVelocity = 0;
  let visible = false, attached = false, active = false;
  let previous = -1, pointerX = 0, pointerTime = 0;
  const crouch = .16, flight = .92;
  const nextRest = () => 6 + Math.random() * 6;
  const encore = jumpIndex < 0 ? undefined : gsap.delayedCall(nextRest(), () => kick(jumpIndex, 0)).pause();

  title.classList.add('has-letter-reactions');
  title.tabIndex = 0;
  title.setAttribute('aria-describedby', `${title.id}-hint`);
  const hint = document.getElementById(`${title.id}-hint`)!;
  hint.hidden = false;
  glyphs.forEach((glyph, index) => gsap.set(glyph, {
    transformOrigin: `50% ${index === jumpIndex ? baseline - halfHeight : baseline}px`,
    transformPerspective: 0,
  }));

  const sync = () => {
    const available = visible && !document.hidden;
    encore?.paused(!available);
    const running = active && available;
    if (running === attached) return;
    attached = running;
    if (running) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  const tick = (_time: number, delta: number) => {
    let remaining = Math.min(delta / 1000, .05);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      remaining -= dt;
      for (let index = 0; index < angles.length; index++) {
        if (index === jumpIndex && jumpTime !== undefined && jumpTime < crouch + flight) continue;
        velocities[index] += (-150 * angles[index] - 12 * velocities[index]) * dt;
        angles[index] += velocities[index] * dt;
        if (Math.abs(angles[index]) < .02 && Math.abs(velocities[index]) < .15) {
          angles[index] = velocities[index] = 0;
        }
      }
      if (jumpTime !== undefined) {
        const lastTime = jumpTime;
        jumpTime += dt;
        if (lastTime < crouch && jumpTime >= crouch) scaleVelocity += 3;
        if (lastTime < crouch + flight && jumpTime >= crouch + flight) {
          scaleVelocity -= 5;
          angles[jumpIndex] = 0;
          velocities[jumpIndex] = 65;
        }
        const target = jumpTime < crouch ? .72 : 1;
        scaleVelocity += (300 * (target - scale) - 18 * scaleVelocity) * dt;
        scale += scaleVelocity * dt;
        if (jumpTime >= crouch + flight && Math.abs(scale - 1) < .001 && Math.abs(scaleVelocity) < .01 && angles[jumpIndex] === 0) {
          jumpTime = undefined;
          scale = 1;
          scaleVelocity = 0;
        }
      }
    }
    glyphs.forEach((glyph, index) => {
      let y = 0, rotation = angles[index];
      if (index === jumpIndex && jumpTime !== undefined) {
        const time = Math.max(0, Math.min(flight, jumpTime - crouch));
        // Constant gravity returns to the same baseline; angular momentum carries one full flip.
        y = -4 * height / flight * time + 4 * height / flight ** 2 * time ** 2;
        y += (1 - scale) * halfHeight;
        if (jumpTime < crouch + flight) rotation = 360 * time / flight;
      }
      gsap.set(glyph, { y, rotation, scaleY: index === jumpIndex ? scale : 1, scaleX: index === jumpIndex ? 1 / scale : 1 });
    });
    active = jumpTime !== undefined || angles.some((angle, index) => angle !== 0 || velocities[index] !== 0);
    sync();
  };
  const kick = (index: number, impulse: number) => {
    if (index === jumpIndex) {
      if (jumpTime !== undefined) return;
      jumpTime = 0;
      angles[index] = velocities[index] = 0;
      encore?.delay(nextRest()).restart(true);
    } else velocities[index] = gsap.utils.clamp(-360, 360, velocities[index] + impulse);
    active = true;
    sync();
  };
  const pointer = (event: PointerEvent) => {
    if (event.type === 'pointermove' && event.pointerType === 'touch') return;
    const index = letters.findIndex(letter => {
      const box = letter.getBoundingClientRect();
      return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    });
    if (index !== -1 && index !== previous) {
      const speed = (event.clientX - pointerX) / Math.max(16, event.timeStamp - pointerTime);
      const impulse = (Math.sign(speed) || 1) * gsap.utils.clamp(140, 300, Math.abs(speed) * 90);
      const direction = previous === -1 ? 1 : Math.sign(index - previous);
      for (let crossed = previous === -1 ? index : previous + direction; crossed !== index + direction; crossed += direction) kick(crossed, impulse);
    }
    previous = index;
    pointerX = event.clientX;
    pointerTime = event.timeStamp;
  };
  const leave = () => { previous = -1; };
  const key = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    glyphs.forEach((_, index) => kick(index, index % 2 ? -180 : 180));
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(title);
  title.addEventListener('pointermove', pointer);
  title.addEventListener('pointerdown', pointer);
  title.addEventListener('pointerleave', leave);
  title.addEventListener('keydown', key);
  document.addEventListener('visibilitychange', sync);

  return () => {
    encore?.kill();
    gsap.ticker.remove(tick);
    observer.disconnect();
    title.removeEventListener('pointermove', pointer);
    title.removeEventListener('pointerdown', pointer);
    title.removeEventListener('pointerleave', leave);
    title.removeEventListener('keydown', key);
    document.removeEventListener('visibilitychange', sync);
    title.classList.remove('has-letter-reactions');
    title.removeAttribute('tabindex');
    title.removeAttribute('aria-describedby');
    hint.hidden = true;
  };
}
