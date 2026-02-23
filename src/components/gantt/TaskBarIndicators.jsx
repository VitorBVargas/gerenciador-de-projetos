import React from 'react';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { TaskService } from './TaskService';

export default function TaskBarIndicators({ task }) {
  const isDelayed = TaskService.isTaskDelayed(task);
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';
  const isOnTrack = !isDelayed && task.progress >= (100 / (task.duration_days || 1)) * ((new Date(task.end_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex gap-1 items-center absolute top-1 right-1">
      {isDelayed && !isDone && (
        <div
          className="flex items-center justify-center w-4 h-4 bg-red-600/80 rounded-full"
          title="Atrasada"
        >
          <AlertCircle className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {isDone && (
        <div
          className="flex items-center justify-center w-4 h-4 bg-green-600/80 rounded-full"
          title="Concluída"
        >
          <CheckCircle className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {isInProgress && isOnTrack && (
        <div
          className="flex items-center justify-center w-4 h-4 bg-blue-600/80 rounded-full"
          title="No Prazo"
        >
          <Clock className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {isInProgress && !isOnTrack && !isDelayed && (
        <div
          className="flex items-center justify-center w-4 h-4 bg-amber-600/80 rounded-full"
          title="Em Risco"
        >
          <TrendingUp className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}