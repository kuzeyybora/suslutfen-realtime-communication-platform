import { useEffect, useRef } from 'react';

const COLORS = ['#fb923c','#fcd34d','#f97316','#fbbf24','#ff6b35','#fff','#fed7aa','#fdba74'];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function Confetti({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    for (let i = 0; i < 120; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${randomBetween(0, 100)}vw;
        animation-delay: ${randomBetween(0, 0.8)}s;
        animation-duration: ${randomBetween(1.8, 3.2)}s;
        background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
        width: ${randomBetween(6, 12)}px;
        height: ${randomBetween(6, 12)}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        transform: rotateZ(${randomBetween(0, 360)}deg);
      `;
      container.appendChild(el);
    }

    const timer = setTimeout(() => {
      if (container) container.innerHTML = '';
    }, 4000);

    return () => clearTimeout(timer);
  }, [active]);

  return <div ref={containerRef} className="confetti-container" />;
}
