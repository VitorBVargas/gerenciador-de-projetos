import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function TimelineHeader({ startDate, endDate, viewType, onViewChange, pixelsPerDay }) {
  const today = new Date();

  const getDates = () => {
    if (viewType === 'week') {
      const start = new Date(startDate);
      return eachDayOfInterval({ start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) });
    } else if (viewType === 'month') {
      return eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
    }
  };

  const dates = useMemo(() => getDates(), [startDate, endDate, viewType]);
  const isToday = (date) => format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  return (
    <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onViewChange(viewType)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onViewChange(viewType)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewType === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Semana
          </Button>
          <Button 
            variant={viewType === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Mês
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto scrollbar-none">
        {dates && dates.map((date, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 border-r border-slate-700"
            style={{ width: `${pixelsPerDay * (viewType === 'week' ? 1 : 1)}px` }}
          >
            <div className={`text-xs p-1 text-center ${isToday(date) ? 'bg-blue-600/20' : ''}`}>
              <div className="text-slate-400">{format(date, 'EEE', { locale: pt })}</div>
              <div className="text-slate-300 font-semibold">{format(date, 'd')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}