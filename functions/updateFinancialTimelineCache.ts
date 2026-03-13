import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Limpar cache existente (em lotes para evitar rate limit)
    const existingCache = await base44.asServiceRole.entities.FinancialTimelineCache.list('', 10000);
    const batchSize = 50;
    for (let i = 0; i < existingCache.length; i += batchSize) {
      const batch = existingCache.slice(i, i + batchSize);
      await Promise.all(batch.map(c => base44.asServiceRole.entities.FinancialTimelineCache.delete(c.id)));
      await new Promise(resolve => setTimeout(resolve, 100)); // Delay entre lotes
    }
    
    // 2. Buscar todos os dados
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    
    // 3. Para cada produto, buscar suas datas específicas de go_live e operação_assistida
    const cachesToCreate = allProducts.map(product => {
      // Busca os eventos específicos deste produto (por product_id)
      const productEvents = allTimelineEvents.filter(e => e.product_id === product.id);
      
      // Encontra a data de fim da operação assistida (para reconhecimento de implantação)
      const operacaoEvent = productEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
      
      // Encontra a data de go_live (para reconhecimento recorrente)
      const goLiveEvent = productEvents.find(e => e.phase === 'go_live' && e.start_date);
      
      return {
        project_id: product.project_id,
        product_id: product.id,
        implantacao_end_date: operacaoEvent?.end_date || null,
        go_live_start_date: goLiveEvent?.start_date || null,
        go_live_end_date: goLiveEvent?.end_date || null,
        last_updated: new Date().toISOString()
      };
    });
    
    // 4. Bulk create
    if (cachesToCreate.length > 0) {
      await base44.asServiceRole.entities.FinancialTimelineCache.bulkCreate(cachesToCreate);
    }
    
    return Response.json({ success: true, cached: cachesToCreate.length });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});