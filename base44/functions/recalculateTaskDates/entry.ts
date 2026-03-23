import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, taskId } = await req.json();

    if (!projectId || !taskId) {
      return Response.json({ error: 'projectId and taskId are required' }, { status: 400 });
    }

    // Fetch the modified task
    const task = await base44.asServiceRole.entities.Task.read(taskId);

    if (!task || task.project_id !== projectId) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch all tasks for this project, sorted by order_index
    const allTasks = await base44.asServiceRole.entities.Task.filter({
      project_id: projectId
    });

    allTasks.sort((a, b) => a.order_index - b.order_index);

    const updates = [];

    // Recalculate end_date for current task if duration_days changed
    const calculatedEndDate = addDays(task.start_date, task.duration_days - 1);
    if (calculatedEndDate !== task.end_date) {
      updates.push({
        id: taskId,
        end_date: calculatedEndDate
      });
    }

    // Recalculate dates for all following tasks
    let currentTask = task;
    const taskIndex = allTasks.findIndex(t => t.id === taskId);

    for (let i = taskIndex + 1; i < allTasks.length; i++) {
      const nextTask = allTasks[i];
      const newStartDate = addDays(currentTask.end_date, 1);
      const newEndDate = addDays(newStartDate, nextTask.duration_days - 1);

      updates.push({
        id: nextTask.id,
        start_date: newStartDate,
        end_date: newEndDate
      });

      currentTask = { ...nextTask, start_date: newStartDate, end_date: newEndDate };
    }

    // Apply all updates
    for (const update of updates) {
      await base44.asServiceRole.entities.Task.update(update.id, update);
    }

    return Response.json({
      success: true,
      tasksUpdated: updates.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}