import { useCallback } from 'react';
import { TaskService } from './TaskService';

export function useTaskRecalculation(projectId, onTasksUpdated) {
  const handleDurationChange = useCallback(async (taskId, newDuration) => {
    try {
      await TaskService.updateTask(taskId, { duration_days: newDuration });
      await TaskService.recalculateDates(projectId, taskId);
      onTasksUpdated();
    } catch (error) {
      console.error('Error updating duration:', error);
    }
  }, [projectId, onTasksUpdated]);

  const handleOrderChange = useCallback(async (taskId, newOrder) => {
    try {
      await TaskService.updateTask(taskId, { order_index: newOrder });
      await TaskService.recalculateDates(projectId, taskId);
      onTasksUpdated();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  }, [projectId, onTasksUpdated]);

  const handleDateChange = useCallback(async (taskId, newStartDate) => {
    try {
      const tasks = await TaskService.getTasks(projectId);
      const task = tasks.find(t => t.id === taskId);
      const newDuration = task.duration_days;
      const endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() + newDuration - 1);

      await TaskService.updateTask(taskId, {
        start_date: newStartDate,
        end_date: endDate.toISOString().split('T')[0]
      });
      
      onTasksUpdated();
    } catch (error) {
      console.error('Error updating date:', error);
    }
  }, [projectId, onTasksUpdated]);

  return {
    handleDurationChange,
    handleOrderChange,
    handleDateChange
  };
}