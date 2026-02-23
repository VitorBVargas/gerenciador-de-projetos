import React, { useRef, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { TaskService } from './TaskService';
import TaskBarIndicators from './TaskBarIndicators';

export default function TaskBar({
  task,
  projectStartDate,
  pixelsPerDay,
  onDelete,
  onEdit,
  onDurationChange,
  onDateChange
}) {
  const barRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const daysFromStart = differenceInDays(new Date(task.start_date), new Date(projectStartDate));
  const barWidth = task.duration_days * pixelsPerDay;
  const leftOffset = daysFromStart * pixelsPerDay;

  const handleDragStart = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (isResizing && barRef.current) {
      const newWidth = e.clientX - barRef.current.getBoundingClientRect().left;
      const newDuration = Math.max(1, Math.round(newWidth / pixelsPerDay));
      if (newDuration !== task.duration_days) {
        onDurationChange(task.id, newDuration);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, pixelsPerDay, task.duration_days, task.id, onDurationChange]);

  const statusColor = TaskService.getTaskColor(task.status);
  const isDelayed = TaskService.isTaskDelayed(task);

  return (
    <div
      ref={barRef}
      draggable
      onDragStart={handleDragStart}
      className="group relative bg-slate-700/50 rounded-lg p-2 cursor-move hover:bg-slate-600/50 transition-all duration-200 border border-slate-600 hover:border-slate-500"
      style={{
        left: `${leftOffset}px`,
        width: `${barWidth}px`,
        minWidth: '100px'
      }}
      onClick={() => onEdit(task)}
    >
      {/* Task Bar Content */}
      <div className={`${statusColor} rounded-md h-8 flex items-center px-2 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        
        <div className="relative flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{task.title}</p>
        </div>

        {/* Progress Bar */}
        {task.progress > 0 && (
          <div className="absolute bottom-0 left-0 h-1 bg-white/30" style={{ width: `${task.progress}%` }}></div>
        )}
      </div>

      {/* Delayed Indicator */}
      {isDelayed && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-red-300"></div>
      )}

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-slate-400 rounded opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-slate-300 transition-all"
      ></div>

      {/* Actions */}
      <div className="absolute -top-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 px-2 py-1 rounded text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {format(new Date(task.start_date), 'dd/MM')} - {format(new Date(task.end_date), 'dd/MM')}
      </div>
    </div>
  );
}