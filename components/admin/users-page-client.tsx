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
  agents: Array<{ name: string; retellAgentId: string; customPrice: number | null }>;
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
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filtered = users.filter(u => {
    if (activeTab === 'all') return u.role !== 'ADMIN';
    return u.status === activeTab.toUpperCase() && u.role !== 'ADMIN';
  });

  const openAssignModal = (user: User) => {
    const sel: Record<string, boolean> = {};
    const prices: Record<string, string> = {};
    agents.forEach(a => {
      const assigned = user.agents.find(ua => ua.retellAgentId === a.retellAgentId);
      sel[a.retellAgentId] = !!assigned;
      if (assigned?.customPrice) prices[a.retellAgentId] = String(assigned.customPrice);
    });
    setSelectedAgents(sel);
    setCustomPrices(prices);
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
        agentId: a.retellAgentId,
        customPrice: customPrices[a.retellAgentId]
          ? parseFloat(customPrices[a.retellAgentId])
          : undefined,
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agents</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
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
                        Agents
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <div className="mt-2 pl-7">
                    <label className="text-xs text-gray-500">Custom price (per min, shown to user)</label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customPrices[agent.retellAgentId] || ''}
                        onChange={e => setCustomPrices(prev => ({ ...prev, [agent.retellAgentId]: e.target.value }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#004D3E]"
                      />
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
