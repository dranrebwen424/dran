import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prepareHeadlineEntrance } from './headline-entrance';
import { startMotionTitleReaction } from './motion-title';

gsap.registerPlugin(ScrollTrigger);

export function startProjectHeading(section: HTMLElement) {
  const heading = section.querySelector<HTMLElement>('[data-project-heading]')!;
  const title = section.querySelector<HTMLElement>('.animated-headline')!;
  const description = section.querySelector<HTMLElement>('[data-project-description]')!;
  const swipeDescription = description.dataset.projectDescription === 'swipe';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let entered = false;

  function mount() {
    let stopped = false;
    let prepared: ReturnType<typeof prepareHeadlineEntrance> | undefined;
    let reveal: gsap.core.Timeline | undefined;
    let trigger: ScrollTrigger | undefined;
    let words: SplitText | undefined;
    let stopReaction: (() => void) | undefined;
    const clear = () => {
      reveal?.kill();
      stopReaction?.();
      stopReaction = undefined;
      prepared?.entrance.kill();
      prepared?.split.revert();
      prepared = undefined;
      words?.revert();
      words = undefined;
      trigger?.kill();
      gsap.set([title, description], { clearProps: 'opacity,visibility,transform' });
    };
    const settle = () => {
      words?.revert();
      words = undefined;
      gsap.set([title, description], { clearProps: 'opacity,visibility,transform' });
      section.dataset.entrance = 'done';
      if (prepared && !reduced.matches) stopReaction = startMotionTitleReaction(title, prepared.glyphs);
    };
    const restore = () => {
      clear();
      if (!reduced.matches) {
        try {
          prepared = prepareHeadlineEntrance(title, () => {});
          prepared.entrance.progress(1).kill();
        } catch { clear(); }
      }
      settle();
    };
    const preference = () => { if (entered || reduced.matches) { entered = true; restore(); } };
    const resize = () => { if (entered) restore(); };
    const visibility = () => { reveal?.paused(document.hidden); };

    if (entered || reduced.matches) {
      entered = true;
      restore();
    } else {
      const style = getComputedStyle(title);
      void document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`).then(() => {
        if (stopped || entered || reduced.matches) return;
        gsap.set([title, description], { autoAlpha: 0 });
        section.dataset.entrance = 'armed';
        trigger = ScrollTrigger.create({
          trigger: heading, start: 'top 85%', once: true,
          onEnter: () => {
            entered = true;
            section.dataset.entrance = 'playing';
            try {
              prepared = prepareHeadlineEntrance(title, () => {});
              words = SplitText.create(description, { type: 'words', tag: 'span', wordsClass: 'motion-description-word' });
              gsap.set(title, { autoAlpha: 1 });
              gsap.set(description, { autoAlpha: 1 });
              reveal = gsap.timeline({ onComplete: settle })
                .add(prepared.entrance.play(), 0)
                .fromTo(words.words,
                  swipeDescription ? { autoAlpha: 0, x: -24 } : { autoAlpha: 0, yPercent: 85, rotationX: -65, transformOrigin: '50% 100%', transformPerspective: 500 },
                  swipeDescription ? { autoAlpha: 1, x: 0, duration: .55, stagger: .065, ease: 'power3.out' } : { autoAlpha: 1, yPercent: 0, rotationX: 0, duration: .65, stagger: .065, ease: 'back.out(1.4)' },
                  swipeDescription ? '>' : .85);
              visibility();
            } catch { clear(); settle(); }
          },
        });
      }).catch(() => { clear(); settle(); });
    }
    reduced.addEventListener('change', preference);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    const stop = () => {
      stopped = true;
      clear();
      reduced.removeEventListener('change', preference);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
    };
    window.addEventListener('pagehide', stop);
  }

  mount();
  window.addEventListener('pageshow', event => { if (event.persisted) mount(); });

}
