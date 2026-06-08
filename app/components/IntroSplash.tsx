"use client";

import { useEffect } from "react";

/**
 * first-load intro animation:
 *   1. "Deep Dive" appears, letters in alternating blue/purple shades
 *   2. stacks of multicolored books fall letter-by-letter, burying the word
 *   3. a sheet of paper slips from under the final stack and falls away
 *   4. onDone() is called, revealing the app
 */

const WORD = "Deep Dive";
const SLOTS = Array.from(WORD);

const BLUES = ["#60a5fa", "#3b82f6", "#38bdf8", "#818cf8"];
const PURPLES = ["#a78bfa", "#c084fc", "#8b5cf6", "#a855f7"];
const BOOK_COLORS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
  "#14b8a6", "#f97316", "#84cc16", "#06b6d4", "#eab308", "#8b5cf6",
];

const BOOKS_PER = 3;
const BOOK_START = 800; // ms before the first book falls
const BOOK_STAGGER = 80; // ms between books
const BOOK_FALL = 480; // ms each book takes to land
const PAPER_FALL = 1200; // ms for the paper to fall away

function letterColor(i: number): string {
  return i % 2 === 0
    ? BLUES[Math.floor(i / 2) % BLUES.length]
    : PURPLES[Math.floor((i - 1) / 2) % PURPLES.length];
}

export default function IntroSplash({ onDone }: { onDone: () => void }) {
  // indices of real letters (skip the space)
  const letterSlots = SLOTS.map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);

  const books: { slot: number; k: number; color: string; delay: number }[] = [];
  let g = 0;
  for (const slot of letterSlots) {
    for (let k = 0; k < BOOKS_PER; k++) {
      books.push({
        slot,
        k,
        color: BOOK_COLORS[g % BOOK_COLORS.length],
        delay: BOOK_START + g * BOOK_STAGGER,
      });
      g++;
    }
  }

  const lastBookEnd = BOOK_START + (g - 1) * BOOK_STAGGER + BOOK_FALL;
  const paperDelay = lastBookEnd - 120;
  const finalSlot = letterSlots[letterSlots.length - 1];
  const fadeAt = paperDelay + PAPER_FALL - 150;
  const total = fadeAt + 560;

  useEffect(() => {
    const t = setTimeout(onDone, total);
    return () => clearTimeout(t);
  }, [onDone, total]);

  return (
    <div
      className="intro"
      onClick={onDone}
      role="presentation"
      style={{ animation: `introOut 520ms ease ${fadeAt}ms forwards` }}
    >
      <div className="intro-word">
        {SLOTS.map((ch, i) => (
          <span
            key={i}
            className="intro-letter"
            style={
              {
                color: ch === " " ? "transparent" : letterColor(i),
                animationDelay: `${i * 50}ms`,
              } as React.CSSProperties
            }
          >
            {ch === " " ? " " : ch}
          </span>
        ))}

        {books.map((b, idx) => (
          <span
            key={`book-${idx}`}
            className="intro-book"
            style={
              {
                "--i": b.slot,
                "--restY": `${(b.k * 0.2).toFixed(2)}em`,
                background: b.color,
                animationDelay: `${b.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}

        <span
          className="intro-paper"
          style={
            {
              "--i": finalSlot,
              animationDelay: `${paperDelay}ms`,
            } as React.CSSProperties
          }
        />
      </div>

      <button className="intro-skip" onClick={onDone}>
        Skip ›
      </button>
    </div>
  );
}
