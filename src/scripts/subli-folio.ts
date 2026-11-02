import { startFolio } from './folio';

const section = document.querySelector<HTMLElement>('#sublimation')!;
startFolio(section);

function mountCarousel() {
  const carousel = section.querySelector<HTMLElement>('.subli-carousel')!;
  const gallery = section.querySelector<HTMLElement>('.subli-gallery')!;
  const track = gallery.querySelector<HTMLElement>('.subli-track')!;
  const dialog = section.querySelector<HTMLDialogElement>('dialog')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let press: { id: number; x: number; y: number; scroll: number; time: number; span: number; duration: number; animation?: Animation; moved: boolean } | undefined;
  let suppressClick = false;
  let visible = false;
  const sync = () => {
    carousel.toggleAttribute('data-carousel-paused', !visible || document.hidden || dialog.open || reduced.matches || !!press);
    if (!reduced.matches && !carousel.hasAttribute('data-carousel-browsing')) gallery.scrollLeft = 0;
  };
  const focus = (event: FocusEvent) => {
    if (press) return;
    const card = event.target instanceof Element ? event.target.closest<HTMLElement>('.subli-card') : null;
    if (!card || card.closest('[aria-hidden]')) return;
    carousel.setAttribute('data-carousel-browsing', '');
    card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const blur = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Element) || !event.relatedTarget.closest('.subli-card')) {
      carousel.removeAttribute('data-carousel-browsing');
      sync();
    }
  };
  const end = (event?: PointerEvent) => {
    if (!press || (event && event.pointerId !== press.id)) return;
    const released = press;
    press = undefined;
    suppressClick = released.moved;
    if (gallery.hasPointerCapture(released.id)) gallery.releasePointerCapture(released.id);
    carousel.removeAttribute('data-carousel-dragging');
    sync();
  };
  const down = (event: PointerEvent) => {
    if (!event.isPrimary) return end();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    suppressClick = false;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: gallery.scrollLeft, time: 0, span: 0, duration: 0, moved: false };
    sync();
    press.animation = track.getAnimations()[0];
    press.time = Number(press.animation?.currentTime ?? 0);
    press.duration = Number(press.animation?.effect?.getComputedTiming().duration ?? 0);
    press.span = track.querySelector<HTMLElement>('.subli-group')!.getBoundingClientRect().width;
  };
  const move = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (!press.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) return end();
      press.moved = true;
      gallery.setPointerCapture(event.pointerId);
      carousel.setAttribute('data-carousel-dragging', '');
    }
    event.preventDefault();
    if (press.animation && press.duration && press.span) {
      const time = press.time - dx / press.span * press.duration;
      press.animation.currentTime = (time % press.duration + press.duration) % press.duration;
    } else gallery.scrollLeft = press.scroll - dx;
  };
  const click = (event: MouseEvent) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const visibility = () => { if (document.hidden) end(); sync(); };
  const preference = () => { end(); sync(); };
  const resize = () => end();
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) end(); sync(); });
  const modal = new MutationObserver(sync);
  observer.observe(carousel);
  modal.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  carousel.addEventListener('focusin', focus, options);
  carousel.addEventListener('focusout', blur, options);
  gallery.addEventListener('pointerdown', down, options);
  gallery.addEventListener('pointermove', move, options);
  gallery.addEventListener('pointerup', end, options);
  gallery.addEventListener('pointercancel', end, options);
  // Touch transfers implicit capture from the pressed card to the gallery.
  gallery.addEventListener('lostpointercapture', event => { if (event.target === gallery) end(event); }, options);
  gallery.addEventListener('click', click, { ...options, capture: true });
  window.addEventListener('pointerup', end, options);
  window.addEventListener('resize', resize, options);
  document.addEventListener('visibilitychange', visibility, options);
  reduced.addEventListener('change', preference, options);
  const stop = () => {
    observer.disconnect();
    modal.disconnect();
    listeners.abort();
    end();
    carousel.removeAttribute('data-carousel-ready');
    carousel.removeAttribute('data-carousel-browsing');
  };
  window.addEventListener('pagehide', stop, { ...options, once: true });
  sync();
  carousel.setAttribute('data-carousel-ready', '');
}

mountCarousel();
window.addEventListener('pageshow', event => { if (event.persisted) mountCarousel(); });
