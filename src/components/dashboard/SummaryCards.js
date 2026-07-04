import React from 'react';
import { TrendingUp, Users, Bookmark, Zap, Target } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export function SummaryCards({ stats, loading }) {
  const cards = [
    {
      label: 'Generated Leads',
      value: stats?.generatedCount || 0,
      sub: 'Lifetime total',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      label: 'Saved Pipeline',
      value: stats?.savedCount || 0,
      sub: 'Curated leads',
      icon: Bookmark,
      color: 'text-secondary',
      bg: 'bg-secondary/10'
    },
    {
      label: 'New Today',
      value: stats?.todayCount || 0,
      sub: 'Found by monitors',
      icon: TrendingUp,
      color: 'text-lime-green',
      bg: 'bg-lime-green/10'
    },
    {
      label: 'Avg. Intent',
      value: `${stats?.avgScore ?? 0}/10`,
      sub: 'Target accuracy',
      icon: Target,
      color: 'text-tertiary',
      bg: 'bg-tertiary/10'
    },
    {
      label: 'Conv. Rate',
      value: `${stats?.conversionRate ?? 0}%`,
      sub: 'Gen to Saved',
      icon: Users,
      color: 'text-[#6366f1]',
      bg: 'bg-[#6366f1]/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className="stat-card flex flex-col justify-between group hover:border-primary/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="stat-label">{card.label}</span>
            <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", card.bg, card.color)}>
              <card.icon size={16} />
            </div>
          </div>
          <div>
            <div className="stat-value">
              {loading ? <div className="h-8 w-20 skeleton" /> : formatNumber(card.value)}
            </div>
            <div className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">
              {card.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
