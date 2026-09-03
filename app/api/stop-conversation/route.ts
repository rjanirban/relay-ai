import { NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';
import { StopConversationRequest } from '@/types/conversation';

function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeErr = error as {
    statusCode?: number;
    status?: number;
    body?: { detail?: string; reason?: string };
    message?: string;
    code?: string | number;
  };

  const statusCode = maybeErr.statusCode ?? maybeErr.status;
  const reason = String(maybeErr.body?.reason ?? '').toLowerCase();
  const detail = String(
    maybeErr.body?.detail ?? maybeErr.message ?? '',
  ).toLowerCase();

  // Agent already gone -> idempotent success.
  if (statusCode === 404) return true;

  // Agent mid-shutdown (conflict) -> idempotent success. The Agora SDK surfaces the
  // same race in a few shapes: 400 + "ErrConflict", or a body.item.detail/reason.
  if (
    reason === 'errconflict' ||
    reason === 'invalidrequest' ||
    /conflict|already (in the process of )?shutting down|stopping|shutting down/.test(detail) ||
    String(maybeErr.code ?? '').toLowerCase() === 'errconflict'
  ) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body: StopConversationRequest = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 },
      );
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      throw new Error(
        'Missing Agora configuration. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.',
      );
    }

    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });
    try {
      await client.stopAgent(agent_id);
    } catch (error) {
      if (isAgentAlreadyStoppingOrStopped(error)) {
        // Treat stop as idempotent: agent is already exiting (or gone).
        return NextResponse.json({ success: true, state: 'already-stopping' });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to stop conversation',
      },
      { status: 500 },
    );
  }
}
