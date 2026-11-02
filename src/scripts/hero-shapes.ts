import * as THREE from 'three';
import { gsap } from 'gsap';
import { createMotif } from './shape-geometry';

export function startHeroShapes() {
  const root = document.querySelector<HTMLElement>('.hero-shapes')!;
  return startShapes(root);
}

export function startShapes(root: HTMLElement) {
  const styles = getComputedStyle(root);
  const shapeScale = Number(styles.getPropertyValue('--shape-scale'));
  const floatScale = Number(styles.getPropertyValue('--shape-float') || 1);
  const scrollScale = Number(styles.getPropertyValue('--shape-scroll') || 1);
  const portrait = root.classList.contains('portrait-shapes');
  const host = root.parentElement!;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-shape]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
  camera.position.z = 1000;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  type Item = {
    object: THREE.Group; button: HTMLButtonElement; phase: number; x: number; y: number; depth: number; size: number;
    time: number; screenX: number; screenY: number; ignoreClick: boolean;
    offset: { x: number; y: number }; wake: { x: number; y: number }; wakeAnimation?: gsap.core.Timeline;
    reaction: { x: number; y: number; scale: number }; animation?: gsap.core.Timeline;
  };
  type Grab = {
    item: Item; pointer: number; x: number; y: number; rotationX: number; rotationY: number; offsetX: number; offsetY: number;
    lastX: number; lastY: number; lastTime: number; velocityX: number; velocityY: number; moved: boolean;
  };
  let items: Item[] = [];
  let renderer: THREE.WebGLRenderer | undefined;
  let visible = false, last = 0, width = 1, height = 1, viewportWidth = 1, viewportHeight = 1, unit = 1;
  let grab: Grab | undefined;
  let pointer: { x: number; y: number } | undefined;
  let scroll = window.scrollY, targetScroll = scroll;
  const projected = new THREE.Vector3();

  const draw = (now: number) => {
    if (!renderer) return;
    const delta = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    scroll += (targetScroll - scroll) * (1 - Math.exp(-8 * delta));
    for (const item of items) {
      if (!item.object.visible) continue;
      item.time += delta;
      const { object, phase, reaction, depth, size, x, y, button, time, offset, wake } = item;
      const driftTime = time * (portrait ? 1.4 : 1);
      const distance = (camera.position.z - depth) / camera.position.z;
      object.position.set(
        (x - width / 2 + offset.x + wake.x) * unit * distance + (Math.sin(driftTime * .5 + phase) * 8.5 + Math.sin(driftTime * 1.05 + phase * 1.7) * 3) * unit * floatScale,
        (height / 2 - y - offset.y - wake.y) * unit * distance + ((Math.sin(driftTime * .6 + phase * 1.3) * 11.5 + Math.sin(driftTime * 1.35 + phase) * 3.5) * floatScale + scroll * (.08 + (depth + 240) / 400 * .16) * scrollScale) * unit,
        depth + Math.sin(driftTime * .36 + phase) * 16 * floatScale,
      );
      object.rotation.set(
        (button.dataset.shape === 'cube' ? .4 : button.dataset.shape === 'crown' ? .55 : .12) + Math.sin(driftTime * .32 + phase) * .18 * floatScale + reaction.x + wake.y * .012,
        (button.dataset.shape === 'cube' ? .6 : .2) + Math.sin(driftTime * .27 + phase * 1.4) * .27 * floatScale + (portrait && button.dataset.shape !== 'starburst' ? time * .28 : 0) + reaction.y + wake.x * .012,
        (button.dataset.shape === 'crown' ? -.22 : 0) + (portrait && button.dataset.shape === 'starburst' ? time * .22 : 0) + Math.sin(driftTime * .36 + phase) * .21 * floatScale,
      );
      const entrance = Number(button.style.getPropertyValue('--shape-entrance-scale') || 1);
      object.scale.setScalar(size * unit * shapeScale * reaction.scale * entrance);
      projected.copy(object.position).project(camera);
      const screenX = (projected.x + 1) * viewportWidth / 2 - (viewportWidth - width) / 2;
      const screenY = (1 - projected.y) * viewportHeight / 2 - (viewportHeight - height) / 2;
      item.screenX = screenX;
      item.screenY = screenY;
      const hitSize = Math.max(44, size * camera.position.z / (camera.position.z - object.position.z) * 1.3);
      button.style.width = button.style.height = `${hitSize}px`;
      button.style.transform = `translate(-50%, -50%) translate3d(${screenX - x}px, ${screenY - y}px, 0)`;
    }
    renderer.render(scene, camera);
  };
  const sync = () => {
    const active = visible && !document.hidden && !reduced.matches && getComputedStyle(root).visibility !== 'hidden';
    for (const item of items) {
      item.animation?.paused(!active);
      item.wakeAnimation?.paused(!active);
    }
    last = 0;
    if (active) draw(performance.now());
    renderer?.setAnimationLoop(active ? draw : null);
  };
  const resize = () => {
    if (!renderer) return;
    cancel();
    pointer = undefined;
    width = root.clientWidth;
    height = root.clientHeight;
    if (!width || !height) return;
    viewportWidth = canvas.clientWidth;
    viewportHeight = canvas.clientHeight;
    camera.aspect = viewportWidth / viewportHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    unit = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / viewportHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(viewportWidth, viewportHeight, false);
    for (const item of items) {
      const style = getComputedStyle(item.button);
      item.x = parseFloat(style.left);
      item.y = parseFloat(style.top);
      item.depth = Number(style.getPropertyValue('--shape-depth'));
      item.size = parseFloat(style.getPropertyValue('--shape-size'));
      item.object.visible = style.display !== 'none';
    }
    draw(performance.now());
  };
  const dispose = () => {
    releaseCapture();
    pointer = undefined;
    renderer?.setAnimationLoop(null);
    items.forEach((item) => { item.animation?.kill(); item.wakeAnimation?.kill(); });
    geometries.splice(0).forEach((geometry) => geometry.dispose());
    materials.splice(0).forEach((material) => material.dispose());
    scene.clear();
    renderer?.dispose();
    renderer = undefined;
    items = [];
    for (const button of buttons) {
      button.disabled = true;
      button.style.removeProperty('transform');
      button.style.removeProperty('width');
      button.style.removeProperty('height');
    }
  };
  const mount = () => {
    dispose();
    root.dataset.state = reduced.matches ? 'static' : 'loading';
    if (reduced.matches) return;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      const styles = getComputedStyle(root);
      renderer.setClearColor(styles.getPropertyValue('--color-background').trim(), 0);
      const color = new THREE.Color(styles.getPropertyValue('--color-text').trim());
      items = buttons.map((button, index) => {
        const style = getComputedStyle(button);
        const material = new THREE.MeshBasicMaterial({ color: style.getPropertyValue('--shape-color').trim() || color, transparent: true, opacity: Number(style.getPropertyValue('--shape-opacity')) });
        materials.push(material);
        const object = createMotif(button.dataset.shape!, material, geometries);
        scene.add(object);
        button.disabled = false;
        return {
          object, button, phase: index * 2.399, x: 0, y: 0, depth: 0, size: 0, time: 0, screenX: 0, screenY: 0,
          ignoreClick: false, offset: { x: 0, y: 0 }, wake: { x: 0, y: 0 }, reaction: { x: 0, y: 0, scale: 1 },
        };
      });
      resize();
      root.dataset.state = 'ready';
      sync();
    } catch {
      dispose();
      root.dataset.state = 'fallback';
    }
  };
  const settled = (item: Item) => {
    item.reaction.x %= Math.PI * 2;
    item.reaction.y %= Math.PI * 2;
    item.animation = undefined;
    draw(performance.now());
    sync();
  };
  const click = (event: MouseEvent) => {
    const item = items.find((entry) => entry.button === event.currentTarget);
    if (!item || reduced.matches) return;
    const ignore = item.ignoreClick && event.detail > 0;
    item.ignoreClick = false;
    if (ignore) return;
    item.animation?.kill();
    item.animation = gsap.timeline({ onComplete: () => settled(item) })
      .to(item.reaction, { x: item.reaction.x + Math.PI * 2, y: item.reaction.y + Math.PI * 2, duration: 1.2, ease: 'power3.out' }, 0)
      .to(item.reaction, { scale: 1.24, duration: .16, ease: 'power2.out' }, 0)
      .to(item.reaction, { scale: 1, duration: .8, ease: 'elastic.out(1, .5)' }, .16);
    sync();
  };
  const releaseCapture = () => {
    const current = grab;
    grab = undefined;
    if (current) {
      delete current.item.button.dataset.grabbing;
      if (current.item.button.hasPointerCapture(current.pointer)) current.item.button.releasePointerCapture(current.pointer);
    }
    return current;
  };
  const finishGrab = (cancelled: boolean) => {
    const current = releaseCapture();
    if (!current) return;
    const { item } = current;
    const momentum = !cancelled && current.moved && performance.now() - current.lastTime < 120 ? .18 : 0;
    item.ignoreClick = current.moved || cancelled;
    item.animation?.kill();
    item.animation = gsap.timeline({ onComplete: () => settled(item) })
      .to(item.reaction, { x: item.reaction.x + current.velocityX * momentum, y: item.reaction.y + current.velocityY * momentum, duration: .9, ease: 'power3.out' }, 0)
      .to(item.reaction, { scale: 1, duration: .7, ease: 'elastic.out(1, .65)' }, 0)
      .to(item.offset, { x: 0, y: 0, duration: 1.05, ease: 'elastic.out(1, .65)' }, 0);
    pointer = undefined;
    sync();
  };
  const cancel = (event?: Event) => {
    if (!(event instanceof PointerEvent) || grab?.pointer === event.pointerId) finishGrab(true);
  };
  const up = (event: PointerEvent) => { if (grab?.pointer === event.pointerId) finishGrab(false); };
  const down = (event: PointerEvent) => {
    const item = items.find((entry) => entry.button === event.currentTarget);
    if (!item || reduced.matches || grab || !event.isPrimary || event.button !== 0) return;
    item.ignoreClick = false;
    item.animation?.kill();
    item.wakeAnimation?.kill();
    item.wakeAnimation = undefined;
    item.offset.x += item.wake.x;
    item.offset.y += item.wake.y;
    item.wake.x = item.wake.y = 0;
    grab = {
      item, pointer: event.pointerId, x: event.clientX, y: event.clientY, rotationX: item.reaction.x, rotationY: item.reaction.y,
      offsetX: item.offset.x, offsetY: item.offset.y, lastX: event.clientX, lastY: event.clientY,
      lastTime: performance.now(), velocityX: 0, velocityY: 0, moved: false,
    };
    item.button.setPointerCapture(event.pointerId);
    item.button.dataset.grabbing = '';
    item.animation = gsap.timeline({ onComplete: () => settled(item) }).to(item.reaction, { scale: 1.08, duration: .16, ease: 'power2.out' });
    sync();
  };
  const move = (event: PointerEvent) => {
    if (grab) {
      if (grab.pointer !== event.pointerId) return;
      const dx = event.clientX - grab.x, dy = event.clientY - grab.y;
      if (!grab.moved && Math.hypot(dx, dy) < 5) return;
      grab.moved = true;
      const now = performance.now(), delta = Math.max((now - grab.lastTime) / 1000, .008);
      const limit = width < 768 ? 12 : 26;
      const bottom = !portrait && width < 768 && ['cube', 'chevrons'].includes(grab.item.button.dataset.shape!) ? 0 : limit;
      grab.item.offset.x = THREE.MathUtils.clamp(grab.offsetX + dx * .35, -limit, limit);
      grab.item.offset.y = THREE.MathUtils.clamp(grab.offsetY + dy * .35, -limit, bottom);
      grab.item.reaction.x = grab.rotationX + dy * .012;
      grab.item.reaction.y = grab.rotationY + dx * .012;
      grab.velocityX = THREE.MathUtils.clamp((event.clientY - grab.lastY) / delta * .012, -10, 10);
      grab.velocityY = THREE.MathUtils.clamp((event.clientX - grab.lastX) / delta * .012, -10, 10);
      grab.lastX = event.clientX;
      grab.lastY = event.clientY;
      grab.lastTime = now;
      return;
    }
    if (!visible || document.hidden || reduced.matches || event.pointerType !== 'mouse') return;
    const previous = pointer;
    pointer = { x: event.clientX, y: event.clientY };
    if (!previous) return;
    const bounds = root.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (x < 0 || x > width || y < 0 || y > height) return;
    for (const item of items) {
      if (!item.object.visible) continue;
      const proximity = Math.max(0, 1 - Math.hypot(x - item.screenX, y - item.screenY) / 120);
      if (!proximity) continue;
      const dx = THREE.MathUtils.clamp((event.clientX - previous.x) * .45, -8, 8) * proximity;
      let dy = THREE.MathUtils.clamp((event.clientY - previous.y) * .45, -8, 8) * proximity;
      if (!portrait && width < 768 && ['cube', 'chevrons'].includes(item.button.dataset.shape!)) dy = Math.min(0, dy);
      item.wakeAnimation?.kill();
      item.wakeAnimation = gsap.timeline({ onComplete: () => { item.wakeAnimation = undefined; } })
        .to(item.wake, { x: dx, y: dy, duration: .18, ease: 'power2.out' })
        .to(item.wake, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .7)' });
    }
  };
  const onScroll = () => { cancel(); pointer = undefined; targetScroll = Math.min(window.scrollY, host.offsetHeight); };
  const visibility = () => { if (document.hidden) { cancel(); pointer = undefined; } sync(); };
  const lost = (event: Event) => {
    event.preventDefault();
    dispose();
    root.dataset.state = 'fallback';
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) cancel(); sync(); }, { threshold: .05 });
  let revealed = styles.visibility !== 'hidden';
  const reveal = new MutationObserver(() => {
    const next = getComputedStyle(root).visibility !== 'hidden';
    if (next === revealed) return;
    revealed = next;
    sync();
  });
  const sizes = new ResizeObserver(resize);
  const stop = () => {
    dispose();
    root.dataset.state = 'static';
    observer.disconnect();
    reveal.disconnect();
    sizes.disconnect();
    buttons.forEach((button) => {
      button.removeEventListener('click', click);
      button.removeEventListener('pointerdown', down);
      button.removeEventListener('lostpointercapture', cancel);
    });
    reduced.removeEventListener('change', mount);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', mount);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', stop);
  };
  buttons.forEach((button) => {
    button.addEventListener('click', click);
    button.addEventListener('pointerdown', down);
    button.addEventListener('lostpointercapture', cancel);
  });
  reduced.addEventListener('change', mount);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', mount);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', cancel);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', stop);
  observer.observe(host);
  reveal.observe(root, { attributes: true, attributeFilter: ['style'] });
  // The portrait entrance reveals the parent after the shape entrance has finished.
  reveal.observe(host, { attributes: true, attributeFilter: ['style'] });
  sizes.observe(root);
  sizes.observe(canvas);
  mount();
  return stop;
}

