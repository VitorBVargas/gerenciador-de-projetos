import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    
    // Index events by product_id para acesso rápido
    const eventsByProductId = {};
    const eventsByProjectId = {};
    
    allTimelineEvents.forEach(e => {
      if (e.product_id) {
        if (!eventsByProductId[e.product_id]) eventsByProductId[e.product_id] = [];
        eventsByProductId[e.product_id].push(e);
      }
      if (e.project_id) {
        if (!eventsByProjectId[e.project_id]) eventsByProjectId[e.project_id] = [];
        eventsByProjectId[e.project_id].push(e);
      }
    });
    
    const cachesToCreate = allProducts.map(product => {
      // Busca events do produto
      const productEvents = eventsByProductId[product.id] || [];
      
      // Se não encontrar por product_id, usa events do projeto
      const eventsToSearch = productEvents.length > 0 ? productEvents : (eventsByProjectId[product.project_id] || []);
      
      const operacaoEvent = eventsToSearch.find(e => e.phase === 'operacao_assistida' && e.end_date);
      const goLiveEvent = eventsToSearch.find(e => e.phase === 'go_live' && (e.start_date || e.end_date));
      
      return {
        project_id: product.project_id,
        product_id: product.id,
        implantacao_end_date: operacaoEvent?.end_date || null,
        go_live_start_date: goLiveEvent?.start_date || null,
        go_live_end_date: goLiveEvent?.end_date || null,
        last_updated: new Date().toISOString()
      };
    });
    
    if (cachesToCreate.length > 0) {
      await base44.asServiceRole.entities.FinancialTimelineCache.bulkCreate(cachesToCreate);
    }
    
    return Response.json({ success: true, cached: cachesToCreate.length });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});