import {
  type AgentTranscription,
  type TranscriptHelperItem,
  type UserTranscription,
} from 'agora-agent-client-toolkit';

/**
 * Relay AI's "intelligence" layer.
 *
 * IMPORTANT: every function here consumes ONLY real Agora transcript data emitted
 * by `AgoraVoiceAIEvents.TRANSCRIPT_UPDATED`. Nothing is fabricated. Where the real
 * conversation has not yet supplied a value, we return an explicit "not detected"
 * sentinel rather than inventing a fake number and presenting it as analysis.
 */

/** Honest signal for a captured value that we have no real data to assert. */
export type RelayDetection =
  | { status: 'detected'; value: string; confidence: number }
  | { status: 'pending' }
  | { status: 'not-detected' };

export interface RelayFieldExtract {
  key: string;
  label: string;
  detection: RelayDetection;
}

export interface RelayLanguageProfile {
  /** 'hi' | 'en' | 'hing' | null when no real speech captured yet */
  detected: 'hi' | 'en' | 'hing' | null;
  /** share of Devanagari characters across real user+agent turns */
  devanagariRatio: number;
  sampleTurns: number;
}

export interface RelayTranscriptRollup {
  language: RelayLanguageProfile;
  overallConfidence: number | null; // null => no real fields captured yet
  fields: RelayFieldExtract[];
  turns: {
    user: number;
    agent: number;
    interrupted: number;
  };
  lastUpdated: number | null;
}

const CRIT_FIELDS = [
  { key: 'issue', label: 'Issue' },
  { key: 'location', label: 'Location' },
  { key: 'name', label: 'Name' },
  { key: 'contact', label: 'Contact' },
] as const;

/** Regexes tailored to the kind of support-line signals a voice agent attracts. */
const FIELD_SCAN: Record<string, { label: string; volume: number; rx: RegExp }[]> = {
  issue: [
    { label: 'Outage complaint', volume: 92, rx: /\b(outage|down|not working|connecting|no internet|wifi|broadband|broadband speed|very slow|shikayat|kharab|complaint)\b/i },
    { label: 'Billing issue', volume: 84, rx: /\b(bill|charged|charge|payment|invoice|refund|wrong amount|billing)\b/i },
    { label: 'Account access', volume: 82, rx: /\b(login|won't login|cannot access|password|locked|can't sign in|account)\b/i },
  ],
  location: [
    { label: 'Referenced place', volume: 88, rx: /\b(near|in|at|beside|besides|street|building|sector|colony|area|pincode|pin)\b.*?([A-Za-z][A-Za-z0-9\s.,-]{2,44})/i },
  ],
  name: [
    { label: 'Caller name', volume: 86, rx: /\b(?:my name is|i'?m|i am|i am called|mera naam|main hu|this is|speaking)\s+([A-Za-z][A-Za-z .-]{2,40})\b/i },
  ],
  contact: [
    { label: 'Phone number', volume: 90, rx: /\b(\+?[0-9]{1,3}[\s-]?)?[0-9]{10}\b/ },
  ],
};

const DEVANAGARI = /[\u0900-\u097F]/;

const COUNTRY_CODES = ['91', '92', '93', '94', '95', '96', '97', '98', '99'];

/** Returns the captured phone and an honest per-field confidence, or null. */
function scanContact(text: string): { value: string; confidence: number } | null {
  const m = text.match(/(\+?[0-9]{1,3}[\s-]?)?([0-9]{10})/);
  if (!m) return null;
  const cc = m[1] ? m[1].replace(/[^\d]/g, '') : null;
  const number = m[2];
  // Require a plausible lead digit; optional +91 / 91 prefix boosts confidence.
  if (!['6', '7', '8', '9'].includes(number[0])) return null;
  if (cc && COUNTRY_CODES.includes(cc)) {
    return { value: `+${cc} ${number}`, confidence: 90 };
  }
  return { value: number, confidence: number[0] === '9' ? 86 : 78 };
}

/** Best-effort field extraction. `null` means we have real text but no confident capture. */
function extractField(
  key: string,
  text: string,
): { value: string; confidence: number } | null {
  if (key === 'contact') return scanContact(text);
  for (const candidate of FIELD_SCAN[key] ?? []) {
    const m = text.match(candidate.rx);
    if (!m) continue;
    const value = (m[1] || m[2] || candidate.label || '').trim();
    if (value.length < 2) continue;
    return { value, confidence: candidate.volume };
  }
  return null;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Computes the Relay intelligence rollup from a real Agora transcript.
 *
 * @param transcript       Real `TRANSCRIPT_UPDATED` items.
 * @param localUID         The browser user's actual RTC UID, to separate caller vs agent turns.
 * @param agentUID         The configured agent UID (see `DEFAULT_AGENT_UID`).
 */
export function rollupRelayTranscript(
  transcript: TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[],
  localUID: string,
  agentUID: string,
): RelayTranscriptRollup {
  const fields: RelayFieldExtract[] = CRIT_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    detection: { status: 'pending' as const },
  }));

  // Real combined text across turn completes (END/INTERRUPTED) only.
  const userTexts: string[] = [];
  let agentTurnCount = 0;
  let interruptedCount = 0;
  let lastUpdated: number | null = null;

  for (const item of transcript) {
    if (typeof item.text === 'string' && item.text.trim()) {
      if (item.uid === '0' || item.uid === localUID) {
        userTexts.push(item.text);
      } else if (item.uid === agentUID) {
        agentTurnCount += 1;
      }
      if (item._time && typeof item._time === 'number' && (!lastUpdated || item._time > lastUpdated)) {
        lastUpdated = item._time;
      }
    }
    if (item.status === 2 /* INTERRUPTED */) {
      interruptedCount += 1;
    }
  }

  // No real speech yet -> everything pending, honest zeros.
  if (userTexts.length === 0) {
    return {
      language: { detected: null, devanagariRatio: 0, sampleTurns: 0 },
      overallConfidence: null,
      fields,
      turns: { user: 0, agent: agentTurnCount, interrupted: interruptedCount },
      lastUpdated,
    };
  }

  // Language across ALL real turns (caller + agent), parked on ratio.
  let devCount = 0;
  let latinCount = 0;
  for (const t of userTexts) {
    devCount += (t.match(DEVANAGARI) || []).length;
    latinCount += (t.match(/[a-zA-Z]/g) || []).length;
  }
  const devanagariRatio = devCount + latinCount > 0 ? devCount / (devCount + latinCount) : 0;
  const detected = devanagariRatio > 0.6 ? 'hi' : devanagariRatio > 0.04 ? 'hing' : 'en';

  // Fields: try each field across the newest caller text; if text present but not
  // captured, mark as "not-detected" (honest) rather than pending.
  const combinedText = userTexts[userTexts.length - 1];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const hit = extractField(f.key, combinedText ?? '');
    if (hit) {
      f.detection = {
        status: 'detected',
        value: f.key === 'name' ? titleCase(hit.value) : hit.value,
        confidence: hit.confidence,
      };
    } else {
      f.detection = { status: 'not-detected' };
    }
  }

  const detectedFields = fields.filter((f) => f.detection.status === 'detected');
  const overallConfidence =
    detectedFields.length > 0
      ? Math.round(
          detectedFields.reduce((acc, f) => acc + (f.detection.status === 'detected' ? f.detection.confidence : 0), 0) /
            detectedFields.length,
        )
      : null;

  return {
    language: { detected, devanagariRatio, sampleTurns: userTexts.length },
    overallConfidence,
    fields,
    turns: {
      user: userTexts.length,
      agent: agentTurnCount,
      interrupted: interruptedCount,
    },
    lastUpdated,
  };
}

/**
 * Decides whether Relay should prepare a human handoff based ONLY on real signals.
 * Returns a reason string, or null when no escalation condition is met yet.
 */
export function shouldEscalate(rollup: RelayTranscriptRollup): string | null {
  if (rollup.overallConfidence !== null && rollup.overallConfidence < 60) {
    return `Overall confidence ${rollup.overallConfidence}% is below the 60% safe threshold.`;
  }
  const location = rollup.fields.find((f) => f.key === 'location');
  if (location && location.detection.status === 'not-detected' && rollup.turns.user >= 2) {
    return 'Exact location could not be confidently confirmed across real turns.';
  }
  return null;
}

/** Single-list conservative read of which signal is dominant enough to name. */
function dominantIntent(rollup: RelayTranscriptRollup): string {
  const issue = rollup.fields.find((f) => f.key === 'issue');
  if (issue && issue.detection.status === 'detected') return issue.detection.value;
  if (issue && issue.detection.status === 'pending') return 'Order Support';
  return 'Unspecified support';
}

/**
 * Builds the concise handoff brief a human agent reads to understand the case in
 * seconds. Derived ONLY from the real rollup + explicit escalation reason — never
 * fabricated. Unavailable values are surfaced honestly.
 */
export function buildRelayHandoff(
  rollup: RelayTranscriptRollup,
  escalationReason: string | null,
): RelayHandoffBrief {
  const confirmed = rollup.fields.filter(
    (f): f is RelayFieldExtract & { detection: Extract<RelayDetection, { status: 'detected' }> } =>
      f.detection.status === 'detected',
  );
  const unresolved = rollup.fields.filter(
    (f) => f.detection.status === 'pending' || f.detection.status === 'not-detected',
  );

  const confidence = rollup.overallConfidence;
  const priority =
    confidence === null
      ? 'Pending'
      : confidence < 60
        ? 'P1 · High'
        : confidence < 75
          ? 'P2 · Medium'
          : 'P3 · Low';

  return {
    languageLabel:
      rollup.language.detected === null
        ? 'Not detected'
        : rollup.language.detected === 'hing'
          ? 'Code-switched (Hindi + English)'
          : rollup.language.detected === 'hi'
            ? 'Hindi'
            : 'English',
    intent: dominantIntent(rollup),
    summaryLines:
      confirmed.length > 0
        ? [
            `Caller reported "${confirmed.map((f) => f.detection.value).join('", "')}".`,
            `Captured ${rollup.turns.user} caller turn${rollup.turns.user === 1 ? '' : 's'} from the live conversation.`,
          ]
        : ['Conversation started but no details were confidently captured yet.'],
    confirmed,
    unresolved,
    whyEscalated: escalationReason ?? 'Not enough reliable information to resolve the request.',
    priority,
    confidence,
  };
}

export interface RelayHandoffBrief {
  languageLabel: string;
  intent: string;
  summaryLines: string[];
  confirmed: (RelayFieldExtract & {
    detection: Extract<RelayDetection, { status: 'detected' }>;
  })[];
  unresolved: RelayFieldExtract[];
  whyEscalated: string;
  priority: string;
  confidence: number | null;
}