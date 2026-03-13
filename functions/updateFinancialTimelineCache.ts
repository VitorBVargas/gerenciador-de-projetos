import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Limpar cache existente
    const existingCache = await base44.asServiceRole.entities.FinancialTimelineCache.list('', 10000);
    const deletePromises = existingCache.map(c => base44.asServiceRole.entities.FinancialTimelineCache.delete(c.id));
    await Promise.all(deletePromises);
    
    // 2. Buscar dados
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    const allCronogramas = await base44.asServiceRole.entities.Cronograma.list('-created_date', 1000);
    
    // 3. Index por project + vertical
    const eventsByProjectVertical = {};
    allTimelineEvents.forEach(e => {
      const key = `${e.project_id}_${e.vertical || 'default'}`;
      if (!eventsByProjectVertical[key]) eventsByProjectVertical[key] = [];
      eventsByProjectVertical[key].push(e);
    });
    
    // 4. Criar cache apenas para produtos que pertencem a cronogramas existentes
    const cachesToCreate = [];
    allProducts.forEach(product => {
      // Busca cronograma deste produto
      const cronograma = allCronogramas.find(c => 
        c.project_id === product.project_id && c.vertical === product.vertical
      );
      
      if (!cronograma) return; // Pula produtos sem cronograma
      
      // Busca events por project + vertical
      const key = `${product.project_id}_${product.vertical}`;
      const events = eventsByProjectVertical[key] || [];
      
      const operacaoEvent = events.find(e => e.phase === 'operacao_assistida' && e.end_date);
      const goLiveEvent = events.find(e => e.phase === 'go_live' && (e.start_date || e.end_date));
      
      cachesToCreate.push({
        project_id: product.project_id,
        product_id: product.id,
        implantacao_end_date: operacaoEvent?.end_date || null,
        go_live_start_date: goLiveEvent?.start_date || null,
        go_live_end_date: goLiveEvent?.end_date || null,
        last_updated: new Date().toISOString()
      });
    });
    
    // 5. Bulk create
    if (cachesToCreate.length > 0) {
      await base44.asServiceRole.entities.FinancialTimelineCache.bulkCreate(cachesToCreate);
    }
    
    return Response.json({ success: true, cached: cachesToCreate.length });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});