import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'secondary';
  delay?: number;
}

const colorStyles = {
  primary: 'from-blue-500/20 to-blue-600/10 text-blue-400',
  success: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
  warning: 'from-amber-500/20 to-amber-600/10 text-amber-400',
  secondary: 'from-violet-500/20 to-violet-600/10 text-violet-400'
};

const iconBgStyles = {
  primary: 'bg-blue-500/20 text-blue-400',
  success: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-400',
  secondary: 'bg-violet-500/20 text-violet-400'
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary',
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`glass-card p-6 relative overflow-hidden group`}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorStyles[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${iconBgStyles[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
              {trendValue}
            </div>
          )}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
