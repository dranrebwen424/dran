import { gsap } from 'gsap';

const image = document.querySelector<HTMLImageElement>('.about-portrait')!;
const surface = document.querySelector<HTMLElement>('.portrait-interaction')!;
const canvas = document.querySelector<HTMLCanvasElement>('.portrait-shatter')!;
const button = document.querySelector<HTMLButtonElement>('.portrait-hit')!;

type Triangle = { path: Path2D; x: number; y: number };
type Shard = { triangle: Triangle; age: number; duration: number; vx: number; vy: number; spin: number; tumble: number };

function startShatter() {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = canvas.getContext('2d');
    if (!context) return;
    let source: HTMLCanvasElement | undefined, pixels: ImageData | undefined;
    let width = 0, height = 0, ratio = 1, bleed = 0, visible = false, ticking = false, covering = false;
    let triangles: Triangle[] = [];
    let tilt: gsap.core.Timeline | undefined;
    const shards = new Map<Triangle, Shard>();

    const reset = () => {
      gsap.ticker.remove(tick);
      ticking = false;
      shards.clear();
      tilt?.kill();
      gsap.set(surface, { clearProps: 'transform' });
      if (covering) image.style.removeProperty('opacity');
      covering = false;
      canvas.hidden = true;
    };
    const alphaAt = (x: number, y: number) => pixels!.data[(Math.min(pixels!.height - 1, Math.floor(y * ratio)) * pixels!.width + Math.min(pixels!.width - 1, Math.floor(x * ratio))) * 4 + 3];
    const prepare = () => {
      width = image.clientWidth;
      height = image.clientHeight;
      ratio = Math.min(devicePixelRatio || 1, 2);
      const box = surface.getBoundingClientRect();
      bleed = Math.max(0, Math.min(64, box.left - 8, innerWidth - box.right - 8));
      surface.style.setProperty('--shatter-bleed', `${bleed}px`);
      source = document.createElement('canvas');
      source.width = Math.round(width * ratio);
      source.height = Math.round(height * ratio);
      const raster = source.getContext('2d');
      if (!raster) throw new Error('Portrait canvas unavailable');
      raster.drawImage(image, 0, 0, source.width, source.height);
      pixels = raster.getImageData(0, 0, source.width, source.height);
      canvas.width = Math.round((width + bleed * 2) * ratio);
      canvas.height = Math.round((height + bleed * 2) * ratio);
      const cell = Math.max(9, width / 35), columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
      const points = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, column) => ({
        x: column === 0 ? 0 : column === columns ? width : (column + (Math.random() - .5) * .65) * cell,
        y: row === 0 ? 0 : row === rows ? height : (row + (Math.random() - .5) * .65) * cell,
      })));
      triangles = [];
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const a = points[row][column], b = points[row][column + 1], c = points[row + 1][column], d = points[row + 1][column + 1];
        for (const vertices of (row + column) % 2 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]]) {
          const x = vertices.reduce((sum, point) => sum + point.x, 0) / 3;
          const y = vertices.reduce((sum, point) => sum + point.y, 0) / 3;
          if (alphaAt(x, y) < 16) continue;
          const path = new Path2D();
          path.moveTo(vertices[0].x, vertices[0].y);
          path.lineTo(vertices[1].x, vertices[1].y);
          path.lineTo(vertices[2].x, vertices[2].y);
          path.closePath();
          triangles.push({ path, x, y });
        }
      }
    };
    const draw = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      context.translate(bleed, bleed);
      context.drawImage(source!, 0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      const hole = new Path2D();
      // One unioned cutout avoids antialiased seams between neighboring triangles.
      for (const { triangle } of shards.values()) hole.addPath(triangle.path);
      context.fill(hole);
      context.globalCompositeOperation = 'source-over';
      for (const shard of shards.values()) {
        const { triangle, duration } = shard;
        const age = Math.max(0, shard.age);
        const progress = Math.max(0, Math.min(1, (age - .35) / (duration - .35)));
        // Drag and gravity launch each piece; a smooth recovery returns its original pixels.
        const recovery = 1 - progress ** 3 * (10 - 15 * progress + 6 * progress ** 2);
        const travel = (1 - Math.exp(-3 * age)) / 3 * recovery;
        const rotation = shard.spin * age * recovery;
        context.save();
        context.translate(triangle.x + shard.vx * travel, triangle.y + (shard.vy * age + 100 * age ** 2) * recovery);
        context.rotate(rotation);
        context.scale(Math.max(.18, Math.abs(Math.cos(shard.tumble * age * recovery))), 1);
        context.translate(-triangle.x, -triangle.y);
        context.clip(triangle.path);
        context.drawImage(source!, 0, 0, width, height);
        context.restore();
      }
    };
    function tick(_time: number, delta: number) {
      for (const [key, shard] of shards) {
        shard.age += Math.min(delta / 1000, .05);
        if (shard.age >= shard.duration) shards.delete(key);
      }
      if (!shards.size) reset();
      else draw();
    }
    const hit = (event: MouseEvent) => {
      if (!visible || document.hidden || document.documentElement.dataset.aboutEntrance !== 'done') return;
      try {
        if (!source || width !== image.clientWidth || height !== image.clientHeight) prepare();
        const box = button.getBoundingClientRect();
        const x = event.detail ? Math.max(0, Math.min(width - 1, (event.clientX - box.left) / box.width * width)) : width / 2;
        const y = event.detail ? Math.max(0, Math.min(height - 1, (event.clientY - box.top) / box.height * height)) : height / 2;
        if (alphaAt(x, y) < 16) return;
        const radius = Math.max(42, Math.min(86, width * .17));
        for (const triangle of triangles) {
          const dx = triangle.x - x, dy = triangle.y - y, distance = Math.hypot(dx, dy);
          if (distance > radius) continue;
          const angle = Math.atan2(dy, dx) + (Math.random() - .5) * .5;
          const impulse = radius * (3 + Math.random() * 2) * (1 - .4 * distance / radius);
          shards.set(triangle, { triangle, age: -distance / radius * .06, duration: 1.45 + Math.random() * .35,
            vx: Math.cos(angle) * impulse, vy: Math.sin(angle) * impulse * .7 - radius,
            spin: (Math.random() - .5) * 10, tumble: 3 + Math.random() * 5 });
        }
        while (shards.size > 360) shards.delete(shards.keys().next().value!);
        if (!shards.size) return;
        tilt?.kill();
        tilt = gsap.timeline().to(surface, { rotationX: -(y / height - .5) * 6, rotationY: (x / width - .5) * 6,
          transformPerspective: 900, duration: .16, ease: 'power2.out' })
          .to(surface, { rotationX: 0, rotationY: 0, duration: 1.05, ease: 'elastic.out(1, .4)', clearProps: 'transform' });
        draw();
        image.style.opacity = '0';
        covering = true;
        canvas.hidden = false;
        if (!ticking) { ticking = true; gsap.ticker.add(tick); }
      } catch {
        reset();
        button.hidden = true;
      }
    };
    const loaded = () => { source = undefined; button.hidden = !image.complete || !image.naturalWidth; };
    const resize = () => { reset(); source = undefined; pixels = undefined; triangles = []; };
    const visibility = () => { if (document.hidden) reset(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) reset();
    });
    observer.observe(surface);
    loaded();
    button.addEventListener('click', hit);
    image.addEventListener('load', loaded);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      reset();
      button.hidden = true;
      observer.disconnect();
      button.removeEventListener('click', hit);
      image.removeEventListener('load', loaded);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      canvas.width = canvas.height = 1;
    };
  });
  return media;
}

let effect = startShatter();
window.addEventListener('pagehide', () => effect.revert());
window.addEventListener('pageshow', event => { if (event.persisted) effect = startShatter(); });
