import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os produtos e eventos
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    
    let updated = 0;
    let created = 0;
    
    // Para cada produto, buscar as datas relevantes e fazer upsert
    for (const product of allProducts) {
      const productEvents = allTimelineEvents.filter(e => e.product_id === product.id);
      
      const goLiveEvent = productEvents.find(e => e.phase === 'go_live' && e.start_date);
      const operacaoEvent = productEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
      
      // Processar apenas se houver pelo menos uma data
      if (goLiveEvent || operacaoEvent) {
        const dateData = {
          product_id: product.id,
          project_id: product.project_id,
          go_live_date: goLiveEvent?.start_date || null,
          operacao_assistida_end_date: operacaoEvent?.end_date || null,
          last_updated: new Date().toISOString()
        };
        
        // Buscar registro existente
        const existing = await base44.asServiceRole.entities.ProductFinancialDates.filter(
          { product_id: product.id }
        );
        
        if (existing && existing.length > 0) {
          // Atualizar
          await base44.asServiceRole.entities.ProductFinancialDates.update(existing[0].id, dateData);
          updated++;
        } else {
          // Criar
          await base44.asServiceRole.entities.ProductFinancialDates.create(dateData);
          created++;
        }
      }
    }
    
    return Response.json({ 
      success: true, 
      created,
      updated,
      total_products: allProducts.length
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});