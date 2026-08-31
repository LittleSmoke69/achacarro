export const StatUnderline = () => (
  <svg className="text-accent/25 absolute inset-0 size-full" viewBox="0 0 254 104" fill="none" aria-hidden>
    <path
      d="M18 78c28 14 72 22 118 18 42-4 86-18 108-42 8-9 4-22-12-28-28-12-68-18-108-16-36 2-78 12-106 32-12 8-14 22 0 36Z"
      fill="currentColor"
    />
  </svg>
);

export const CompareSpark = () => (
  <svg className="w-full text-accent" viewBox="0 0 386 90" fill="none" aria-hidden>
    <path
      d="M4 72 C 40 68, 55 48, 78 52 C 110 58, 130 28, 160 34 C 190 40, 210 18, 248 22 C 280 26, 310 44, 338 38 C 355 34, 372 48, 382 42"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M4 72 C 40 68, 55 48, 78 52 C 110 58, 130 28, 160 34 C 190 40, 210 18, 248 22 C 280 26, 310 44, 338 38 C 355 34, 372 48, 382 42 V 90 H 4 Z"
      className="text-accent/15"
      fill="currentColor"
    />
  </svg>
);

export const ProposalBars = () => (
  <svg className="w-full sm:w-[140%]" viewBox="0 0 280 140" fill="none" aria-hidden>
    {[28, 52, 40, 74, 58, 90, 46, 68, 84, 62, 96, 70, 108, 80, 54].map((h, i) => (
      <rect
        key={i}
        x={8 + i * 18}
        y={132 - h}
        width="12"
        height={h}
        rx="3"
        className={i === 9 ? "fill-accent" : "fill-primary/15"}
      />
    ))}
  </svg>
);
