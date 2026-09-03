'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Handshake,
  Loader2,
  ShieldAlert,
  Check,
  TriangleAlert,
} from 'lucide-react';
import type {
  RelayHandoffBrief,
  RelayTranscriptRollup,
} from '@/lib/relayIntelligence';
import { buildRelayHandoff } from '@/lib/relayIntelligence';
import { cn } from '@/lib/utils';

type RelayEscalationPanelProps = {
  rollup: RelayTranscriptRollup;
  escalationReason: string | null;
  /** Called once the human confirms transfer. Host records the case + keeps context. */
  onEscalate: () => void;
  transferring: boolean;
  /** Case id assigned by the host at transfer time, shown on the handoff brief. */
  caseId: string;
};

/**
 * User-confirmed human escalation. When Relay AI cannot confidently resolve a
 * request this panel surfaces WHY and asks the operator to confirm before any
 * handoff happens. On confirmation it renders the context-preserving handoff brief
 * built from the REAL transcript. Nothing is fabricated; missing data shows honestly.
 */
export function RelayEscalationPanel({
  rollup,
  escalationReason,
  onEscalate,
  transferring,
  caseId,
}: RelayEscalationPanelProps) {
  const [escalated, setEscalated] = useState(false);
  const [acked, setAcked] = useState(false);

  if (escalated) {
    const brief = buildRelayHandoff(rollup, escalationReason);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1">
          <Handshake className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-foreground">Handoff brief</span>
        </div>
        <HandoffBrief brief={brief} caseId={caseId} />
        <Button
          variant="outline"
          size="sm"
          className="w-full border-border text-muted-foreground hover:text-foreground"
          onClick={() => setEscalated(false)}
          disabled={transferring}
        >
          Back to live view
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        escalationReason
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-border/80 bg-card/40',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        Human escalation
      </div>

      {escalationReason ? (
        <>
          <p className="mt-2 text-sm font-medium text-amber-400">
            Relay AI could not confidently resolve this request.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {escalationReason}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Review &amp; decide before transfer</span>
            <span className="text-amber-400 font-medium">
              {rollup.overallConfidence === null
                ? 'Confidence not computed'
                : `Confidence ${rollup.overallConfidence}%`}
            </span>
          </div>

          {acked ? (
            <Button
              size="sm"
              className="mt-3 w-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
              onClick={() => {
                setEscalated(true);
                onEscalate();
              }}
            >
              {transferring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transferring…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm &amp; Transfer
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full border-border text-foreground hover:bg-card/60"
              onClick={() => setAcked(true)}
            >
              Review &amp; Transfer
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-foreground">
            Agent is handling this with normal confidence.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A handoff prompt appears here automatically if confidence drops or
            required details stay unresolved.
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            No transfer recommended right now.
          </div>
        </>
      )}
    </div>
  );
}

/** Human-readable case handoff that preserves full conversation context. */
function HandoffBrief({
  brief,
  caseId,
}: {
  brief: RelayHandoffBrief;
  caseId: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-cyan-400">{caseId}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Priority {brief.priority}
        </span>
      </div>
      <Row label="Language" value={brief.languageLabel} />
      <div>
        <Label>Intent</Label>
        <p className="text-sm text-foreground">{brief.intent}</p>
      </div>
      {brief.summaryLines.length > 0 && (
        <div>
          <Label>Summary</Label>
          <ul className="space-y-1">
            {brief.summaryLines.map((line, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ValueGroup
        title="Confirmed"
        fields={brief.confirmed}
        ok
        empty="Nothing confirmed yet"
      />
      <ValueGroup
        title="Unresolved"
        fields={brief.unresolved}
        ok={false}
        empty="All required fields captured"
      />
      <div>
        <Label>Why escalated</Label>
        <p className="text-sm text-foreground">{brief.whyEscalated}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function ValueGroup({
  title,
  fields,
  ok,
  empty,
}: {
  title: string;
  fields: { label: string; detection: { status: string } }[];
  ok: boolean;
  empty: string;
}) {
  if (fields.length === 0) {
    return (
      <div>
        <Label>{title}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <div>
      <Label>{title}</Label>
      <ul className="mt-1 space-y-1">
        {fields.map((f) => {
          const detected = f.detection.status === 'detected';
          return (
            <li key={f.label} className="flex items-center gap-1.5 text-xs">
              {detected && ok ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : !detected && !ok ? (
                <TriangleAlert className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <span className="text-muted-foreground">•</span>
              )}
              <span className="text-muted-foreground">{f.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}