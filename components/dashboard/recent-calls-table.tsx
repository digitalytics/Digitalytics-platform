import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatDuration, getStatusColor, getSentimentColor } from '@/lib/utils';
import { CallCostBreakdown } from '@/components/dashboard/call-cost-breakdown';
import { formatUserCostDisplay } from '@/lib/call-cost-utils';

interface Call {
  callId: string;
  agentId: string;
  agentName: string | null;
  callStatus: string;
  startTimestamp: Date | string;
  durationMs: number | null;
  callSuccessful: boolean | null;
  userSentiment: string | null;
  userCost?: number | null;
  costDetails?: unknown | null;
}

export function RecentCallsTable({ calls }: { calls: Call[] }) {
  const showCostColumn = calls.some(c => c.userCost != null);
  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-400">No calls yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agent</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Sentiment</th>
            {showCostColumn && (
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {calls.map(call => (
            <tr key={call.callId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-600">
                <Link href={`/calls/${call.callId}`} className="hover:text-[#004D3E]">
                  {formatDateTime(call.startTimestamp)}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700 font-medium">
                {call.agentName || call.agentId.slice(0, 12) + '…'}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDuration(call.durationMs)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.callStatus)}`}>
                  {call.callStatus}
                </span>
              </td>
              <td className="px-4 py-3">
                {call.userSentiment ? (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(call.userSentiment)}`}>
                    {call.userSentiment}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              {showCostColumn && (
                <td className="px-4 py-3">
                  {call.userCost != null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700 font-medium tabular-nums">
                        {formatUserCostDisplay(call.userCost)}
                      </span>
                      <CallCostBreakdown userCost={call.userCost} costDetails={call.costDetails ?? null} durationMs={call.durationMs} />
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
