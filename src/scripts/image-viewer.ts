export function mountImageViewer(section: HTMLElement, onChange = () => {}) {
  const dialog = section.querySelector<HTMLDialogElement>('dialog')!;
  const image = dialog.querySelector<HTMLImageElement>('img')!;
  const error = dialog.querySelector<HTMLElement>('.graphic-modal-error')!;
  const original = dialog.querySelector<HTMLAnchorElement>('.graphic-original')!;
  const closeButton = dialog.querySelector<HTMLButtonElement>('button')!;
  const links = [...section.querySelectorAll<HTMLAnchorElement>('[data-viewer-src]')];
  let stopped = false;
  let opener: HTMLAnchorElement | undefined, previousOverflow = '', backdropDown = false;
  const restore = () => {
    if (dialog.open) return;
    document.documentElement.style.overflow = previousOverflow;
    image.removeAttribute('src');
    if (!stopped) opener?.focus({ preventScroll: true });
    onChange();
  };
  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = event.currentTarget as HTMLAnchorElement;
    const thumbnail = opener.querySelector<HTMLImageElement>('img')!;
    dialog.setAttribute('aria-label', opener.dataset.title!);
    original.href = opener.href;
    error.hidden = true;
    image.hidden = false;
    image.alt = thumbnail.alt;
    image.src = opener.dataset.viewerSrc!;
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    onChange();
  };
  const close = () => dialog.close();
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    if (error.hidden || (event.shiftKey && document.activeElement === closeButton) || (!event.shiftKey && document.activeElement === original)) {
      event.preventDefault();
      (!error.hidden && event.shiftKey ? original : closeButton).focus();
    }
  };
  const pointerDown = (event: PointerEvent) => { backdropDown = event.target === dialog; };
  const backdrop = (event: MouseEvent) => { if (backdropDown && event.target === dialog) close(); };
  const imageError = () => { if (dialog.open) { image.hidden = true; error.hidden = false; } };
  links.forEach(link => link.addEventListener('click', open));
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', restore);
  dialog.addEventListener('pointerdown', pointerDown);
  dialog.addEventListener('click', backdrop);
  dialog.addEventListener('keydown', trapFocus);
  image.addEventListener('error', imageError);
  return () => {
    stopped = true;
    if (dialog.open) { dialog.close(); restore(); }
    links.forEach(link => link.removeEventListener('click', open));
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('close', restore);
    dialog.removeEventListener('pointerdown', pointerDown);
    dialog.removeEventListener('click', backdrop);
    dialog.removeEventListener('keydown', trapFocus);
    image.removeEventListener('error', imageError);
  };
}
