import { useEffect, useState } from 'react';

/** Lightweight confetti burst when a debt reaches zero in the simulation. */
export function DebtConfetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    const colors = ['#B6D7A8', '#B4A7D6', '#3A9D9D', '#474F7A', '#F8FAFC'];
    setPieces(
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: colors[i % colors.length]
      }))
    );
    const timer = window.setTimeout(() => setPieces([]), 2200);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 h-2.5 w-2.5 rounded-sm opacity-90"
          style={{
            left: `${piece.left}%`,
            background: piece.color,
            animation: `debt-confetti-fall 1.8s ease-out ${piece.delay}s forwards`
          }}
        />
      ))}
      <style>{`
        @keyframes debt-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
