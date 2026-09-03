'use client';

import { cn } from '@/lib/utils';
import { Check, TriangleAlert } from 'lucide-react';
import type {
  RelayDetection,
  RelayFieldExtract,
  RelayTranscriptRollup,
} from '@/lib/relayIntelligence';

type RelayIntelligencePanelProps = {
  rollup: RelayTranscriptRollup;
  escalationReason: string | null;
  connectionState: string;
  isAgentConnected: boolean;
};

function confColor(confidence: number | null): string {
  if (confidence === null) return 'text-muted-foreground';
  if (confidence < 60) return 'text-destructive';
  if (confidence < 75) return 'text-amber-400';
  return 'text-cyan-400';
}

function detectionBadge(detection: RelayDetection): {
  dot: string;
  label: string;
  text: string;
} {
  if (detection.status === 'detected') {
    return { dot: 'bg-cyan-400', label: detection.value, text: 'text-foreground' };
  }
  if (detection.status === 'pending') {
    return { dot: 'bg-muted-foreground/40', label: 'Pending', text: 'text-muted-foreground' };
  }
  return { dot: 'bg-muted-foreground/30', label: 'Not detected', text: 'text-muted-foreground' };
}

const LANG_LABEL: Record<string, string> = {
  hi: 'Hindi',
  en: 'English',
  hing: 'Hinglish',
};

export function RelayIntelligencePanel({
  rollup,
  escalationReason,
  connectionState,
  isAgentConnected,
}: RelayIntelligencePanelProps) {
  const languageLabel =
    rollup.language.detected === null
      ? 'Not detected'
      : rollup.language.detected === 'hing'
        ? 'Code-switched (Hindi + English)'
        : LANG_LABEL[rollup.language.detected];

  const liveState = connectionState === 'CONNECTED' && isAgentConnected
    ? 'Live'
    : connectionState === 'CONNECTING' || connectionState === 'RECONNECTING'
      ? 'Connecting'
      : connectionState === 'DISCONNECTING'
        ? 'Disconnecting'
        : 'Disconnected';

  const overallConfidence = rollup.overallConfidence;

  const issueField = rollup.fields.find((f) => f.key === 'issue');
  const intent =
    issueField && issueField.detection.status === 'detected'
      ? issueField.detection.value
      : issueField && issueField.detection.status === 'pending'
        ? 'Order Support'
        : 'Unspecified / not yet captured';

  const priority =
    overallConfidence === null
      ? 'Pending'
      : overallConfidence < 60
        ? 'P1 · High'
        : overallConfidence < 75
          ? 'P2 · Medium'
          : 'P3 · Low';

  const missing = rollup.fields.filter(
    (f) => f.detection.status === 'pending' || f.detection.status === 'not-detected',
  );

  return (
    <div className="space-y-4">
      {/* Connection + language */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Session
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                liveState === 'Live'
                  ? 'bg-cyan-400'
                  : liveState === 'Connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : liveState === 'Disconnecting'
                      ? 'bg-amber-400'
                      : 'bg-muted-foreground/50',
              )}
            />
            {liveState}
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Language
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {languageLabel}
          </div>
        </div>
      </div>

      {/* Intent + priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Intent
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {intent}
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Priority
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {priority}
          </div>
        </div>
      </div>

      {/* Overall confidence */}
      <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Overall confidence
          </div>
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
              confColor(overallConfidence),
            )}
          >
            {overallConfidence === null ? '—' : `${overallConfidence}%`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              overallConfidence === null
                ? 'bg-muted-foreground/30'
                : overallConfidence < 60
                  ? 'bg-destructive'
                  : overallConfidence < 75
                    ? 'bg-amber-400'
                    : 'bg-cyan-400',
            )}
            style={{
              width: overallConfidence === null ? '0%' : `${overallConfidence}%`,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {overallConfidence === null
            ? 'Based on real caller turns. Start speaking to compute.'
            : 'Derived from the live Agora transcript.'}
        </p>
      </div>

      {/* Escalation readiness */}
      <div
        className={cn(
          'rounded-xl border px-3 py-2.5',
          escalationReason
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-border/80 bg-card/40',
        )}
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Human escalation
        </div>
        <div className="mt-1 text-sm font-semibold">
          {escalationReason ? (
            <span className="text-amber-400">Recommended — {escalationReason}</span>
          ) : rollup.turns.user === 0 ? (
            <span className="text-muted-foreground">Pending — awaiting real conversation</span>
          ) : (
            <span className="text-cyan-400">Not required</span>
          )}
        </div>
      </div>

      {/* Captured fields */}
      <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Captured fields
        </div>
        <div className="space-y-2">
          {rollup.fields.map((field) => (
            <FieldRow key={field.key} field={field} />
          ))}
        </div>
      </div>

      {/* Missing information */}
      <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-2.5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Missing information
        </div>
        {missing.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            No critical fields outstanding
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {missing.map((field) => (
              <span
                key={field.key}
                className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] text-amber-400/90"
              >
                <TriangleAlert className="h-3 w-3" />
                {field.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Turn counts */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{rollup.turns.user} caller turn{rollup.turns.user === 1 ? '' : 's'}</span>
        <span>{rollup.turns.agent} agent turn{rollup.turns.agent === 1 ? '' : 's'}</span>
        {rollup.turns.interrupted > 0 && (
          <span className="text-amber-400">{rollup.turns.interrupted} interrupted</span>
        )}
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: RelayFieldExtract }) {
  const badge = detectionBadge(field.detection);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{field.label}</span>
      <span className={cn('flex min-w-0 items-center gap-1.5 text-sm', badge.text)}>
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', badge.dot)} />
        <span className="truncate">{badge.label}</span>
        {field.detection.status === 'detected' && (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">
            {field.detection.confidence}%
          </span>
        )}
      </span>
    </div>
  );
}