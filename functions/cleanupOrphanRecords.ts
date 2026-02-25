import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admins podem executar cleanup
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os project_ids válidos
    const projects = await base44.entities.Project.list();
    const validProjectIds = new Set(projects.map(p => p.id));

    // Cleanup TimelineEvent
    const timelineEvents = await base44.entities.TimelineEvent.list();
    const orphanTimelineEvents = timelineEvents.filter(e => !validProjectIds.has(e.project_id));
    for (const event of orphanTimelineEvents) {
      await base44.entities.TimelineEvent.delete(event.id);
    }

    // Cleanup Product
    const products = await base44.entities.Product.list();
    const orphanProducts = products.filter(p => !validProjectIds.has(p.project_id));
    for (const product of orphanProducts) {
      await base44.entities.Product.delete(product.id);
    }

    // Cleanup TeamMember
    const teamMembers = await base44.entities.TeamMember.list();
    const orphanTeam = teamMembers.filter(t => !validProjectIds.has(t.project_id));
    for (const member of orphanTeam) {
      await base44.entities.TeamMember.delete(member.id);
    }

    // Cleanup Stakeholder
    const stakeholders = await base44.entities.Stakeholder.list();
    const orphanStakeholders = stakeholders.filter(s => !validProjectIds.has(s.project_id));
    for (const stakeholder of orphanStakeholders) {
      await base44.entities.Stakeholder.delete(stakeholder.id);
    }

    // Cleanup Risk
    const risks = await base44.entities.Risk.list();
    const orphanRisks = risks.filter(r => !validProjectIds.has(r.project_id));
    for (const risk of orphanRisks) {
      await base44.entities.Risk.delete(risk.id);
    }

    return Response.json({
      success: true,
      deleted: {
        timelineEvents: orphanTimelineEvents.length,
        products: orphanProducts.length,
        teamMembers: orphanTeam.length,
        stakeholders: orphanStakeholders.length,
        risks: orphanRisks.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});