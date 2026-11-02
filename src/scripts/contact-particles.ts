export {};

const panel = document.querySelector<HTMLElement>('.contact-panel')!;
const canvas = panel.querySelector<HTMLCanvasElement>('.contact-particles')!;
const toggle = panel.querySelector<HTMLButtonElement>('.contact-particles-toggle')!;
const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function mount() {
  if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M94 0H70C40 0 28 14 28 45V102C28 118 20 127 10 127H8Q0 127 0 135V165Q0 173 8 173H10C20 173 28 182 28 198V255C28 286 40 300 70 300H94Q100 300 100 294V279Q100 273 94 273H78C61 273 52 265 52 248V198C52 174 44 158 32 152Q28 150 32 148C44 142 52 126 52 102V52C52 35 61 27 78 27H94Q100 27 100 21V6Q100 0 94 0Z');
  const length = path.getTotalLength();
  const style = getComputedStyle(panel);
  const colors = [style.getPropertyValue('--color-contact-particle').trim(), style.getPropertyValue('--color-contact-particle-accent').trim()];
  type Particle = { x: number; y: number; tx: number; ty: number; radius: number; alpha: number; bend: number; delay: number; phase: number; speed: number; color: string; brace: boolean };
  let particles: Particle[] = [];
  let width = 0, height = 0, progress = 0, frame = 0, last = 0, time = 0;
  let paused = toggle.getAttribute('aria-pressed') === 'true';
  let visible = false, hovered = panel.matches(':hover') && matchMedia('(hover: hover)').matches, touched = false, stopped = false;
  let touchStart: { x: number; y: number } | undefined;
  const target = () => !reduced.matches && (hovered || touched || panel.contains(document.activeElement)) ? 1 : 0;

  const draw = () => {
    context.clearRect(0, 0, width, height);
    for (const point of particles) {
      const amount = Math.max(0, Math.min(1, (progress - point.delay) / (1 - point.delay)));
      const eased = amount * amount * (3 - 2 * amount);
      const bend = Math.sin(eased * Math.PI) * point.bend;
      const phase = time * point.speed + point.phase;
      const motion = reduced.matches ? 0 : 1;
      const driftX = Math.sin(phase * .45) * (width < 768 ? 5 : 12) * motion;
      const driftY = Math.cos(phase * .35) * (width < 768 ? 7 : 16) * motion;
      const rippleX = (Math.sin(phase * .7) * 2 + Math.sin(time * .6 + point.ty / height * 8) * 1.5) * motion;
      const rippleY = Math.cos(phase * .55) * 3 * motion;
      const x = point.x + driftX + (point.tx + rippleX - point.x - driftX) * eased + bend;
      const y = point.y + driftY + (point.ty + rippleY - point.y - driftY) * eased - bend * .45;
      context.globalAlpha = point.alpha * (point.brace ? .55 + eased * .45 : 1 - eased * .7);
      context.fillStyle = point.color;
      context.beginPath();
      context.arc(x, y, point.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };

  const tick = (now: number) => {
    frame = 0;
    if (last && now - last < 1000 / 30) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const goal = target();
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    if (!paused) time += dt;
    progress += (goal - progress) * (1 - Math.exp(-7 * dt));
    const settled = Math.abs(goal - progress) < .001;
    if (settled) progress = goal;
    draw();
    if (settled) canvas.dataset.state = goal ? 'braces' : 'scattered';
    if (!settled || !paused) frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (stopped) return;
    toggle.hidden = reduced.matches;
    if (reduced.matches) {
      progress = 0;
      draw();
      canvas.dataset.state = 'static';
    } else if (visible && !document.hidden && !dialog.open) {
      const goal = target();
      if (Math.abs(goal - progress) < .001) {
        canvas.dataset.state = goal ? 'braces' : 'scattered';
      } else {
        canvas.dataset.state = goal ? 'forming' : 'dispersing';
      }
      if (!paused || Math.abs(goal - progress) >= .001) frame = requestAnimationFrame(tick);
    }
  };

  const resize = () => {
    width = panel.clientWidth;
    height = panel.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 768 ? 480 : 960;
    const braceWidth = width < 768 ? Math.min(56, width * .13) : Math.min(height * .34, width * .16);
    const inset = width < 768 ? 6 : Math.max(16, (width - 620) / 2 - braceWidth - 24);
    particles = Array.from({ length: count }, (_, index) => {
      const brace = index < count * .8;
      const sample = path.getPointAtLength(Math.random() * length);
      const x = Math.random() * width, y = Math.random() * height;
      const spread = width < 768 ? 2 : 4;
      const bx = inset + sample.x / 100 * braceWidth;
      return {
        x, y, brace,
        tx: brace ? (index % 2 ? width - bx : bx) + (Math.random() - .5) * spread : x,
        ty: brace ? height * .13 + sample.y / 300 * height * .74 + (Math.random() - .5) * spread : y,
        radius: .55 + Math.random() * .8,
        alpha: .25 + Math.random() * .5,
        bend: (Math.random() - .5) * (width < 768 ? 32 : 80),
        delay: Math.random() * .15,
        phase: Math.random() * Math.PI * 2,
        speed: .6 + Math.random() * .7,
        color: colors[index % 4 ? 0 : 1],
      };
    });
    draw();
    canvas.hidden = false;
    sync();
  };

  const enter = (event: PointerEvent) => { if (event.pointerType !== 'touch') { hovered = true; visible = true; sync(); } };
  const leave = () => { hovered = false; sync(); };
  const down = (event: PointerEvent) => {
    touchStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : undefined;
    visible = true;
    sync();
  };
  const up = (event: PointerEvent) => {
    if (touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10 && !(event.target as Element).closest('a, button')) {
      touched = !touched;
      sync();
    }
    touchStart = undefined;
  };
  const cancel = () => { touchStart = undefined; };
  const focusOut = () => { queueMicrotask(sync); };
  const pause = () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume particle drift' : 'Pause particle drift');
    sync();
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const sizes = new ResizeObserver(resize);
  const modal = new MutationObserver(sync);
  observer.observe(panel);
  sizes.observe(panel);
  modal.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  panel.addEventListener('pointerenter', enter);
  panel.addEventListener('pointerleave', leave);
  panel.addEventListener('pointerdown', down);
  panel.addEventListener('pointerup', up);
  panel.addEventListener('pointercancel', cancel);
  panel.addEventListener('focusin', sync);
  panel.addEventListener('focusout', focusOut);
  toggle.addEventListener('click', pause);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    sizes.disconnect();
    modal.disconnect();
    panel.removeEventListener('pointerenter', enter);
    panel.removeEventListener('pointerleave', leave);
    panel.removeEventListener('pointerdown', down);
    panel.removeEventListener('pointerup', up);
    panel.removeEventListener('pointercancel', cancel);
    panel.removeEventListener('focusin', sync);
    panel.removeEventListener('focusout', focusOut);
    toggle.removeEventListener('click', pause);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    window.removeEventListener('pagehide', stop);
    canvas.hidden = true;
    toggle.hidden = true;
  };
  window.addEventListener('pagehide', stop);
  resize();
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
