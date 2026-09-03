import type { RTMClient } from 'agora-rtm';
import type { RelayTranscriptRollup } from '@/lib/relayIntelligence';

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: RTMClient;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onEndConversation: () => void;
  /**
   * Additive Relay AI bridge: reports the HONEST intelligence rollup and the
   * escalation reason as real Agora events arrive. Does not replace or bypass any
   * Agora logic — it only surfaces real transcript-derived data for the dashboard.
   */
  onIntelligenceUpdate?: (update: RelaySessionUpdate) => void;
  /**
   * Relay AI human escalation. Called only after the operator confirms transfer.
   * The host records the case (with full context) and returns a case id if desired.
   */
  onEscalate?: (update: RelaySessionUpdate) => string;
}

/** Snapshot of real intelligence for a live session, lifted for the dashboard. */
export interface RelaySessionUpdate {
  rollup: RelayTranscriptRollup;
  escalationReason: string | null;
  /** Real pipeline latency metrics, in the same shape the pipeline panel renders. */
  metrics: { type: string; name: string; value: number; timestamp: number }[];
  isAgentConnected: boolean;
  connectionState: string;
}
