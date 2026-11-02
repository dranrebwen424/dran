import type { DotLottieWorker } from '@lottiefiles/dotlottie-web';

const section = document.querySelector<HTMLElement>('#motion-graphics')!;
const videos = [...section.querySelectorAll<HTMLVideoElement>('.motion-gallery video')];
const card = section.querySelector<HTMLElement>('[data-lottie-card]')!;
const poster = card.querySelector<HTMLImageElement>('.lottie-poster')!;
const previewHost = card.querySelector<HTMLCanvasElement>('canvas')!.parentElement!;
const links = [...section.querySelectorAll<HTMLAnchorElement>('[data-motion-open]')];
const dialog = section.querySelector<HTMLDialogElement>('.motion-modal')!;
const modalVideo = dialog.querySelector<HTMLVideoElement>('video')!;
const modalLottie = dialog.querySelector<HTMLElement>('.motion-modal-lottie')!;
const modalPoster = modalLottie.querySelector<HTMLImageElement>('img')!;
const modalToggle = dialog.querySelector<HTMLButtonElement>('.motion-lottie-toggle')!;
const closeButton = dialog.querySelector<HTMLButtonElement>('.motion-modal-close')!;
const modalError = dialog.querySelector<HTMLElement>('.motion-modal-error')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function mount() {
  // Transferred canvases cannot be transferred again after a BFCache remount.
  const previousCanvas = previewHost.querySelector<HTMLCanvasElement>('canvas')!;
  const canvas = previousCanvas.cloneNode() as HTMLCanvasElement;
  previousCanvas.replaceWith(canvas);
  let player: DotLottieWorker | undefined;
  let loading = false, loaded = false, failed = false, stopped = false;
  let enlarged = false, modalPaused = false, backdropDown = false;
  let opener: HTMLAnchorElement | undefined;
  let previousOverflow = '';
  const visible = new Set<Element>();
  const showLottie = () => {
    poster.hidden = loaded && !enlarged;
    modalPoster.hidden = loaded;
  };
  const fail = () => {
    void player?.destroy().catch(() => {});
    player = undefined;
    if (stopped) return;
    failed = true;
    loading = loaded = false;
    canvas.hidden = true;
    showLottie();
    card.querySelector<HTMLElement>('.media-error')!.hidden = false;
    if (enlarged) modalError.hidden = false;
  };
  async function loadLottie() {
    if (player || loading || failed) return;
    loading = true;
    try {
      if (!canvas.transferControlToOffscreen || typeof Worker === 'undefined') throw new Error('Lottie worker unavailable');
      const [{ DotLottieWorker }, { default: wasm }] = await Promise.all([
        import('@lottiefiles/dotlottie-web'),
        import('@lottiefiles/dotlottie-web/dotlottie-player.wasm?url'),
      ]);
      if (stopped) return;
      DotLottieWorker.setWasmUrl(new URL(wasm, location.href).href);
      canvas.hidden = false;
      // Decode at preview size before expanding the worker's drawing surface.
      if (enlarged) previewHost.append(canvas);
      player = new DotLottieWorker({
        canvas, src: new URL('/motion-graphics/floating-pen-loop-visible-motion.lottie', location.href).href, autoplay: false, loop: true,
        layout: { fit: enlarged ? 'contain' : 'cover', align: [.5, .5] },
        renderConfig: { devicePixelRatio: Math.min(devicePixelRatio, 1.5), freezeOnOffscreen: true },
      });
      if (enlarged) modalLottie.append(canvas);
      player.addEventListener('load', () => {
        if (stopped) { void player?.destroy().catch(() => {}); return; }
        void player?.setLayout({ fit: enlarged ? 'contain' : 'cover', align: [.5, .5] }).then(() => player?.resize()).then(() => {
          if (stopped) return;
          loading = false;
          loaded = true;
          showLottie();
          sync();
        }).catch(fail);
      });
      player.addEventListener('loadError', fail);
      player.addEventListener('renderError', fail);
    } catch { if (!stopped) fail(); }
  }
  function sync() {
    if (stopped) return;
    const previewPlaying = !reduced.matches && !document.hidden && !dialog.open;
    videos.forEach(video => {
      video.muted = true;
      if (previewPlaying && visible.has(video)) {
        if (video.paused) void video.play().catch(() => {});
      } else if (!video.paused) video.pause();
    });
    // Keep the heavier Lottie setup out of the heading's letter entrance.
    const lottiePlaying = !document.hidden && (enlarged ? !modalPaused : previewPlaying && visible.has(card) && section.dataset.entrance === 'done');
    if (lottiePlaying) {
      void loadLottie();
      if (loaded && !player?.isPlaying) void player?.play().catch(fail);
    } else void player?.pause().catch(fail);
    modalToggle.textContent = modalPaused ? 'Play animation' : 'Pause animation';
    modalToggle.setAttribute('aria-pressed', String(modalPaused));
  }
  const restoreModal = () => {
    if (dialog.open) return;
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    enlarged = false;
    previewHost.append(canvas);
    if (player?.isLoaded) void player.setLayout({ fit: 'cover', align: [.5, .5] }).then(() => player?.resize()).catch(fail);
    showLottie();
    document.documentElement.style.overflow = previousOverflow;
    if (!stopped) opener?.focus({ preventScroll: true });
    sync();
  };
  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = event.currentTarget as HTMLAnchorElement;
    enlarged = opener.dataset.motionOpen === 'lottie';
    modalPaused = false;
    modalVideo.hidden = enlarged;
    modalLottie.hidden = modalToggle.hidden = !enlarged;
    modalError.hidden = true;
    modalError.querySelector<HTMLAnchorElement>('a')!.href = opener.href;
    dialog.querySelector<HTMLElement>('#motion-modal-title')!.textContent = opener.dataset.title!;
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    if (enlarged) {
      modalLottie.append(canvas);
      if (player?.isLoaded) void player.setLayout({ fit: 'contain', align: [.5, .5] }).then(() => player?.resize()).catch(fail);
      showLottie();
      if (failed) modalError.hidden = false;
    } else {
      const preview = opener.closest('figure')!.querySelector<HTMLVideoElement>('video')!;
      modalVideo.poster = preview.poster;
      modalVideo.src = opener.href;
      modalVideo.currentTime = preview.currentTime;
      modalVideo.muted = false;
      modalVideo.volume = 1;
      void modalVideo.play().catch(() => {});
    }
    sync();
  };
  const close = () => dialog.close();
  const outside = (event: MouseEvent) => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  const pointerDown = (event: PointerEvent) => { backdropDown = event.target === dialog && outside(event); };
  const backdrop = (event: MouseEvent) => { if (backdropDown && event.target === dialog && outside(event)) close(); };
  const toggleModal = () => { modalPaused = !modalPaused; sync(); };
  const onVideoError = (event: Event) => {
    (event.currentTarget as HTMLElement).closest('figure')!.querySelector<HTMLElement>('.media-error')!.hidden = false;
  };
  const modalVideoError = () => { if (dialog.open && !enlarged && modalVideo.hasAttribute('src')) modalError.hidden = false; };
  const visibility = () => { if (document.hidden) modalVideo.pause(); sync(); };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
    sync();
  });
  const entranceObserver = new MutationObserver(sync);
  entranceObserver.observe(section, { attributes: true, attributeFilter: ['data-entrance'] });
  observer.observe(card);
  videos.forEach(video => {
    observer.observe(video);
    video.addEventListener('error', onVideoError);
    video.querySelector('source')!.addEventListener('error', onVideoError);
  });
  card.querySelector<HTMLElement>('.media-error')!.hidden = true;
  links.forEach(link => link.addEventListener('click', open));
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', restoreModal);
  dialog.addEventListener('pointerdown', pointerDown);
  dialog.addEventListener('click', backdrop);
  modalToggle.addEventListener('click', toggleModal);
  modalVideo.addEventListener('error', modalVideoError);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', sync);
  sync();
  const stop = () => {
    stopped = true;
    if (dialog.open) { dialog.close(); restoreModal(); }
    videos.forEach(video => video.pause());
    void player?.destroy().catch(() => {});
    canvas.hidden = true;
    poster.hidden = false;
    observer.disconnect();
    entranceObserver.disconnect();
    links.forEach(link => link.removeEventListener('click', open));
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('close', restoreModal);
    dialog.removeEventListener('pointerdown', pointerDown);
    dialog.removeEventListener('click', backdrop);
    modalToggle.removeEventListener('click', toggleModal);
    modalVideo.removeEventListener('error', modalVideoError);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', sync);
    videos.forEach(video => {
      video.removeEventListener('error', onVideoError);
      video.querySelector('source')!.removeEventListener('error', onVideoError);
    });
    window.removeEventListener('pagehide', stop);
  };
  window.addEventListener('pagehide', stop);
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
