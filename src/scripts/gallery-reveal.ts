const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export {};

function mount() {
  if (!('IntersectionObserver' in window)) return;
  const animations = new Set<Animation>();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (reduced.matches) continue;
      const animation = entry.target.animate([
        { opacity: .35, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
      if (document.hidden) animation.pause();
    }
  }, { threshold: .08 });
  document.querySelectorAll('.motion-card, .graphic-card, .subli-card, .logo-card, .web-project-card, .contact-panel').forEach(card => observer.observe(card));

  const settle = () => { if (reduced.matches) animations.forEach(animation => animation.cancel()); };
  const visibility = () => animations.forEach(animation => document.hidden ? animation.pause() : animation.play());
  const stop = () => {
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
    reduced.removeEventListener('change', settle);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', stop);
  };
  reduced.addEventListener('change', settle);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', stop);
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
