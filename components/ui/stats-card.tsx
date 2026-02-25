'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/animations';
import {
  Phone, CheckCircle, Clock, TrendingUp, Users, Bot,
  DollarSign, BarChart3, Activity, Calendar, AlertCircle,
} from 'lucide-react';

export type IconName =
  | 'phone' | 'check-circle' | 'clock' | 'trending-up'
  | 'users' | 'bot' | 'dollar-sign' | 'bar-chart' | 'activity'
  | 'calendar' | 'alert-circle';

const iconMap: Record<IconName, React.ElementType> = {
  'phone': Phone,
  'check-circle': CheckCircle,
  'clock': Clock,
  'trending-up': TrendingUp,
  'users': Users,
  'bot': Bot,
  'dollar-sign': DollarSign,
  'bar-chart': BarChart3,
  'activity': Activity,
  'calendar': Calendar,
  'alert-circle': AlertCircle,
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: IconName;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-[#004D3E]',
  trend,
  className,
}: StatsCardProps) {
  const Icon = iconMap[icon] ?? Activity;

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs mt-1 font-medium',
                trend.value >= 0 ? 'text-green-600' : 'text-red-500'
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg bg-gray-50', iconColor)}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}
