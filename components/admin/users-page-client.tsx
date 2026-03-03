'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, UserX, Edit, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  agents: Array<{
    name: string;
    retellAgentId: string;
    costMultiplier: number | null;
    setupFee:       number | null;
    monthlyFee:     number | null;
    setupFeePaid:   boolean;
  }>;
}

interface Agent {
  id: string;
  retellAgentId: string;
  name: string;
  actualCostRate: unknown;
}

type Tab = 'all' | 'pending' | 'active' | 'inactive';

const statusVariant: Record<string, 'warning' | 'success' | 'neutral' | 'danger'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

export function UsersPageClient({
  users,
  agents,
  initialTab,
}: {
  users: User[];
  agents: Agent[];
  initialTab: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'all');
  const [assignModal, setAssignModal] = useState<User | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>({});
  const [costMultipliers, setCostMultipliers] = useState<Record<string, string>>({});
  const [setupFees,      setSetupFees]      = useState<Record<string, string>>({});
  const [monthlyFees,    setMonthlyFees]    = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filtered = users.filter(u => {
    if (activeTab === 'all') return u.role !== 'ADMIN';
    return u.status === activeTab.toUpperCase() && u.role !== 'ADMIN';
  });

  const openAssignModal = (user: User) => {
    const sel:         Record<string, boolean> = {};
    const multipliers: Record<string, string>  = {};
    const setup:       Record<string, string>  = {};
    const monthly:     Record<string, string>  = {};
    agents.forEach(a => {
      const assigned = user.agents.find(ua => ua.retellAgentId === a.retellAgentId);
      sel[a.retellAgentId] = !!assigned;
      if (assigned?.costMultiplier) multipliers[a.retellAgentId] = String(assigned.costMultiplier);
      if (assigned?.setupFee)       setup[a.retellAgentId]       = String(assigned.setupFee);
      if (assigned?.monthlyFee)     monthly[a.retellAgentId]     = String(assigned.monthlyFee);
    });
    setSelectedAgents(sel);
    setCostMultipliers(multipliers);
    setSetupFees(setup);
    setMonthlyFees(monthly);
    setAssignModal(user);
  };

  const updateUserStatus = async (userId: string, status: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  };

  const saveAssignments = async () => {
    if (!assignModal) return;
    setIsSaving(true);
    const agentsList = agents
      .filter(a => selectedAgents[a.retellAgentId])
      .map(a => ({
        agentId:        a.retellAgentId,
        costMultiplier: costMultipliers[a.retellAgentId] ? parseFloat(costMultipliers[a.retellAgentId]) : undefined,
        setupFee:       setupFees[a.retellAgentId]       ? parseFloat(setupFees[a.retellAgentId])       : undefined,
        monthlyFee:     monthlyFees[a.retellAgentId]     ? parseFloat(monthlyFees[a.retellAgentId])     : undefined,
      }));

    await fetch(`/api/admin/users/${assignModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents: agentsList }),
    });

    setIsSaving(false);
    setAssignModal(null);
    startTransition(() => router.refresh());
  };

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'all', label: 'All Users', count: users.filter(u => u.role !== 'ADMIN').length },
    { key: 'pending', label: 'Pending', count: users.filter(u => u.status === 'PENDING').length },
    { key: 'active', label: 'Active', count: users.filter(u => u.status === 'ACTIVE' && u.role !== 'ADMIN').length },
    { key: 'inactive', label: 'Inactive', count: users.filter(u => u.status === 'INACTIVE').length },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-[#004D3E] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agents</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assignments & Payments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.name || '—'}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[user.status] || 'neutral'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.agents.length === 0 ? (
                      <span className="text-gray-300 text-xs">None assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.agents.slice(0, 2).map(a => (
                          <span key={a.retellAgentId} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            {a.name}
                          </span>
                        ))}
                        {user.agents.length > 2 && (
                          <span className="text-xs text-gray-400">+{user.agents.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {user.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                            isLoading={isPending}
                          >
                            <CheckCircle size={13} />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.id, 'INACTIVE')}
                          >
                            <XCircle size={13} />
                            Reject
                          </Button>
                        </>
                      )}
                      {user.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.id, 'INACTIVE')}
                        >
                          <UserX size={13} />
                          Deactivate
                        </Button>
                      )}
                      {user.status === 'INACTIVE' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                        >
                          <CheckCircle size={13} />
                          Reactivate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAssignModal(user)}
                      >
                        <Edit size={13} />
                        Set Pricing
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Assign Agents Modal */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign Agents — ${assignModal?.name || assignModal?.email}`}
        size="md"
      >
        <div className="space-y-3">
          {agents.length === 0 ? (
            <p className="text-gray-400 text-sm">No agents available. Create agents first.</p>
          ) : (
            agents.map(agent => (
              <div key={agent.retellAgentId} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`agent-${agent.retellAgentId}`}
                    checked={!!selectedAgents[agent.retellAgentId]}
                    onChange={e => setSelectedAgents(prev => ({ ...prev, [agent.retellAgentId]: e.target.checked }))}
                    className="w-4 h-4 accent-[#004D3E]"
                  />
                  <label htmlFor={`agent-${agent.retellAgentId}`} className="flex-1 font-medium text-sm text-gray-900 cursor-pointer">
                    {agent.name}
                  </label>
                </div>
                {selectedAgents[agent.retellAgentId] && (
                  <div className="mt-3 pl-7 grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Setup Fee (one-time)</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={setupFees[agent.retellAgentId] || ''}
                          onChange={e => setSetupFees(prev => ({ ...prev, [agent.retellAgentId]: e.target.value }))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#004D3E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Monthly Fee</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={monthlyFees[agent.retellAgentId] || ''}
                          onChange={e => setMonthlyFees(prev => ({ ...prev, [agent.retellAgentId]: e.target.value }))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#004D3E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Cost Multiplier</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1.0"
                        value={costMultipliers[agent.retellAgentId] || ''}
                        onChange={e => setCostMultipliers(prev => ({ ...prev, [agent.retellAgentId]: e.target.value }))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#004D3E]"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">e.g. 1.5 = charge 1.5× Retell cost</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button onClick={saveAssignments} isLoading={isSaving}>Save assignments</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
