import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, className, description }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl p-6 shadow-sm border border-slate-100', className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon size={20} className="text-blue-600" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
  );
}
