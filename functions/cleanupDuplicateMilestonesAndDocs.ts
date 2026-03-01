import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all milestones and documents
  const [allMilestones, allDocuments] = await Promise.all([
    base44.asServiceRole.entities.ProjectMilestone.list(),
    base44.asServiceRole.entities.ProjectDocument.list(),
  ]);

  const deletedMilestones = [];
  const deletedDocuments = [];

  // --- MILESTONES ---
  // Group by project_id + title
  const milestoneGroups = {};
  for (const m of allMilestones) {
    const key = `${m.project_id}::${m.title}`;
    if (!milestoneGroups[key]) milestoneGroups[key] = [];
    milestoneGroups[key].push(m);
  }

  for (const [key, items] of Object.entries(milestoneGroups)) {
    if (items.length <= 1) continue;
    // Keep the one with completed=true if any, otherwise keep oldest (lowest created_date)
    items.sort((a, b) => {
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return new Date(a.created_date) - new Date(b.created_date);
    });
    const toDelete = items.slice(1);
    for (const m of toDelete) {
      await base44.asServiceRole.entities.ProjectMilestone.delete(m.id);
      deletedMilestones.push(m.id);
    }
  }

  // --- DOCUMENTS ---
  // Group by project_id + title
  const docGroups = {};
  for (const d of allDocuments) {
    const key = `${d.project_id}::${d.title}`;
    if (!docGroups[key]) docGroups[key] = [];
    docGroups[key].push(d);
  }

  for (const [key, items] of Object.entries(docGroups)) {
    if (items.length <= 1) continue;
    // Keep the one with most data (link/file_url/completed), then oldest
    items.sort((a, b) => {
      const scoreA = (a.completed ? 2 : 0) + (a.link ? 1 : 0) + (a.file_url ? 1 : 0);
      const scoreB = (b.completed ? 2 : 0) + (b.link ? 1 : 0) + (b.file_url ? 1 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.created_date) - new Date(b.created_date);
    });
    const toDelete = items.slice(1);
    for (const d of toDelete) {
      await base44.asServiceRole.entities.ProjectDocument.delete(d.id);
      deletedDocuments.push(d.id);
    }
  }

  return Response.json({
    success: true,
    deletedMilestones: deletedMilestones.length,
    deletedDocuments: deletedDocuments.length,
  });
});