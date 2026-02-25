'use client';

import { motion } from 'framer-motion';
import { StatsCard } from '@/components/ui/stats-card';
import { staggerContainer } from '@/lib/animations';
import { formatDuration } from '@/lib/utils';

interface Stats {
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  avgDurationMs: number;
}

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <StatsCard
        title="Total Calls"
        value={stats.totalCalls.toLocaleString()}
        icon="phone"
        iconColor="text-[#004D3E]"
      />
      <StatsCard
        title="Successful Calls"
        value={stats.successfulCalls.toLocaleString()}
        subtitle={`${stats.successRate}% success rate`}
        icon="check-circle"
        iconColor="text-green-600"
      />
      <StatsCard
        title="Avg Duration"
        value={formatDuration(stats.avgDurationMs)}
        icon="clock"
        iconColor="text-blue-600"
      />
      <StatsCard
        title="Success Rate"
        value={`${stats.successRate}%`}
        icon="trending-up"
        iconColor="text-purple-600"
      />
    </motion.div>
  );
}
