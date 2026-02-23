import { base44 } from '@/api/base44Client';

export const TaskService = {
  async getTasks(projectId) {
    return await base44.entities.Task.filter({ project_id: projectId });
  },

  async createTask(projectId, data) {
    const tasks = await this.getTasks(projectId);
    const maxOrder = Math.max(...tasks.map(t => t.order_index), -1);
    return await base44.entities.Task.create({
      project_id: projectId,
      order_index: maxOrder + 1,
      ...data
    });
  },

  async updateTask(taskId, data) {
    return await base44.entities.Task.update(taskId, data);
  },

  async deleteTask(taskId) {
    return await base44.entities.Task.delete(taskId);
  },

  async recalculateDates(projectId, taskId) {
    return await base44.functions.invoke('recalculateTaskDates', {
      projectId,
      taskId
    });
  },

  calculatePixelsPerDay(viewType) {
    return viewType === 'week' ? 30 : viewType === 'month' ? 8 : 2;
  },

  getTaskColor(status) {
    const colors = {
      planned: 'bg-slate-500',
      in_progress: 'bg-blue-500',
      done: 'bg-green-500',
      delayed: 'bg-red-500'
    };
    return colors[status] || 'bg-slate-500';
  },

  isTaskDelayed(task) {
    return task.status !== 'done' && new Date(task.end_date) < new Date();
  }
};