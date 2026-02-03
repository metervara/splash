import './index.css';
import { initSplashOverlay } from '/src/shared/utils';
import { initScrollFallback } from './scrollFallback';

document.addEventListener('DOMContentLoaded', () => {
  initSplashOverlay();
  initScrollFallback();
});

