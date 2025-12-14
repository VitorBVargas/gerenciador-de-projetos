import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, trendValue, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-emerald-500/10 text-emerald-400",
    orange: "bg-orange-500/10 text-orange-400",
    purple: "bg-purple-500/10 text-purple-400",
    red: "bg-red-500/10 text-red-400",
    cyan: "bg-cyan-500/10 text-cyan-400"
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 p-6 hover:bg-slate-800 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-sm",
              trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400"
            )}>
              {trend === "up" && <span>↑</span>}
              {trend === "down" && <span>↓</span>}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-xl", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </Card>
  );
}