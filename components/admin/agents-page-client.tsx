'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate } from '@/lib/utils';

interface Agent {
  id: string;
  retellAgentId: string;
  name: string;
  description: string | null;
  webhookUrl: string | null;
  actualCostRate: number | null;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

const agentSchema = z.object({
  retellAgentId: z.string().min(1, 'Retell Agent ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  webhookUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  actualCostRate: z.string().optional(),
  isActive: z.boolean(),
});

type AgentForm = z.infer<typeof agentSchema>;

export function AgentsPageClient({ agents: initialAgents }: { agents: Agent[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentForm>({ resolver: zodResolver(agentSchema) });

  const openCreate = () => {
    reset({ retellAgentId: '', name: '', description: '', webhookUrl: '', phoneNumber: '', actualCostRate: '', isActive: true });
    setEditingAgent(null);
    setShowModal(true);
  };

  const openEdit = (agent: Agent) => {
    reset({
      retellAgentId: agent.retellAgentId,
      name: agent.name,
      description: agent.description || '',
      webhookUrl: agent.webhookUrl || '',
      phoneNumber: agent.phoneNumber || '',
      actualCostRate: agent.actualCostRate ? String(agent.actualCostRate) : '',
      isActive: agent.isActive,
    });
    setEditingAgent(agent);
    setShowModal(true);
  };

  const onSubmit = async (data: AgentForm) => {
    setIsSaving(true);
    const payload = {
      ...data,
      actualCostRate: data.actualCostRate ? parseFloat(data.actualCostRate) : undefined,
      webhookUrl: data.webhookUrl || undefined,
      phoneNumber: data.phoneNumber || undefined,
    };

    if (editingAgent) {
      await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setIsSaving(false);
    setShowModal(false);
    startTransition(() => router.refresh());
  };

  const toggleActive = async (agent: Agent) => {
    await fetch(`/api/admin/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    startTransition(() => router.refresh());
  };

  const deleteAgent = async (agent: Agent) => {
    await fetch(`/api/admin/agents/${agent.id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    startTransition(() => router.refresh());
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Agent
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {initialAgents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-3">No agents yet.</p>
            <Button onClick={openCreate} variant="secondary">
              <Plus size={16} /> Add your first agent
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Retell ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Users</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cost Rate</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    {agent.description && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">{agent.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{agent.retellAgentId}</code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {agent.userCount}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {agent.actualCostRate ? `$${agent.actualCostRate}/min` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(agent)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                        title={agent.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {agent.isActive ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => openEdit(agent)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(agent)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAgent ? 'Edit Agent' : 'Add New Agent'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retell Agent ID *</label>
            <input
              {...register('retellAgentId')}
              disabled={!!editingAgent}
              placeholder="agent_xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E] disabled:bg-gray-50 disabled:text-gray-500"
            />
            {errors.retellAgentId && <p className="mt-1 text-xs text-red-600">{errors.retellAgentId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <input
              {...register('name')}
              placeholder="e.g. Sales Agent"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="What does this agent do?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL (outbound calls)</label>
            <input
              {...register('webhookUrl')}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
            />
            {errors.webhookUrl && <p className="mt-1 text-xs text-red-600">{errors.webhookUrl.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (E.164 format)</label>
            <input
              {...register('phoneNumber')}
              placeholder="+14155552671"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
            />
            <p className="mt-1 text-xs text-gray-400">Used as caller ID for outbound calls. E.164 format (e.g. +14155552671)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost Rate ($/min, admin-only)</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">$</span>
              <input
                {...register('actualCostRate')}
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
              />
              <span className="text-gray-400 text-sm">/min</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input {...register('isActive')} type="checkbox" id="isActive" className="accent-[#004D3E]" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible to assigned users)</label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>
              {editingAgent ? 'Save Changes' : 'Add Agent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Agent"
        size="sm"
      >
        <p className="text-gray-600 text-sm mb-4">
          Are you sure you want to delete <span className="font-semibold">{deleteConfirm?.name}</span>?
          This will remove all user assignments but won&apos;t delete call history.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && deleteAgent(deleteConfirm)}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
