import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, subtitle, trend, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendText = () => {
    if (!trend) return null;
    const absValue = Math.abs(trend);
    return (
      <span className={cn(
        "text-xs",
        trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-slate-400"
      )}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    );
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
          {Icon && (
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", colorClasses[color])}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {getTrendIcon()}
            {getTrendText()}
          </div>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}