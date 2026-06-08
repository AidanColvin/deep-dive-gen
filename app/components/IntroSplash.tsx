"use client";

import { useEffect } from "react";

/**
 * first-load intro animation:
 *   1. "Deep Dive" appears in black on a white background
 *   2. stacks of palette-colored books fall letter-by-letter, each stack a
 *      different height, burying the word
 *   3. a sheet of paper slips from under the final stack and falls away
 *   4. onDone() is called, revealing the app
 */

const WORD = "Deep Dive";
const SLOTS = Array.from(WORD);

// the requested palette
const BOOK_COLORS = ["#983628", "#34623F", "#0B0500", "#A9927D", "#B3B7EE"];

// distinct stack height per letter (D e e p · D i v e)
const STACK_HEIGHTS = [3, 5, 2, 6, 4, 5, 3, 2];

const LETTER_INK = "#191613";
const BOOK_START = 700; // ms before the first book falls
const BOOK_STAGGER = 62; // ms between books
const BOOK_FALL = 470; // ms each book takes to land
const PAPER_FALL = 1200; // ms for the paper to fall away

export default function IntroSplash({ onDone }: { onDone: () => void }) {
  const letterSlots = SLOTS.map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);

  const books: {
    slot: number;
    k: number;
    color: string;
    delay: number;
    jx: string;
    rot: string;
  }[] = [];
  let g = 0;
  letterSlots.forEach((slot, li) => {
    const count = STACK_HEIGHTS[li % STACK_HEIGHTS.length];
    for (let k = 0; k < count; k++) {
      books.push({
        slot,
        k,
        color: BOOK_COLORS[g % BOOK_COLORS.length],
        delay: BOOK_START + g * BOOK_STAGGER,
        jx: `${((((g * 7) % 5) - 2) * 0.018).toFixed(3)}em`,
        rot: `${((g * 11) % 7) - 3}deg`,
      });
      g++;
    }
  });

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
                color: ch === " " ? "transparent" : LETTER_INK,
                animationDelay: `${i * 50}ms`,
              } as React.CSSProperties
            }
          >
            {ch === " " ? " " : ch}
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
                "--jx": b.jx,
                "--rot": b.rot,
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
