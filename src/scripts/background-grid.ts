import { gsap } from 'gsap';

export function startBackgroundGrid(animate: boolean, grid = document.querySelector<HTMLElement>('.background-grid')!) {
  const ripple = grid.querySelector<SVGRectElement>('.grid-ripple')!;
  const wave = grid.querySelector<SVGCircleElement>('.grid-wave')!;
  const trail = grid.querySelector<SVGGElement>('.grid-trail')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const cells = new Map<string, SVGGElement>();
  let active = '';
  let entrance: gsap.core.Timeline | undefined;

  const leave = () => {
    const cell = cells.get(active);
    const key = active;
    active = '';
    if (cell) gsap.to(cell, { opacity: 0, duration: .75, ease: 'power2.out', onComplete: () => {
      cell.remove();
      cells.delete(key);
    } });
  };
  const clear = () => {
    gsap.killTweensOf([...cells.values()]);
    trail.replaceChildren();
    cells.clear();
    active = '';
  };
  const move = (event: PointerEvent) => {
    if (reduced.matches || !mouse.matches || event.pointerType === 'touch' || document.hidden) return;
    const bounds = grid.getBoundingClientRect();
    const localX = event.clientX - bounds.left, localY = event.clientY - bounds.top;
    if (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) return leave();
    const x = Math.floor((localX - 24) / 48) * 48 + 24;
    const y = Math.floor((localY - 24) / 48) * 48 + 24;
    const key = `${x},${y}`;
    if (active === key) return;
    leave();
    active = key;
    let cell = cells.get(key);
    if (!cell) {
      cell = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      for (const lines of [false, true]) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x - (lines ? 2 : 0)));
        rect.setAttribute('y', String(y - (lines ? 2 : 0)));
        rect.setAttribute('width', lines ? '52' : '48');
        rect.setAttribute('height', lines ? '52' : '48');
        rect.setAttribute('class', lines ? 'grid-cell-lines' : 'grid-cell-fill');
        if (lines) rect.setAttribute('fill', ripple.getAttribute('fill')!);
        cell.append(rect);
      }
      cells.set(key, cell);
      trail.append(cell);
    }
    gsap.killTweensOf(cell);
    gsap.set(cell, { opacity: 1 });
  };
  const preference = () => {
    if (reduced.matches) {
      entrance?.kill();
      entrance = undefined;
      gsap.set(ripple, { opacity: 0 });
    }
    clear();
  };
  const visibility = () => {
    entrance?.paused(document.hidden);
    if (document.hidden) clear();
  };
  const resize = () => {
    entrance?.kill();
    entrance = undefined;
    gsap.set(ripple, { opacity: 0 });
    clear();
  };
  const out = (event: PointerEvent) => { if (!event.relatedTarget) leave(); };
  const stop = () => {
    resize();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerout', out);
    window.removeEventListener('blur', leave);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', stop);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', preference);
    mouse.removeEventListener('change', preference);
  };

  if (animate && !reduced.matches) {
    wave.setAttribute('cx', String(innerWidth / 2));
    wave.setAttribute('cy', String(innerHeight / 2));
    const opacity = Number(getComputedStyle(grid).getPropertyValue('--grid-ripple-opacity'));
    entrance = gsap.timeline()
      .to(wave, { attr: { r: Math.hypot(innerWidth / 2, innerHeight / 2) + 128 }, duration: 2.8, ease: 'none' }, 0)
      .to(ripple, { opacity, duration: .2 }, 0)
      .to(ripple, { opacity: 0, duration: .8 }, 2);
    visibility();
  }
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerout', out);
  window.addEventListener('blur', leave);
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', preference);
  mouse.addEventListener('change', preference);
}

