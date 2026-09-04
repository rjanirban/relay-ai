'use client';

import {
  useState,
  useRef,
  Suspense,
  useEffect,
  useCallback,
} from 'react';
import type React from 'react';
import { Loader2 } from 'lucide-react';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
  RelaySessionUpdate,
} from '../types/conversation';
import type { ConversationComponentProps } from '../types/conversation';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Button } from './ui/button';
import { RelayLogo } from './relay/RelayLogo';
import { RelayDashboard } from './relay/RelayDashboard';
import { RelayCasesPanel } from './relay/RelayCasesPanel';
import { RelayAnalyticsPanel } from './relay/RelayAnalyticsPanel';
import type { RelaySessionRecord } from '../types/relay';

// ConversationComponent is loaded client-only via a useEffect dynamic import,
// same as AgoraProviders — using the exact pattern that resolves the Turbopack
// next/dynamic tree-shake bug that caused React error #130 (undefined element
// type) in production builds.

let sessionSeq = 0;

export default function LandingPage() {
  const [showConversation, setShowConversation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);

  // Relay AI: record real sessions so Cases/Analytics are driven by actual data.
  const [sessions, setSessions] = useState<RelaySessionRecord[]>([]);
  const latestUpdate = useRef<RelaySessionUpdate | null>(null);

  // Mirrors whether the live call surface is mounted (drives the nav badge / banner).
  const [isSessionActive, setIsSessionActive] = useState(false);

  // AgoraProviders is resolved client-only.  Loading it here (also eagerly, so it
  // is ready by the time the user starts a conversation) keeps the ambient
  // <AgoraProviders> element in the tree valid: a missing provider is a plain
  // fragment, never an undefined element type.
  const [AgoraProviderEl, setAgoraProviderEl] = useState<
    React.ComponentType<{ children: React.ReactNode }> | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    import('./AgoraProviders')
      .then((m) => {
        if (!cancelled) setAgoraProviderEl(() => m.default);
      })
      .catch((err) => {
        console.error('Failed to load AgoraProviders:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ConversationComponent is resolved client-only the same way to keep the live
  // view valid until both it and the provider are ready. Rendering it before it
  // is loaded would hit an undefined element type in production.
  const [ConversationEl, setConversationEl] = useState<
    React.ComponentType<ConversationComponentProps> | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    import('./ConversationComponent')
      .then((m) => {
        if (!cancelled) setConversationEl(() => m.default);
      })
      .catch((err) => {
        console.error('Failed to load ConversationComponent:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload heavy modules on mount so they're already cached when the user
  // clicks "Start Conversation" — eliminates the ~1.8s dynamic-import delay.
  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);

  const handleIntelligenceUpdate = useCallback((update: RelaySessionUpdate) => {
    latestUpdate.current = update;
  }, []);

  const handleStartConversation = async () => {
    setIsLoading(true);
    setError(null);
    setAgentJoinError(false);
    latestUpdate.current = null;

    try {
      // 1. Fetch RTC token + channel
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      // 2. Run agent invite and RTM setup in parallel — both only need the token response.
      //    RTM must be ready before ConversationComponent mounts so AgoraVoiceAI
      //    can subscribe immediately. Agent invite is non-fatal.
      const [agentData, rtm] = await Promise.all([
        // 2a. Start the AI agent
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
          } as ClientStartRequest),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),

        // 2b. Set up RTM (dynamically imported to keep it client-only)
        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          return rtm;
        })(),
      ]);

      // 3. All dependencies ready — store state and show conversation
      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData?.agent_id });
      setShowConversation(true);
    } catch (err) {
      setError('Failed to start conversation. Please try again.');
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) {
          throw new Error('Missing channel for token renewal');
        }

        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  // Records the ending session from the REAL intelligence snapshot the child reported.
  // Returns the case id. Callers may force the status (e.g. 'escalated' after a
  // user-confirmed handoff) — otherwise derived from the real escalation reason.
  const recordSession = useCallback(
    (forceStatus?: RelaySessionRecord['status']): string | null => {
      const update = latestUpdate.current;
      if (!update) return null;
      sessionSeq += 1;
      const id = `SES-${String(sessionSeq).padStart(4, '0')}`;
      const record: RelaySessionRecord = {
        id,
        createdAt: Date.now(),
        status: forceStatus ?? (update.escalationReason ? 'escalated' : 'completed'),
        rollup: update.rollup,
        captured: update.rollup.fields,
        escalationReason: update.escalationReason,
        metrics: update.metrics,
      };
      setSessions((prev) => [record, ...prev].slice(0, 40));
      return id;
    },
    [],
  );

  const handleEndConversation = async () => {
    // Snapshot the real conversation intelligence before tearing down.
    recordSession();

    // Stop the AI agent (idempotent: backend treats 404 / "already shutting down"
    // as success, so double-stop never surfaces as an error).
    if (agoraData?.agentId) {
      try {
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          console.error('Failed to stop agent:', body ?? response.status);
        }
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    // Tear down RTM — owned here since we created it here
    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setShowConversation(false);
    setIsSessionActive(false);
  };

  // Relay AI user-confirmed handoff: record this session as an escalation and hand
  // back the case id so the in-call handoff brief shows a stable, real case label.
  const handleEscalate = useCallback(
    (update: RelaySessionUpdate): string => {
      latestUpdate.current = update;
      const id = recordSession('escalated');
      return id ?? `RLY-${Date.now().toString().slice(-6)}`;
    },
    [recordSession],
  );

  // Keep the live-call banner in sync with session activity.
  useEffect(() => {
    setIsSessionActive(showConversation);
  }, [showConversation]);

  const liveView = !showConversation ? (
    <PreCallView isLoading={isLoading} error={error} onStart={handleStartConversation} />
  ) : agoraData && rtmClient ? (
    <>
      {agentJoinError && (
        <div className="mx-4 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-400 md:mx-6">
          Agent start reported a problem. The session may be degraded, but the
          voice transport is still live.
        </div>
      )}
      <Suspense fallback={<LoadingSkeleton />}>
        <ErrorBoundary>
          {AgoraProviderEl && ConversationEl ? (
            <AgoraProviderEl>
              <ConversationEl
                agoraData={agoraData}
                rtmClient={rtmClient}
                onTokenWillExpire={handleTokenWillExpire}
                onEndConversation={handleEndConversation}
                onIntelligenceUpdate={handleIntelligenceUpdate}
                onEscalate={handleEscalate}
              />
            </AgoraProviderEl>
          ) : (
            <LoadingSkeleton />
          )}
        </ErrorBoundary>
      </Suspense>
    </>
  ) : (
    <p className="px-6 py-10 text-sm text-muted-foreground">
      Failed to load conversation data.
    </p>
  );

  return (
    <RelayDashboard
      liveView={liveView}
      casesView={<RelayCasesPanel sessions={sessions} />}
      analyticsView={<RelayAnalyticsPanel sessions={sessions} />}
      isSessionActive={isSessionActive}
    />
  );
}

function PreCallView({
  isLoading,
  error,
  onStart,
}: {
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      <div className="flex w-[min(92vw,27rem)] flex-col items-center rounded-[20px] border border-border/80 bg-card/30 px-10 py-10 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md animate-fade-up">
        <RelayLogo markClassName="h-14 w-14" />
        <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          Relay&nbsp;AI Voice Operations
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          A multilingual conversation-intelligence switchboard. Real-time voice
          capture, confidence-aware routing, and human escalation — powered by
          Agora Conversational AI.
        </p>

        <Button
          onClick={onStart}
          disabled={isLoading}
          size="lg"
          className="mt-10 w-full rounded-lg border border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          aria-label={
            isLoading
              ? 'Starting conversation with Relay AI agent'
              : 'Start conversation with Relay AI agent'
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting…
            </>
          ) : (
            'Start Conversation'
          )}
        </Button>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <p className="mt-6 text-[11px] text-muted-foreground">
          Requires microphone access. Runs over real Agora{' '}
          <span className="text-cyan-400">RTC → AGENT → ASR → LLM → TTS</span>.
        </p>
      </div>
    </div>
  );
}