'use client';

import { cn } from '@/lib/utils';

type RelayLogoProps = {
  className?: string;
  markClassName?: string;
  hideWordmark?: boolean;
};

export function RelayLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="relay-stroke" x1="24" y1="30" x2="96" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#6366F1" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="relay-core" x1="60" y1="30" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DD3FC" />
          <stop offset="0.5" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="34" stroke="url(#relay-stroke)" strokeWidth="1.25" fill="none" opacity="0.7" />
      <g stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M36 74 C44 74, 46 60, 53 57" />
        <path d="M52 84 C60 84, 62 67, 68 61" opacity="0.55" />
        <path d="M69 50 C75 45, 78 34, 84 34" opacity="0.75" />
      </g>
      <path d="M60 44 L72 60 L60 76 L48 60 Z" fill="none" stroke="url(#relay-core)" strokeWidth="2.6" strokeLinejoin="round" opacity="0.9" />
      <circle cx="60" cy="60" r="3.4" fill="#E0F2FE" />
      <circle cx="60" cy="60" r="7" fill="#38BDF8" opacity="0.22" />
      <circle cx="36" cy="74" r="2.4" fill="#22D3EE" />
      <circle cx="52" cy="84" r="2" fill="#38BDF8" opacity="0.6" />
      <circle cx="84" cy="34" r="2.4" fill="#6366F1" />
    </svg>
  );
}

export function RelayLogo({
  className,
  markClassName,
  hideWordmark = false,
}: RelayLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <RelayLogoMark
        className={cn('h-9 w-9 shrink-0', markClassName)}
      />
      {!hideWordmark && (
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-[1.15rem] font-semibold tracking-[-0.02em] text-foreground">
            Relay
          </span>
          <span className="bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-[1.15rem] font-semibold tracking-[-0.02em] text-transparent">
            AI
          </span>
        </div>
      )}
    </div>
  );
}