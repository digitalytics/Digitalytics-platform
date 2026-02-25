'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatDuration, getStatusColor, getSentimentColor } from '@/lib/utils';

interface Call {
  callId: string;
  agentId: string;
  agentName: string | null;
  callStatus: string;
  startTimestamp: string;
  durationMs: number | null;
  callSuccessful: boolean | null;
  userSentiment: string | null;
}

interface Agent {
  retellAgentId: string;
  name: string;
}

interface Filters {
  agentId?: string;
  status?: string;
  outcome?: string;
}

interface Props {
  initialCalls: Call[];
  totalCalls: number;
  page: number;
  limit: number;
  agents: Agent[];
  filters: Filters;
}

export function CallsPageClient({ initialCalls, totalCalls, page, limit, agents, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const totalPages = Math.ceil(totalCalls / limit);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (filters.agentId && key !== 'agentId') params.set('agentId', filters.agentId);
    if (filters.status && key !== 'status') params.set('status', filters.status);
    if (filters.outcome && key !== 'outcome') params.set('outcome', filters.outcome);
    if (value) params.set(key, value);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => router.push(pathname);

  const hasActiveFilters = !!(filters.agentId || filters.status || filters.outcome);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={15} />
            <span className="font-medium">Filters</span>
          </div>

          {agents.length > 1 && (
            <select
              value={filters.agentId || ''}
              onChange={e => updateFilter('agentId', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
            >
              <option value="">All agents</option>
              {agents.map(a => (
                <option key={a.retellAgentId} value={a.retellAgentId}>{a.name}</option>
              ))}
            </select>
          )}

          <select
            value={filters.status || ''}
            onChange={e => updateFilter('status', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          >
            <option value="">All statuses</option>
            <option value="ended">Ended</option>
            <option value="ongoing">Ongoing</option>
            <option value="registered">Registered</option>
            <option value="error">Error</option>
            <option value="not_connected">Not Connected</option>
          </select>

          <select
            value={filters.outcome || ''}
            onChange={e => updateFilter('outcome', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
          >
            <option value="">All outcomes</option>
            <option value="true">Successful</option>
            <option value="false">Unsuccessful</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {initialCalls.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No calls found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Outcome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialCalls.map(call => (
                  <tr key={call.callId} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link
                        href={`/calls/${call.callId}`}
                        className="text-gray-700 hover:text-[#004D3E] font-medium group-hover:underline"
                      >
                        {formatDateTime(call.startTimestamp)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {call.agentName || call.agentId.slice(0, 16) + '…'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDuration(call.durationMs)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.callStatus)}`}>
                        {call.callStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {call.callSuccessful === null ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${call.callSuccessful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {call.callSuccessful ? 'Successful' : 'Unsuccessful'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {call.userSentiment ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(call.userSentiment)}`}>
                          {call.userSentiment}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCalls)} of {totalCalls.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={page > 1 ? `${pathname}?page=${page - 1}${filters.agentId ? `&agentId=${filters.agentId}` : ''}` : '#'}
                className={`p-1.5 rounded hover:bg-gray-200 transition ${page <= 1 ? 'opacity-30 pointer-events-none' : ''}`}
              >
                <ChevronLeft size={16} />
              </Link>
              <span className="text-xs text-gray-600 px-2">
                Page {page} of {totalPages}
              </span>
              <Link
                href={page < totalPages ? `${pathname}?page=${page + 1}${filters.agentId ? `&agentId=${filters.agentId}` : ''}` : '#'}
                className={`p-1.5 rounded hover:bg-gray-200 transition ${page >= totalPages ? 'opacity-30 pointer-events-none' : ''}`}
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
