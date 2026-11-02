import { startProjectHeading } from './project-heading';
import { mountImageViewer } from './image-viewer';

export function startFolio(section: HTMLElement) {
  startProjectHeading(section);
  const mount = () => {
    const stopViewer = mountImageViewer(section);
    const stop = () => {
      stopViewer();
      window.removeEventListener('pagehide', stop);
    };
    window.addEventListener('pagehide', stop);
  };
  mount();
  window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
}
