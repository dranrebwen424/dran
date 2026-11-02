import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { startProjectHeading } from './project-heading';

gsap.registerPlugin(ScrollTrigger);
const section = document.querySelector<HTMLElement>('#web-projects')!;
const cards = [...section.querySelectorAll<HTMLElement>('.web-project-card')];
startProjectHeading(section);

function mount() {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const events = new AbortController();
    let active = -1;
    const items = cards.map(card => {
      const copy = [card.querySelector('h3')!, card.querySelector('.web-project-action')!];
      const entrance = gsap.fromTo(copy, { x: -60, scale: .55, autoAlpha: 0 }, {
        x: 0, scale: 1, autoAlpha: 1, duration: .5, stagger: .06, ease: 'power3.out', paused: true,
      });
      const arrow = gsap.to(card.querySelector('svg'), { xPercent: 60, duration: .35, repeat: -1, yoyo: true, ease: 'power2.in', paused: true });
      return { entrance, arrow };
    });
    const sync = () => items.forEach(({ entrance, arrow }, index) => {
      entrance.reversed(index !== active).paused(document.hidden);
      arrow.paused(index !== active || document.hidden);
    });
    const select = (index: number, immediate = false) => {
      active = index;
      if (immediate) items.forEach(({ entrance }, i) => entrance.progress(i === index ? 1 : 0));
      sync();
    };
    cards.forEach((card, index) => {
      const inspect = (trigger: ScrollTrigger, immediate = false) => {
        if (trigger.isActive) select(index, immediate);
        else if (active === index) select(-1, immediate);
      };
      const trigger = ScrollTrigger.create({
        trigger: card, start: 'center 65%', endTrigger: cards[index + 1] ?? card,
        end: cards[index + 1] ? 'center 65%' : 'bottom 25%',
        onToggle: trigger => inspect(trigger), onRefresh: trigger => inspect(trigger, true),
      });
      inspect(trigger, true);
      card.addEventListener('focus', () => {
        card.scrollIntoView({ block: 'center' });
        select(index, true);
      }, { signal: events.signal });
    });
    sync();
    document.addEventListener('visibilitychange', sync, { signal: events.signal });
    return () => events.abort();
  });
  const stop = () => { media.revert(); window.removeEventListener('pagehide', stop); };
  window.addEventListener('pagehide', stop);
}

mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
