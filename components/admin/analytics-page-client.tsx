'use client';

import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { StatsCard } from '@/components/ui/stats-card';
import { staggerContainer } from '@/lib/animations';
import { Card, CardTitle } from '@/components/ui/card';
import { formatCost, formatDuration } from '@/lib/utils';

interface Summary {
  totalCalls: number;
  totalCost: number;
  avgCostPerCall: number;
  totalDurationMs: number;
}

interface AgentCost {
  agentId: string;
  agentName: string;
  totalCost: number;
  callCount: number;
}

interface DayData {
  date: string;
  count: number;
  cost: number;
}

export function AnalyticsPageClient({
  summary,
  costByAgent,
  callsByDay,
}: {
  summary: Summary;
  costByAgent: AgentCost[];
  callsByDay: DayData[];
}) {
  const avgCostPerCall = summary.totalCalls > 0 ? summary.totalCost / summary.totalCalls : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatsCard title="Total Cost" value={formatCost(summary.totalCost)} icon="dollar-sign" iconColor="text-orange-500" />
        <StatsCard title="Total Calls" value={summary.totalCalls.toLocaleString()} icon="phone" iconColor="text-[#004D3E]" />
        <StatsCard title="Avg Cost/Call" value={formatCost(avgCostPerCall)} icon="trending-up" iconColor="text-blue-600" />
        <StatsCard title="Total Duration" value={formatDuration(summary.totalDurationMs)} icon="clock" iconColor="text-purple-600" />
      </motion.div>

      {/* Calls & Cost Over Time */}
      {callsByDay.length > 0 && (
        <Card>
          <CardTitle className="mb-4">Calls & Cost — Last 30 Days</CardTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callsByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={d => d.slice(5)} // MM-DD
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={v => `$${v.toFixed(2)}`} />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'cost' ? [`$${Number(value).toFixed(4)}`, 'Cost'] : [value, 'Calls']
                  }
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#004D3E" strokeWidth={2} dot={false} name="Calls" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={false} name="Cost ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Cost by Agent */}
      {costByAgent.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardTitle className="mb-4">Cost by Agent</CardTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByAgent} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="agentName" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v.toFixed(2)}`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, 'Total Cost']} />
                  <Bar dataKey="totalCost" fill="#004D3E" radius={[4, 4, 0, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="none">
            <div className="p-6 border-b border-gray-100">
              <CardTitle>Agent Breakdown</CardTitle>
            </div>
            <div className="divide-y divide-gray-100">
              {costByAgent.map(a => (
                <div key={a.agentId} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.agentName}</p>
                    <p className="text-xs text-gray-400">{a.callCount.toLocaleString()} calls</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCost(a.totalCost)}</p>
                    <p className="text-xs text-gray-400">{formatCost(a.callCount > 0 ? a.totalCost / a.callCount : 0)}/call</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
