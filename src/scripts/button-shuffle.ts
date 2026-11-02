import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function mount() {
  const events = new AbortController();
  const { signal } = events;
  const resets: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-shuffle-label]').forEach(label => {
    const button = label.closest('a')!;
    const letters = [...label.querySelectorAll<HTMLElement>('.shuffle-letter')].filter(letter => letter.dataset.letter!.trim());
    let sequence: gsap.core.Timeline | undefined;
    const reset = () => {
      sequence?.kill();
      sequence = undefined;
      letters.forEach(letter => { letter.firstElementChild!.textContent = letter.dataset.letter!; });
    };
    const play = () => {
      reset();
      if (reduced.matches || document.hidden) return;
      sequence = gsap.timeline();
      letters.forEach((letter, index) => {
        const text = letter.dataset.letter!;
        sequence!.to(letter.firstElementChild, {
          duration: .3 + index * .06, ease: 'none',
          scrambleText: { text, chars: text === text.toUpperCase() ? 'upperCase' : 'lowerCase', revealDelay: .18 + index * .06, tweenLength: false },
        }, 0);
      });
    };
    button.addEventListener('pointerenter', play, { signal });
    button.addEventListener('focus', play, { signal });
    button.addEventListener('pointerleave', play, { signal });
    button.addEventListener('blur', play, { signal });
    resets.push(reset);
  });
  const resetAll = () => resets.forEach(reset => reset());
  reduced.addEventListener('change', () => { if (reduced.matches) resetAll(); }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); }, { signal });
  window.addEventListener('pagehide', () => { events.abort(); resetAll(); }, { once: true, signal });
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
