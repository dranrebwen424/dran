import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { headlineMetrics } from './headline-sway';

gsap.registerPlugin(SplitText);

export function prepareHeadlineEntrance(headline: HTMLElement, onComplete: () => void) {
  const { baseline } = headlineMetrics(headline);

  // Keep the font's original kerning when letters become separate transform boxes.
  const positions: number[] = [];
  const textNodes = document.createTreeWalker(headline, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (textNodes.nextNode()) {
    const text = textNodes.currentNode;
    for (let index = 0; index < text.textContent!.length; index++) {
      if (/\s/.test(text.textContent![index])) continue;
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      positions.push(range.getBoundingClientRect().left);
    }
  }
  const split = SplitText.create(headline, { type: 'words,chars', tag: 'span', charsClass: 'headline-letter' });
  const cues = [
    { at: 0, x: 0, y: 18, tip: 88, duration: 1.05, fade: .28, squash: .86 },
    { at: 0, x: 0, y: -26, tip: 0, duration: .68, fade: .38, squash: 1 },
    { at: .18, x: 0, y: 0, tip: 0, flip: -150, zoom: .3, duration: 1.05, fade: .28, squash: .9 },
    { at: .18, x: -115, y: 0, tip: 0, duration: .9, fade: .16, squash: .94 },
    { at: .38, x: 0, y: -12, tip: -88, duration: 1.1, fade: .26, squash: .88 },
    { at: .38, x: 0, y: 22, tip: 0, duration: .6, fade: .3, squash: 1 },
    { at: .56, x: 0, y: -110, tip: 0, duration: .82, fade: .18, squash: .9 },
    { at: .56, x: 70, y: 0, tip: 0, duration: .65, fade: .22, squash: 1 },
    { at: .18, x: 0, y: 0, tip: 0, swing: 18, zoom: .26, duration: 1.08, fade: .25, squash: .84 },
    { at: .56, x: -110, y: 0, tip: 0, duration: .92, fade: .18, squash: .91 },
    { at: .56, x: 0, y: -24, tip: 0, duration: .72, fade: .36, squash: 1 },
    { at: .86, x: 0, y: 0, tip: 0, flip: 150, zoom: .28, duration: 1.1, fade: .28, squash: .86 },
    { at: .86, x: 0, y: 110, tip: 0, duration: .85, fade: .18, squash: .9 },
    { at: 1.1, x: 110, y: 0, tip: 0, duration: .94, fade: .16, squash: .93 },
    { at: 1.1, x: 0, y: 24, tip: 0, duration: .7, fade: .34, squash: 1 },
    { at: .86, x: 0, y: 0, tip: 0, swing: -16, zoom: .3, duration: 1.05, fade: .2, squash: .9 },
  ];
  // Damped unit-mass spring: stiffness 180, damping 16; normalize the final sample to rest.
  const frequency = Math.sqrt(180 - 8 ** 2);
  const response = (time: number) => 1 - Math.exp(-8 * time) * (
    Math.cos(frequency * time) + 8 / frequency * Math.sin(frequency * time)
  );
  const spring = (progress: number) => response(progress) / response(1);
  const glyphs: HTMLElement[] = [];
  const entrance = gsap.timeline({ paused: true, onComplete });
  split.chars.forEach((letter, index) => {
    const cue = cues[index % cues.length];
    const horizontal = cue.x !== 0;
    const stretch = cue.squash < 1 ? 1.04 : 1;
    const zoom = cue.zoom ?? 1;
    let origin = cue.tip < 0 ? '50% 0%' : '50% 100%';
    if (horizontal) origin = cue.x > 0 ? '0% 50%' : '100% 50%';
    if (cue.flip) origin = '50% 50%';
    if (cue.swing) origin = `50% ${baseline}px`;
    gsap.set(letter, { x: positions[index] - letter.getBoundingClientRect().left });
    const mask = document.createElement('span');
    const glyph = document.createElement('span');
    mask.className = 'headline-window';
    glyph.className = 'headline-glyph';
    glyphs.push(glyph);
    glyph.textContent = letter.textContent;
    mask.setAttribute('aria-hidden', 'true');
    mask.append(glyph);
    letter.append(mask);
    gsap.set(glyph, {
      xPercent: cue.x, yPercent: cue.y, rotationX: cue.tip, opacity: 0,
      rotationY: cue.flip ?? 0, skewX: cue.swing ?? 0,
      scaleX: (horizontal ? stretch : 1 / stretch) * zoom,
      scaleY: (horizontal ? 1 / stretch : stretch) * zoom,
      transformOrigin: origin,
      transformPerspective: 600,
    });
    entrance.set(letter, { visibility: 'visible' }, cue.at)
      .to(glyph, { opacity: 1, duration: cue.fade, ease: 'power1.out' }, cue.at)
      .to(glyph, {
        xPercent: 0, yPercent: 0, rotationX: 0, rotationY: 0, skewX: 0, duration: cue.duration,
        ease: cue.squash === 1 ? 'power2.out' : spring,
      }, cue.at);
    if (cue.squash < 1) entrance.to(glyph, {
      scaleX: horizontal ? cue.squash : 1 / cue.squash,
      scaleY: horizontal ? 1 / cue.squash : cue.squash,
      duration: cue.duration * (zoom < 1 ? .21 : .11), ease: zoom < 1 ? 'power2.out' : 'power1.in',
    }, cue.at + cue.duration * (zoom < 1 ? 0 : .1))
      .to(glyph, { scaleX: 1, scaleY: 1, duration: cue.duration * .78, ease: spring }, cue.at + cue.duration * .21);
  });
  return { split, entrance, glyphs };
}
