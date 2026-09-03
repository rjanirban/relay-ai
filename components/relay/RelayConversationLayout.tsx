'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserRound, Sparkles } from 'lucide-react';
import { RelayLogo } from './RelayLogo';

type RelayConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  intelligencePanel: ReactNode;
  /** Optional extension mount rendered inside the intelligence rail (e.g. escalation/handoff). */
  rightRail?: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
  isEnding: boolean;
  endingLabel?: string;
  /** Name shown for the live session header (caller identity). */
  callerLabel?: string;
};

/**
 * Relay AI presentation shell around the REAL Agora conversation pipeline.
 * Visual design: dark SaaS, glass panels, thin borders, cyan/indigo accent,
 * central agent visualizer. This component does NOT own any Agora logic — it
 * only renders state already computed from real Agora events upstream.
 */
export function RelayConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  intelligencePanel,
  rightRail,
  visualizer,
  controls,
  onEndConversation,
  isEnding,
  endingLabel = 'Ending…',
  callerLabel = 'Caller',
}: RelayConversationLayoutProps) {
  return (
    <div className="flex h-full flex-col text-left">
      {/* Header */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/80 px-4 py-3 backdrop-blur-md md:h-[64px] md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <RelayLogo className="shrink-0" />
          <div className="ml-1 hidden min-w-0 flex-col justify-center md:flex">
            <span className="truncate text-sm font-medium leading-tight text-muted-foreground">
              AI Voice Operations
            </span>
            {pipelineMetrics && <div className="mt-1">{pipelineMetrics}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border/80 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <UserRound className="mr-1.5 h-3.5 w-3.5" />
            {callerLabel}
          </div>
          {statusPanel}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-md border border-destructive/70 bg-destructive/10 px-3 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onEndConversation}
            disabled={isEnding}
            aria-label="End the Relay AI conversation"
            title="End conversation"
          >
            {isEnding ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {endingLabel}
              </>
            ) : (
              'End Conversation'
            )}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-4 pb-3 pt-3 lg:flex-row lg:gap-0 lg:px-6">
        {/* Transcript rail (mobile: top) */}
        <aside className="order-1 h-72 min-h-0 w-full shrink-0 lg:order-1 lg:h-full lg:w-[26rem]">
          {transcriptPanel}
        </aside>

        {/* Center: visualizer + controls */}
        <main className="order-2 flex min-h-[22rem] flex-1 flex-col lg:order-2 lg:border-l lg:border-border/60 lg:pl-6">
          <div className="flex min-h-0 flex-1 flex-col pb-2 pt-3 md:pb-6">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {visualizer}
            </div>
            <div className="shrink-0 pt-3">{controls}</div>
          </div>
        </main>

        {/* Intelligence rail (desktop: right; mobile: below visualizer) */}
        <aside className="order-3 w-full shrink-0 overflow-y-auto lg:order-3 lg:ml-5 lg:w-[21rem] lg:border-l lg:border-border/60 lg:pl-5">
          <div className="flex items-center gap-2 pb-3">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-foreground">Relay Intelligence</span>
          </div>
          {intelligencePanel}
          {rightRail && (
            <div className="mt-4 space-y-3">{rightRail}</div>
          )}
        </aside>
      </div>

      {/* Footer credits */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground/70 md:px-6">
        <span>Powered by Agora Conversational AI</span>
        <span className="opacity-60">Made by Nightcoders</span>
      </footer>
    </div>
  );
}