import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { phaseLabels } from '@/components/timeline/phaseLabels';
import { cn } from "@/lib/utils";

export default function ActivityCard({ activity, isDragging, isDone, onClick }) {
  let cardColors = "bg-slate-800 border-slate-700";
  if (isDone) {
    cardColors = "bg-slate-800/50 border-slate-700/50 opacity-70";
  } else if (activity.end_date) {
    const endDate = new Date(activity.end_date);
    endDate.setHours(23, 59, 59, 999);
    const now = new Date();
    if (endDate < now) {
      cardColors = "bg-red-900/40 border-red-500/50";
    } else {
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) cardColors = "bg-yellow-900/40 border-yellow-500/50";
    }
  }

  const phaseLabel = activity.phase ? phaseLabels[activity.phase] : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "border rounded-lg p-3 cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm flex flex-col gap-3",
        cardColors,
        isDragging && "shadow-xl shadow-blue-900/20 border-blue-500 z-50"
      )}
    >
      {phaseLabel && (
        <div className="text-[10px] font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded w-fit max-w-full truncate border border-blue-500/30">
          {phaseLabel}
        </div>
      )}
      <div className="font-medium text-white text-sm leading-tight">{activity.title}</div>

      <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-700/50">
        {activity.assignee && (
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5 border border-slate-600">
              <AvatarFallback className="bg-slate-700 text-[9px] text-white">
                {activity.assignee.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-slate-300 truncate" title={activity.assignee}>
              {activity.assignee}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarIcon className="w-3.5 h-3.5" />
          {activity.start_date ? format(new Date(activity.start_date), 'dd/MM') : '--'} a {activity.end_date ? format(new Date(activity.end_date), 'dd/MM') : '--'}
        </div>
      </div>
    </div>
  );
}