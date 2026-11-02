const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog')!;
const triggers = [...document.querySelectorAll<HTMLElement>('[data-contact-open]')];

function mount() {
  let opener: HTMLElement | undefined, previousOverflow = '', backdropDown = false, stopped = false;
  const closeButton = dialog.querySelector<HTMLButtonElement>('.contact-close')!;
  const form = dialog.querySelector<HTMLFormElement>('.contact-form')!;
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]), textarea')];
  const submitButton = form.querySelector<HTMLButtonElement>('.contact-send')!;
  const status = form.querySelector<HTMLElement>('.contact-form-status')!;
  let request: AbortController | undefined;
  const feedback = (message: string, state: 'pending' | 'success' | 'error') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const sending = (pending: boolean) => {
    fields.forEach(field => { field.disabled = pending; });
    submitButton.disabled = pending;
    submitButton.innerHTML = pending ? 'Sending…' : 'Send message <span aria-hidden="true">↗</span>';
    form.setAttribute('aria-busy', String(pending));
  };
  const clearValidity = (event: Event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) event.target.setCustomValidity('');
    if (!request) status.textContent = '';
  };
  const send = async (event: SubmitEvent) => {
    event.preventDefault();
    if (request) return;
    for (const field of fields.filter(field => field.required)) {
      field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.');
    }
    if (!form.reportValidity()) return;
    const payload = new FormData(form);
    if (payload.get('botcheck')) return;
    for (const key of ['name', 'email', 'message']) payload.set(key, String(payload.get(key)).trim());
    const controller = new AbortController();
    request = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    feedback('Sending your message…', 'pending');
    sending(true);
    try {
      const response = await fetch(form.action, {
        method: 'POST', headers: { Accept: 'application/json' },
        body: payload, signal: controller.signal,
      });
      const result: { success?: unknown; message?: unknown } | null = await response.json();
      if (stopped) return;
      if (!response.ok || result?.success !== true) {
        feedback(result?.success !== true && typeof result?.message === 'string' ? `Message not sent: ${result.message}` : 'Your message wasn’t confirmed. Please try again, or use Email below.', 'error');
        return;
      }
      form.reset();
      feedback('Message sent. Thanks for reaching out — I’ll get back to you by email.', 'success');
    } catch {
      if (!stopped) feedback('Your message wasn’t confirmed. Please try again, or use Email below.', 'error');
    } finally {
      window.clearTimeout(timeout);
      if (!stopped) { request = undefined; sending(false); }
    }
  };
  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function' || dialog.open) return;
    event.preventDefault();
    opener = event.currentTarget as HTMLElement;
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
  const restore = () => {
    if (dialog.open) return;
    document.documentElement.style.overflow = previousOverflow;
    if (stopped) return;
    const fallback = document.querySelector<HTMLElement>(matchMedia('(max-width: 767px)').matches ? '.menu-toggle' : '.contact-button');
    (opener?.getClientRects().length ? opener : fallback)?.focus({ preventScroll: true });
  };
  const close = () => dialog.close();
  const isBackdrop = (event: MouseEvent) => {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  };
  const pointerDown = (event: PointerEvent) => { backdropDown = isBackdrop(event); };
  const backdrop = (event: MouseEvent) => { if (backdropDown && isBackdrop(event)) close(); };
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled)')].filter(control => control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)!.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  };
  triggers.forEach(trigger => trigger.addEventListener('click', open));
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', restore);
  dialog.addEventListener('pointerdown', pointerDown);
  dialog.addEventListener('click', backdrop);
  dialog.addEventListener('keydown', trapFocus);
  form.addEventListener('submit', send);
  form.addEventListener('input', clearValidity);
  const stop = () => {
    stopped = true;
    if (request) {
      request.abort();
      sending(false);
      feedback('Your message wasn’t confirmed. Please try again, or use Email below.', 'error');
    }
    if (dialog.open) { dialog.close(); restore(); }
    triggers.forEach(trigger => trigger.removeEventListener('click', open));
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('close', restore);
    dialog.removeEventListener('pointerdown', pointerDown);
    dialog.removeEventListener('click', backdrop);
    dialog.removeEventListener('keydown', trapFocus);
    form.removeEventListener('submit', send);
    form.removeEventListener('input', clearValidity);
    window.removeEventListener('pagehide', stop);
  };
  window.addEventListener('pagehide', stop);
}
mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
