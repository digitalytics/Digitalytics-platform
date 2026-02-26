'use client';

import { Receipt, Calendar, Bot, CheckCircle, Clock } from 'lucide-react';
import { formatMoney, formatCost, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BillingAgent {
  retellAgentId: string;
  name:          string;
  isActive:      boolean;
  phoneNumber:   string | null;
  assignedAt:    string;
  setupFee:      number | null;
  setupFeePaid:  boolean;
  monthlyFee:    number | null;
  customPrice:   number | null;
}

interface Props {
  agents:           BillingAgent[];
  totalMonthly:     number;
  outstandingSetup: number;
  activeCount:      number;
}

export function BillingPageClient({ agents, totalMonthly, outstandingSetup, activeCount }: Props) {
  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No agents assigned yet. Contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-[#004D3E]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Monthly Total</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{formatMoney(totalMonthly)}</p>
            <p className="text-xs text-gray-400">per month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Setup Outstanding</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{formatMoney(outstandingSetup)}</p>
            <p className="text-xs text-gray-400">one-time unpaid</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#004D3E]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Agents</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{activeCount}</p>
            <p className="text-xs text-gray-400">of {agents.length} assigned</p>
          </div>
        </div>
      </div>

      {/* Per-agent cost breakdown */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Agent Cost Breakdown</h2>
        {agents.map(agent => (
          <div key={agent.retellAgentId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{agent.name}</p>
                  <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {agent.phoneNumber && (
                  <p className="text-xs text-gray-400 mt-0.5">{agent.phoneNumber}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Since {formatDate(agent.assignedAt)}</span>
              </div>
            </div>

            {/* Cost rows */}
            <div className="divide-y divide-gray-50">
              {/* Setup Fee */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Setup Fee</p>
                  <p className="text-xs text-gray-400 mt-0.5">One-time charge</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoney(agent.setupFee)}
                  </span>
                  {agent.setupFee != null && (
                    agent.setupFeePaid ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        Unpaid
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Monthly Fee */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Monthly Service Fee</p>
                  <p className="text-xs text-gray-400 mt-0.5">Recurring monthly charge</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoney(agent.monthlyFee)}
                  </span>
                  {agent.monthlyFee != null && (
                    <p className="text-xs text-gray-400 mt-0.5">/ month</p>
                  )}
                </div>
              </div>

              {/* Per-minute rate */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usage Rate</p>
                  <p className="text-xs text-gray-400 mt-0.5">Billed per minute of agent usage</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCost(agent.customPrice)}
                  </span>
                  {agent.customPrice != null && (
                    <p className="text-xs text-gray-400 mt-0.5">/ min</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
