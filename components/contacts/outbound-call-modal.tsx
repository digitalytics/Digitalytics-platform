'use client';

import { useState, useEffect } from 'react';
import { PhoneCall, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface Agent {
  id: string;
  name: string;
  phoneNumber: string | null;
  retellAgentId: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
}

interface OutboundCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
}

export function OutboundCallModal({ isOpen, onClose, contact }: OutboundCallModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/agents')
        .then(r => r.json())
        .then((data: Agent[]) => {
          const withPhone = data.filter(a => a.phoneNumber);
          setAgents(withPhone);
          if (withPhone.length === 1) setSelectedAgentId(withPhone[0].id);
        });
    }
  }, [isOpen]);

  const handleCall = async () => {
    if (!selectedAgentId) return;
    setIsCalling(true);
    setError(null);

    const res = await fetch('/api/calls/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: selectedAgentId,
        contactId: contact.id,
        toNumber: contact.phone,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to initiate call');
      setIsCalling(false);
    } else {
      setSuccess(true);
      setIsCalling(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    setSelectedAgentId('');
    onClose();
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Call Contact" size="sm">
      {success ? (
        <div className="text-center py-4">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">Call initiated!</p>
          <p className="text-sm text-gray-500 mt-1">
            Calling <span className="font-mono">{contact.phone}</span>
          </p>
          <Button className="mt-4 w-full" variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{fullName}</p>
            <p className="text-sm font-mono text-gray-600 mt-0.5">{contact.phone}</p>
          </div>

          {agents.length === 0 ? (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              No agents with a configured phone number found. Ask your admin to add a phone number to an agent.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Agent</label>
              <select
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E]"
              >
                <option value="">Choose an agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.phoneNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedAgent && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
              Calling from: <span className="font-mono font-medium">{selectedAgent.phoneNumber}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleCall}
              disabled={!selectedAgentId || agents.length === 0}
              isLoading={isCalling}
            >
              <PhoneCall size={14} />
              Call Now
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
