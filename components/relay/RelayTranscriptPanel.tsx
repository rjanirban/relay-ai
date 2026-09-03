'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { IMessageListItem } from 'agora-agent-uikit';
import { cn } from '@/lib/utils';

type RelayTranscriptPanelProps = {
  messageList: IMessageListItem[];
  currentInProgressMessage: IMessageListItem | null;
  agentUID: string;
  emptyHint?: string;
};

// Calling the AI by its product identity, never a hard-coded "Ada".
const AGENT_LABEL = 'Relay AI';

export function RelayTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
  emptyHint = 'Start speaking to see the live Relay AI conversation transcript.',
}: RelayTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [messageList, currentInProgressMessage],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/30"
      aria-label="Relay AI conversation transcript"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Conversation</h2>
          <p className="text-xs text-muted-foreground">Live voice turns</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            {emptyHint}
          </div>
        ) : (
          messages.map((message, index) => {
            const isAgent = String(message.uid) === agentUID;
            const label = isAgent ? AGENT_LABEL : 'Caller';
            const text = message.text?.trim();

            return (
              <article
                key={`${message.turn_id ?? message.uid}-${index}`}
                className={cn(
                  'flex flex-col',
                  isAgent ? 'items-start' : 'items-end',
                )}
              >
                <div className="mb-1 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                  <span
                    className={cn(
                      isAgent &&
                        'bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent',
                    )}
                  >
                    {label}
                  </span>
                </div>
                <div
                  className={cn(
                    'max-w-full whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm leading-6',
                    isAgent
                      ? 'border-cyan-500/20 bg-cyan-500/5 text-[#e7f7fc]'
                      : 'border-border bg-card/80 text-foreground',
                  )}
                >
                  {text || '…'}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}