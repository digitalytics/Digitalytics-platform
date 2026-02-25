'use client';

import { Megaphone, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalContacts: number;
  calledCount: number;
  connectedCount: number;
  failedCount: number;
  createdAt: string;
  contactList: { name: string } | null;
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

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = campaign.totalContacts > 0
    ? Math.round((campaign.calledCount / campaign.totalContacts) * 100)
    : 0;

  const connectRate = campaign.calledCount > 0
    ? Math.round((campaign.connectedCount / campaign.calledCount) * 100)
    : 0;

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#004D3E]/30 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center">
            <Megaphone size={18} className="text-[#004D3E]" />
          </div>
          <Badge variant={statusVariant[campaign.status] || 'neutral'}>
            {campaign.status}
          </Badge>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
        {campaign.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{campaign.description}</p>
        )}

        {campaign.contactList && (
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
            <Users size={11} />
            {campaign.contactList.name}
          </p>
        )}

        {/* Progress bar */}
        {campaign.totalContacts > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{campaign.calledCount} / {campaign.totalContacts} called</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#004D3E] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <CheckCircle size={11} className="text-green-500" />
            {campaign.connectedCount} connected
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={11} className="text-red-400" />
            {campaign.failedCount} failed
          </span>
          {campaign.calledCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {connectRate}% rate
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
