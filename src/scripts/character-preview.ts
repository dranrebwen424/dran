import { Rive, RuntimeLoader, Layout, Fit, Alignment, EventType } from '@rive-app/canvas';
import type { ViewModelInstanceNumber } from '@rive-app/canvas';
import wasmUrl from '@rive-app/canvas/rive.wasm?url';
import fallbackWasmUrl from '@rive-app/canvas/rive_fallback.wasm?url';
import { gsap } from 'gsap';

RuntimeLoader.setWasmUrl(wasmUrl);
RuntimeLoader.setWasmFallbackUrl(fallbackWasmUrl);

function startCharacter(stage: HTMLElement) {
  const shell = stage.querySelector<HTMLElement>('.button-shell')!;
  const character = stage.querySelector<HTMLElement>('.character')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('.character-canvas')!;
  const fallback = stage.querySelector<HTMLImageElement>('.character-fallback')!;
  const button = stage.querySelector<HTMLElement>('[data-character-button]')!;
  const pauseButton = document.querySelector<HTMLButtonElement>('.pause-button');
  const readout = document.querySelector<HTMLElement>('.motion-readout');
  const status = stage.querySelector<HTMLElement>('.load-status') ?? document.querySelector<HTMLElement>('.load-status')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setX = gsap.quickSetter(character, 'x', 'px');
  let instance: Rive | undefined;
  let pose: ViewModelInstanceNumber | null = null;
  let ready = false;
  let failed = false;
  let manuallyPaused = false;
  let visible = true;
  let hovering = false;
  let singleStrike = false;
  let mode: 'idle' | 'walk' | 'rush' | 'hammer' = 'idle';
  let activity: 'patrol' | 'rush' | 'plant' | 'hammer' = 'patrol';
  let direction: 'left' | 'right' = 'right';
  let x = shell.clientWidth / 2;
  let walkRemaining = 1.4 + Math.random() * 2.2;
  let pauseRemaining = 0;
  let targetX: number | null = null;
  let plantRemaining = 0;
  let strikes = 0;
  let tickActive = false;

  function updateReadout() {
    stage.dataset.mode = mode;
    stage.dataset.direction = direction;
    stage.dataset.activity = activity;
    const action = activity === 'plant' ? 'Planting feet' : mode === 'rush' ? 'Rushing' : mode[0].toUpperCase() + mode.slice(1);
    if (readout) readout.textContent = `${action} · facing ${direction}`;
  }

  function setPose(next: typeof mode, facing = direction) {
    if (mode === next && direction === facing) {
      if (stage.dataset.activity !== activity) updateReadout();
      return;
    }
    mode = next;
    direction = facing;
    if (pose) pose.value = mode === 'rush' ? (direction === 'left' ? 7 : 6)
      : ['idle', 'walk', 'hammer'].indexOf(mode) + (direction === 'left' ? 3 : 0);
    updateReadout();
  }

  function canAnimate() {
    return ready && !failed && !manuallyPaused && !reduced.matches && visible && !document.hidden;
  }

  function tick(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (hovering && targetX !== null) {
      const distance = targetX - x;
      if (Math.abs(distance) > 2) {
        activity = 'rush';
        setPose('rush', distance > 0 ? 'right' : 'left');
        x += Math.sign(distance) * Math.min(Math.abs(distance), 220 * dt);
        setX(x - shell.clientWidth / 2);
        if (Math.abs(targetX - x) <= 2) {
          x = targetX;
          setX(x - shell.clientWidth / 2);
          plantFeet();
        }
        return;
      }
      if (activity === 'rush' || activity === 'patrol') plantFeet();
      if (activity === 'plant') {
        plantRemaining -= dt;
        if (plantRemaining <= 0) {
          activity = 'hammer';
          setPose('hammer');
        }
      }
      return;
    }
    // A departure during a strike waits for Rive's recovery event.
    if (singleStrike || activity === 'hammer') return;
    if (activity !== 'patrol') resumeWalking();
    if (pauseRemaining > 0) {
      pauseRemaining -= dt;
      if (pauseRemaining <= 0) resumeWalking();
      else setPose('idle');
      return;
    }
    setPose('walk');
    x = gsap.utils.clamp(34, shell.clientWidth - 34, x + (direction === 'right' ? 62 : -62) * dt);
    setX(x - shell.clientWidth / 2);
    walkRemaining -= dt;
    if (x <= 34 || x >= shell.clientWidth - 34) {
      setPose('idle', direction === 'right' ? 'left' : 'right');
      pauseRemaining = .95 + Math.random() * 1.45;
    } else if (walkRemaining <= 0) {
      setPose('idle');
      pauseRemaining = .95 + Math.random() * 1.45;
    }
  }

  function syncPlayback() {
    const run = canAnimate();
    if (run && !tickActive) {
      instance?.play('Character Controller');
      gsap.ticker.add(tick);
      tickActive = true;
    } else if (!run) {
      gsap.ticker.remove(tick);
      tickActive = false;
      instance?.pause();
      gsap.killTweensOf(button);
      gsap.set(button, { clearProps: 'transform' });
    }
    const staticView = reduced.matches || failed;
    canvas.hidden = !ready || staticView;
    fallback.hidden = ready && !staticView;
    if (pauseButton) {
      pauseButton.disabled = !ready || staticView;
      pauseButton.textContent = manuallyPaused ? 'Resume animation' : 'Pause animation';
      pauseButton.setAttribute('aria-pressed', String(manuallyPaused));
    }
    if (reduced.matches) status.textContent = 'Reduced motion: showing the static character.';
    else if (ready && !failed) status.textContent = manuallyPaused ? 'Animation paused.' : 'Ready — hover to lead the character, or tap for one strike.';
  }

  function resumeWalking() {
    activity = 'patrol';
    walkRemaining = 1.4 + Math.random() * 2.2;
    pauseRemaining = 0;
    const facing = x <= 34 ? 'right' : x >= shell.clientWidth - 34 ? 'left' : direction;
    setPose('walk', facing);
  }

  function plantFeet(facing = direction) {
    if (targetX !== null) {
      x = targetX;
      setX(x - shell.clientWidth / 2);
    }
    activity = 'plant';
    plantRemaining = .12;
    setPose('idle', facing);
  }

  function followPointer(clientX: number) {
    hovering = true;
    singleStrike = false;
    const pointerX = clientX - shell.getBoundingClientRect().left;
    targetX = gsap.utils.clamp(34, shell.clientWidth - 34, pointerX);
    const facing = pointerX > x ? 'right' : pointerX < x ? 'left' : direction;
    if (Math.abs(targetX - x) > 2) {
      activity = 'rush';
      setPose('rush', facing);
    } else if (activity === 'patrol' || activity === 'rush') plantFeet(facing);
  }

  function load() {
    if (instance || reduced.matches) return;
    instance = new Rive({
      src: '/animations/character-preview.riv',
      canvas,
      artboard: 'Character',
      stateMachine: 'Character Controller',
      autoBind: true,
      autoplay: false,
      shouldDisableRiveListeners: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        pose = instance!.viewModelInstance?.number('pose') ?? null;
        if (!pose) { fail(); return; }
        ready = true;
        stage.dataset.ready = 'true';
        syncPlayback();
        instance!.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio, 2));
      },
      onLoadError: fail,
    });
    // shortcut: Rive 2.x events synchronize contact; migrate to bound trigger observers before Rive 3.
    instance.on(EventType.RiveEvent, (event) => {
      const data = event.data;
      if (!canAnimate() || !data || typeof data !== 'object' || !('name' in data)) return;
      if (data.name === 'hammer-impact' && mode === 'hammer') {
        stage.dataset.strikes = String(++strikes);
        gsap.fromTo(button, { y: button.offsetHeight * .07 }, {
          y: 0, duration: 0.2, ease: 'elastic.out(1, 1)', overwrite: true,
        });
      }
      if (data.name === 'hammer-recovered' && mode === 'hammer') {
        singleStrike = false;
        if (!hovering) resumeWalking();
      }
    });
  }

  function fail() {
    failed = true;
    stage.dataset.ready = 'error';
    status.textContent = 'The animation could not load. The static character and button are still available.';
    syncPlayback();
  }

  shell.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && canAnimate()) {
      followPointer(event.clientX);
    }
  });
  shell.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch' && canAnimate()) followPointer(event.clientX);
  });
  shell.addEventListener('pointerleave', () => {
    hovering = false;
    targetX = null;
    if (canAnimate() && activity !== 'hammer') resumeWalking();
  });
  button.addEventListener('click', () => {
    if (!canAnimate() || hovering || singleStrike) return;
    singleStrike = true;
    activity = 'hammer';
    setPose('hammer');
  });
  pauseButton?.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    syncPlayback();
  });

  const observer = new ResizeObserver(() => {
    x = gsap.utils.clamp(34, shell.clientWidth - 34, x);
    if (targetX !== null) targetX = gsap.utils.clamp(34, shell.clientWidth - 34, targetX);
    setX(x - shell.clientWidth / 2);
    if (ready) instance?.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio, 2));
  });
  observer.observe(shell);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  });
  visibility.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hovering = false; singleStrike = false; targetX = null; }
    syncPlayback();
  });
  reduced.addEventListener('change', () => {
    hovering = false;
    singleStrike = false;
    targetX = null;
    activity = 'patrol';
    walkRemaining = 1.4 + Math.random() * 2.2;
    pauseRemaining = 0;
    setPose('idle');
    load();
    syncPlayback();
  });
  window.addEventListener('pagehide', (event) => {
    gsap.ticker.remove(tick);
    tickActive = false;
    instance?.pause();
    gsap.killTweensOf(button);
    if (!event.persisted) {
      observer.disconnect();
      visibility.disconnect();
      instance?.cleanup();
    }
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) syncPlayback(); });

  setX(x - shell.clientWidth / 2);
  load();
  syncPlayback();
}

document.querySelectorAll<HTMLElement>('[data-character-stage]').forEach(startCharacter);
