import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Busca inicial (Trazemos as datas existentes para evitar N+1)
    const [allProducts, allTimelineEvents, allExistingDates] = await Promise.all([
      base44.asServiceRole.entities.Product.list('-created_date', 5000),
      base44.asServiceRole.entities.TimelineEvent.list('-created_date', 10000),
      base44.asServiceRole.entities.ProductFinancialDates.list('-created_date', 5000)
    ]);
    
    // ✅ DICIONÁRIOS O(1): Indexando eventos e datas existentes
    const eventsByProduct = new Map();
    allTimelineEvents.forEach(e => {
      if (!eventsByProduct.has(e.product_id)) eventsByProduct.set(e.product_id, []);
      eventsByProduct.get(e.product_id).push(e);
    });

    const datesMap = new Map(allExistingDates.map(d => [d.product_id, d]));
    
    let updated = 0;
    let created = 0;
    
    // Em vez de executar imediatamente, armazenamos uma função que retorna a Promise
    const operations = [];

    for (const product of allProducts) {
      const productEvents = eventsByProduct.get(product.id) || [];
      const goLiveEvent = productEvents.find(e => e.phase === 'go_live' && e.start_date);
      const operacaoEvent = productEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
      
      if (goLiveEvent || operacaoEvent) {
        const dateData = {
          product_id: product.id,
          project_id: product.project_id,
          go_live_date: goLiveEvent?.start_date || null,
          operacao_assistida_end_date: operacaoEvent?.end_date || null,
          last_updated: new Date().toISOString()
        };
        
        const existing = datesMap.get(product.id);
        
        if (existing) {
          operations.push(() => base44.asServiceRole.entities.ProductFinancialDates.update(existing.id, dateData));
          updated++;
        } else {
          operations.push(() => base44.asServiceRole.entities.ProductFinancialDates.create(dateData));
          created++;
        }
      }
    }
    
    // ✅ CHUNKING: Executa operações em lotes menores com delay para evitar rate limit
    const CHUNK_SIZE = 10;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(op => op()));
      if (i + CHUNK_SIZE < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return Response.json({ success: true, created, updated, total_products: allProducts.length });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});