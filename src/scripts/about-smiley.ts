import { Rive, RuntimeLoader, Layout, Fit, Alignment } from '@rive-app/canvas';
import wasmUrl from '@rive-app/canvas/rive.wasm?url';
import fallbackWasmUrl from '@rive-app/canvas/rive_fallback.wasm?url';
import { gsap } from 'gsap';

RuntimeLoader.setWasmUrl(wasmUrl);
RuntimeLoader.setWasmFallbackUrl(fallbackWasmUrl);

function mountSmiley() {
  const stage = document.querySelector<HTMLElement>('.about-smiley');
  if (!stage) return;
  const face = stage.querySelector<HTMLButtonElement>('.smiley-face')!;
  const canvas = stage.querySelector('canvas')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const listeners = new AbortController();
  const gaze = { x: 0, y: 0 };
  let rive: Rive | undefined;
  let visible = false;
  let disposed = false;
  let ready = false;
  let failed = false;
  let reacting = false;
  let touchInput = false;
  let previousLook = -1;
  let lastPointer: { x: number; y: number } | undefined;
  let lookCall: gsap.core.Tween | undefined;
  let blinkCall: gsap.core.Tween | undefined;
  let expressionCall: gsap.core.Tween | undefined;
  const canPlay = () => ready && !failed && visible && !document.hidden && !reduced.matches;
  const number = (name: string, value: number) => {
    const property = rive?.viewModelInstance?.number(name);
    if (property) property.value = value;
  };
  const writeGaze = () => {
    number('eyesX', gaze.x); number('eyesY', gaze.y);
    number('mouthX', gaze.x); number('mouthY', gaze.y);
  };
  const expression = (value: number) => {
    number('expression', value);
    stage.dataset.expression = ['idle', 'giggle', 'blink'][value];
  };
  const queueLook = () => {
    if (!canPlay() || reacting || lookCall || !(coarse.matches || touchInput)) return;
    lookCall = gsap.delayedCall(1 + Math.random() * 2.2, () => {
      lookCall = undefined;
      if (!canPlay() || reacting) return;
      const directions = [[0, 0], [-4, -2], [4, -2], [-4, 2], [4, 2], [0, -3], [0, 3]];
      let index = Math.floor(Math.random() * (directions.length - 1));
      if (index >= previousLook) index++;
      if (previousLook < 0) index = Math.floor(Math.random() * directions.length);
      previousLook = index;
      const [x, y] = directions[index];
      gsap.to(gaze, { x, y, duration: .45 + Math.random() * .3, ease: 'power2.inOut', overwrite: true, onUpdate: writeGaze, onComplete: queueLook });
    });
  };
  const queueBlink = () => {
    if (!canPlay() || reacting || blinkCall || expressionCall) return;
    blinkCall = gsap.delayedCall(2.4 + Math.random() * 3.6, () => {
      blinkCall = undefined;
      if (!canPlay() || reacting) return;
      expression(2);
      expressionCall = gsap.delayedCall(.48, () => {
        expressionCall = undefined;
        expression(0);
        queueBlink();
      });
    });
  };
  const settle = () => {
    lookCall?.kill(); blinkCall?.kill(); expressionCall?.kill();
    lookCall = blinkCall = expressionCall = undefined;
    reacting = false;
    gsap.killTweensOf(gaze);
    gaze.x = gaze.y = 0;
    writeGaze();
    expression(0);
  };
  const sync = () => {
    face.disabled = !ready || failed || reduced.matches;
    if (canPlay()) {
      rive?.play('Smiley Controller');
      stage.dataset.motion = 'playing';
      queueLook(); queueBlink();
    } else {
      settle();
      rive?.pause();
      stage.dataset.motion = reduced.matches || failed || !ready ? 'static' : 'paused';
    }
  };
  const fail = () => {
    failed = true;
    stage.dataset.ready = 'error';
    sync();
  };
  const load = () => {
    if (rive || disposed || failed || reduced.matches || !visible) return;
    try {
      rive = new Rive({
        src: '/animations/about-smiley.riv', canvas, artboard: 'Smiley',
        stateMachine: 'Smiley Controller', autoBind: true, autoplay: false,
        shouldDisableRiveListeners: true,
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          if (!rive?.viewModelInstance?.number('expression')) { fail(); return; }
          ready = true;
          stage.dataset.ready = 'true';
          canvas.width = canvas.height = 28;
          rive.resizeToCanvas();
          sync();
        },
        onLoadError: fail,
      });
    } catch { fail(); }
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    load(); sync();
  });
  observer.observe(stage);
  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') { touchInput = true; queueLook(); }
  }, { signal: listeners.signal });
  document.addEventListener('pointermove', (event) => {
    if (!canPlay() || !fine.matches || event.pointerType === 'touch') return;
    touchInput = false;
    lookCall?.kill(); lookCall = undefined;
    const box = face.getBoundingClientRect();
    lastPointer = {
      x: gsap.utils.clamp(-5, 5, (event.clientX - box.x - box.width / 2) / (innerWidth / 2) * 5),
      y: gsap.utils.clamp(-4, 4, (event.clientY - box.y - box.height / 2) / (innerHeight / 2) * 4),
    };
    if (reacting) return;
    gsap.to(gaze, {
      ...lastPointer,
      duration: .3, ease: 'power2.out', overwrite: true, onUpdate: writeGaze,
    });
  }, { signal: listeners.signal });
  const resetGaze = () => {
    lastPointer = undefined;
    if (canPlay() && !reacting && !(coarse.matches || touchInput)) gsap.to(gaze, { x: 0, y: 0, duration: .4, overwrite: true, onUpdate: writeGaze });
  };
  document.addEventListener('pointerout', (event) => { if (!event.relatedTarget) resetGaze(); }, { signal: listeners.signal });
  window.addEventListener('blur', resetGaze, { signal: listeners.signal });
  face.addEventListener('click', () => {
    if (!canPlay() || reacting) return;
    reacting = true;
    lookCall?.kill(); blinkCall?.kill(); expressionCall?.kill();
    lookCall = blinkCall = expressionCall = undefined;
    gsap.to(gaze, { x: 0, y: 0, duration: .2, ease: 'power2.out', overwrite: true, onUpdate: writeGaze });
    expression(1);
    expressionCall = gsap.delayedCall(1.75, () => {
      expressionCall = undefined;
      reacting = false;
      expression(0);
      if (lastPointer && !(coarse.matches || touchInput)) gsap.to(gaze, { ...lastPointer, duration: .45, overwrite: true, onUpdate: writeGaze });
      queueLook(); queueBlink();
    });
  }, { signal: listeners.signal });
  document.addEventListener('visibilitychange', sync, { signal: listeners.signal });
  reduced.addEventListener('change', () => { load(); sync(); }, { signal: listeners.signal });
  coarse.addEventListener('change', () => { settle(); sync(); }, { signal: listeners.signal });
  window.addEventListener('pagehide', () => {
    disposed = true;
    settle();
    listeners.abort(); observer.disconnect();
    rive?.cleanup();
    stage.dataset.ready = 'loading';
    stage.dataset.motion = 'static';
    face.disabled = true;
  }, { signal: listeners.signal, once: true });
  sync();
}

mountSmiley();
window.addEventListener('pageshow', (event) => { if (event.persisted) mountSmiley(); });
