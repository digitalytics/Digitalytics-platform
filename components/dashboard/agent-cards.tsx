'use client';

import { motion } from 'framer-motion';
import { Phone, Calendar, Activity, DollarSign } from 'lucide-react';
import { staggerContainer, cardHover } from '@/lib/animations';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/dashboard/copy-button';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Agent {
  id: string;
  retellAgentId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  phoneNumber: string | null;
  callCount: number;
  lastCallAt: Date | null;
  costMultiplier: number | null;
}

export function AgentCards({ agents }: { agents: Agent[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {agents.map(agent => (
        <motion.div
          key={agent.id}
          variants={cardHover}
          initial="rest"
          whileHover="hover"
        >
          <Link
            href={`/agents/${agent.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#004D3E]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center">
                <Activity size={20} className="text-[#004D3E]" />
              </div>
              <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                {agent.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{agent.name}</h3>
            {agent.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{agent.description}</p>
            )}

            {agent.phoneNumber && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <Phone size={11} className="text-[#004D3E]" />
                <span className="font-mono">{agent.phoneNumber}</span>
                <CopyButton text={agent.phoneNumber} />
              </div>
            )}

            {agent.costMultiplier !== null && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <DollarSign size={11} className="text-[#004D3E]" />
                <span>{agent.costMultiplier}× Retell cost</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
              <span className="flex items-center gap-1">
                <Phone size={12} />
                {agent.callCount.toLocaleString()} calls
              </span>
              {agent.lastCallAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(agent.lastCallAt)}
                </span>
              )}
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
