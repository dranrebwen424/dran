import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { startProjectHeading } from './project-heading';

gsap.registerPlugin(ScrollTrigger);
const section = document.querySelector<HTMLElement>('#motion-graphics')!;
const grid = document.querySelector<HTMLElement>('.background-grid')!;
startProjectHeading(section);

function mount() {
  const media = gsap.matchMedia();
  media.add({ reduced: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    // Fade the SVG separately from the Hero's existing entrance opacity.
    if (context.conditions!.reduced) {
      const snap = () => gsap.set(grid, { '--grid-section-opacity': section.getBoundingClientRect().top <= innerHeight * .7 ? 0 : 1 });
      ScrollTrigger.create({ trigger: section, start: 'top 70%', onEnter: snap, onLeaveBack: snap, onRefresh: snap });
      snap();
      return;
    }
    const fade = gsap.fromTo(grid, { '--grid-section-opacity': 1 }, {
      '--grid-section-opacity': 0, duration: .8, ease: 'power2.inOut',
      scrollTrigger: { trigger: section, start: 'top 70%', toggleActions: 'play none none reverse' },
    });
    if (section.getBoundingClientRect().top <= innerHeight * .7) fade.progress(1);
  });
  const stop = () => { media.revert(); window.removeEventListener('pagehide', stop); };
  window.addEventListener('pagehide', stop);
}
mount();
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
