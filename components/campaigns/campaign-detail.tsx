'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, XCircle, CheckCircle, XCircle as FailIcon, Phone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

interface OutboundCallWithContact {
  id: string;
  status: string;
  initiatedAt: string;
  phoneNumber: string;
  contact: { firstName: string; lastName: string | null; phone: string } | null;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalContacts: number;
  calledCount: number;
  connectedCount: number;
  failedCount: number;
  delaySeconds: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  contactList: { name: string; id: string };
  outboundCalls: OutboundCallWithContact[];
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  COMPLETED: 'success',
  RUNNING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  DRAFT: 'neutral',
  SCHEDULED: 'neutral',
  PAUSED: 'neutral',
};

const callStatusVariant: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  COMPLETED: 'success',
  FAILED: 'danger',
  CALLING: 'warning',
  PENDING: 'neutral',
  CANCELLED: 'neutral',
};

export function CampaignDetail({ campaign: initial }: { campaign: Campaign }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Derive accurate counts from the outboundCalls records — avoids
  // stale/incorrect denormalized fields on the campaign row.
  const calledCount = campaign.outboundCalls.length;
  const connectedCount = campaign.outboundCalls.filter(c => c.status === 'COMPLETED').length;
  const failedCount = campaign.outboundCalls.filter(c => c.status === 'FAILED').length;
  const totalContacts = campaign.totalContacts;

  const progress = totalContacts > 0
    ? Math.min(100, Math.round((calledCount / totalContacts) * 100))
    : 0;

  const connectRate = calledCount > 0
    ? Math.round((connectedCount / calledCount) * 100)
    : 0;

  const handleAction = async (action: 'start' | 'pause' | 'cancel') => {
    setActionLoading(action);
    const res = await fetch(`/api/campaigns/${campaign.id}/${action}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.status) setCampaign(prev => ({ ...prev, status: data.status }));
      startTransition(() => router.refresh());
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/campaigns');
    } else {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <Badge variant={statusVariant[campaign.status] || 'neutral'}>{campaign.status}</Badge>
          </div>
          {campaign.description && (
            <p className="text-gray-500 text-sm">{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status) && (
            <Button
              onClick={() => handleAction('start')}
              isLoading={actionLoading === 'start'}
              disabled={!!actionLoading}
            >
              <Play size={14} /> {campaign.status === 'PAUSED' ? 'Resume' : 'Start'}
            </Button>
          )}
          {campaign.status === 'RUNNING' && (
            <Button
              variant="outline"
              onClick={() => handleAction('pause')}
              isLoading={actionLoading === 'pause'}
              disabled={!!actionLoading}
            >
              <Pause size={14} /> Pause
            </Button>
          )}
          {!['COMPLETED', 'CANCELLED'].includes(campaign.status) && (
            <Button
              variant="danger"
              onClick={() => handleAction('cancel')}
              isLoading={actionLoading === 'cancel'}
              disabled={!!actionLoading}
            >
              <XCircle size={14} /> Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!!actionLoading}
            className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      {/* Stats cards — derived from outboundCalls for accuracy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Contacts</p>
          <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Called</p>
          <p className="text-2xl font-bold text-gray-900">{calledCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Connected</p>
          <p className="text-2xl font-bold text-green-600">{connectedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Connect Rate</p>
          <p className="text-2xl font-bold text-[#004D3E]">{connectRate}%</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalContacts > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{calledCount} / {totalContacts} ({progress}%)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#004D3E] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <CheckCircle size={11} className="text-green-500" /> {connectedCount} connected
            </span>
            <span className="flex items-center gap-1">
              <FailIcon size={11} className="text-red-400" /> {failedCount} failed
            </span>
          </div>
        </div>
      )}

      {/* Call results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Phone size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Call Results</h2>
          <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            {campaign.outboundCalls.length}
          </span>
        </div>

        {campaign.outboundCalls.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No calls yet. Start the campaign to begin.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaign.outboundCalls.map(call => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {call.contact
                      ? [call.contact.firstName, call.contact.lastName].filter(Boolean).join(' ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{call.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <Badge variant={callStatusVariant[call.status] || 'neutral'}>
                      {call.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDateTime(call.initiatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Campaign</h2>
            <p className="text-gray-600 text-sm mb-1">
              Are you sure you want to delete <span className="font-semibold">{campaign.name}</span>?
            </p>
            <p className="text-gray-400 text-xs mb-4">This will permanently delete the campaign and all its call records.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                variant="danger"
                isLoading={actionLoading === 'delete'}
                onClick={handleDelete}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
