'use client';

import { useEffect } from 'react';
import styles from './Background.module.css';

interface BackgroundProps {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

class AnimatedBackground {
  private static readonly CHARGE_GREEN = 'rgb(70,236,140)';
  private static readonly CHARGE_BLUE = 'rgb(49,186,255)';
  private static readonly ANIMATION_DURATION = 2000; // 2 seconds
  private static readonly MIN_PATHS = 3;
  private static readonly MAX_PATHS = 8;

  private paths: SVGPathElement[] = [];
  private animatingPaths = new Set<SVGPathElement>();
  private pathColors = new Map<SVGPathElement, string>();

  constructor() {
    this.init();
  }

  private init() {
    // Get all paths from the SVG
    const pathsGroup = document.querySelector('#paths');
    if (!pathsGroup) return;

    // Import the SVG paths from the static file
    fetch('/background.svg')
      .then((response) => response.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = Array.from(svgDoc.querySelectorAll('path'));

        // Set initial color and append paths
        paths.forEach((path) => {
          const clone = path.cloneNode(true) as SVGPathElement;
          clone.style.fill = AnimatedBackground.CHARGE_GREEN;
          clone.style.transition = `fill ${AnimatedBackground.ANIMATION_DURATION}ms ease-in-out`;
          pathsGroup.appendChild(clone);
          this.pathColors.set(clone, AnimatedBackground.CHARGE_GREEN);
        });

        this.paths = Array.from(pathsGroup.querySelectorAll('path'));
        this.startAnimation();
      });
  }

  private startAnimation() {
    setInterval(() => this.animate(), 3000);
  }

  private animate() {
    const availablePaths = this.paths.filter((p) => !this.animatingPaths.has(p));
    if (availablePaths.length === 0) return;

    const numPaths =
      Math.floor(
        Math.random() * (AnimatedBackground.MAX_PATHS - AnimatedBackground.MIN_PATHS + 1)
      ) + AnimatedBackground.MIN_PATHS;

    // Pick random paths to animate
    for (let i = 0; i < Math.min(numPaths, availablePaths.length); i++) {
      const randomIndex = Math.floor(Math.random() * availablePaths.length);
      const selectedPath = availablePaths[randomIndex];
      if (!selectedPath) continue;

      availablePaths.splice(randomIndex, 1);
      this.animatingPaths.add(selectedPath);

      // Get current color and determine target color
      const currentColor = this.pathColors.get(selectedPath) || AnimatedBackground.CHARGE_GREEN;
      const targetColor =
        currentColor === AnimatedBackground.CHARGE_GREEN
          ? AnimatedBackground.CHARGE_BLUE
          : AnimatedBackground.CHARGE_GREEN;

      // Animate to target color
      selectedPath.style.fill = targetColor;
      this.pathColors.set(selectedPath, targetColor);

      // Remove from animating after transition completes
      setTimeout(() => {
        this.animatingPaths.delete(selectedPath);
      }, AnimatedBackground.ANIMATION_DURATION);
    }
  }
}

export default function Background({ style, className, children }: BackgroundProps) {
  useEffect(() => {
    // Initialize the animated background
    new AnimatedBackground();
  }, []);

  return (
    <div className={`relative w-full h-full ${className || ''}`} style={style}>
      <div className={`${styles.pattern} absolute inset-0 w-full h-full`}>
        <svg
          className={styles.svgTile}
          viewBox="0 0 1500 1500"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            fillRule: 'evenodd',
            clipRule: 'evenodd',
            strokeLinejoin: 'round',
            strokeMiterlimit: 2,
          }}
        >
          <g transform="matrix(6.48044e-17,-1.05834,1.05834,6.48044e-17,-0.719725,1500)">
            <g id="Multicolor">
              <g id="paths">{/* SVG paths will be inserted here by client script */}</g>
            </g>
          </g>
        </svg>
      </div>
      {children}
    </div>
  );
}
