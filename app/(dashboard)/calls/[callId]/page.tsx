import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Clock, Calendar, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';
import { CallCostBreakdown } from '@/components/dashboard/call-cost-breakdown';
import { computeUserCost, totalCostFromDetails, formatUserCostDisplay } from '@/lib/call-cost-utils';
import { formatDateTime, formatDuration, getStatusColor, getSentimentColor } from '@/lib/utils';

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { callId } = await params;

  const call = await prisma.call.findUnique({
    where: { callId },
    include: {
      transcript: true,
      callAnalysis: true,
      recordings: true,
    },
  });

  if (!call) notFound();

  // Verify access and get costMultiplier for non-admins
  let userCost: number | null = null;
  if (session.user.role !== 'ADMIN') {
    const userAgent = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        agent: { retellAgentId: call.agentId },
      },
    });
    if (!userAgent) notFound();
    userCost = computeUserCost(
      call.totalCost
        ? Number(call.totalCost)
        : totalCostFromDetails(call.costDetails as { combined_cost?: number } | null),
      userAgent.costMultiplier ? Number(userAgent.costMultiplier) : null,
    );
  }

  const agentLabel = call.agentName || call.agentId;
  const transcriptObj = call.transcript?.transcriptObject as Array<{
    role: string;
    content: string;
    timestamp?: number;
  }> | null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/calls"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#004D3E] transition"
      >
        <ArrowLeft size={16} />
        Back to calls
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{agentLabel}</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">{call.callId}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(call.callStatus)}`}>
              {call.callStatus.replace('_', ' ')}
            </span>
            {call.callSuccessful !== null && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${call.callSuccessful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {call.callSuccessful ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {call.callSuccessful ? 'Successful' : 'Unsuccessful'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date</p>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Calendar size={13} className="text-gray-400" />
              {formatDateTime(call.startTimestamp)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Duration</p>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock size={13} className="text-gray-400" />
              {formatDuration(call.durationMs)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Sentiment</p>
            <p className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${getSentimentColor(call.userSentiment)}`}>
              {call.userSentiment || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Agent ID</p>
            <p className="text-xs text-gray-500 font-mono truncate">{call.agentId}</p>
          </div>
          {userCost != null && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Call Cost</p>
              <div className="flex items-center gap-1.5">
                <DollarSign size={13} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">{formatUserCostDisplay(userCost)}</span>
                <CallCostBreakdown userCost={userCost} costDetails={call.costDetails} durationMs={call.durationMs} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recordings */}
      {call.recordings.length > 0 && call.recordings[0].recordingUrl && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recording</h2>
          <audio controls src={call.recordings[0].recordingUrl} className="w-full" />
        </Card>
      )}

      {/* Transcript */}
      {(transcriptObj || call.transcript?.transcript) && (
        <TranscriptViewer
          transcriptObject={transcriptObj}
          transcriptText={call.transcript?.transcript}
        />
      )}

      {/* Call Summary */}
      {call.callAnalysis?.callSummary && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Call Summary</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{call.callAnalysis.callSummary}</p>
        </Card>
      )}

      {/* Call Analysis */}
      {call.callAnalysis?.callAnalysis && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Call Analysis</h2>
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 overflow-auto max-h-64 font-mono">
            {JSON.stringify(call.callAnalysis.callAnalysis, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
