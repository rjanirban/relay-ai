import type {
  RelayFieldExtract,
  RelayTranscriptRollup,
} from '@/lib/relayIntelligence';

/** One completed (or manually handed-off) conversation session, recorded from REAL data. */
export interface RelaySessionRecord {
  id: string;
  createdAt: number;
  /** 'completed' after graceful stop, or 'escalated' when handoff was triggered. */
  status: 'completed' | 'escalated';
  /** Rollup computed at the moment the session ended. */
  rollup: RelayTranscriptRollup;
  captured: RelayFieldExtract[];
  escalationReason: string | null;
  metrics: { type: string; name: string; value: number; timestamp: number }[];
}

/** Aggregates over recorded sessions, purely from real data. */
export interface RelaySessionAggregate {
  totalSessions: number;
  escalated: number;
  autoResolved: number;
  avgConfidence: number | null;
  totalCallerTurns: number;
}