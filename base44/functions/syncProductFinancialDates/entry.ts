import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const { event, data } = payload;
    
    // Apenas processar eventos de TimelineEvent
    if (event.entity_name !== 'TimelineEvent') {
      return Response.json({ success: true, message: 'Not a TimelineEvent' });
    }
    
    // Apenas processar se for go_live ou operacao_assistida
    if (!data || !data.product_id || (data.phase !== 'go_live' && data.phase !== 'operacao_assistida')) {
      return Response.json({ success: true, message: 'Not relevant phase' });
    }
    
    const productId = data.product_id;
    const projectId = data.project_id;
    
    if (!productId || !projectId) {
      return Response.json({ success: true, message: 'Missing product_id or project_id' });
    }
    
    // Buscar TODOS os eventos deste produto para pegar as datas mais recentes
    const allProductEvents = await base44.asServiceRole.entities.TimelineEvent.filter(
      { product_id: productId },
      '-created_date',
      100
    );
    
    // Encontrar as datas relevantes
    const goLiveEvent = allProductEvents.find(e => e.phase === 'go_live' && e.start_date);
    const operacaoEvent = allProductEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
    
    // Buscar registro existente
    const existing = await base44.asServiceRole.entities.ProductFinancialDates.filter(
      { product_id: productId }
    );
    
    const dateData = {
      product_id: productId,
      project_id: projectId,
      go_live_date: goLiveEvent?.start_date || null,
      operacao_assistida_end_date: operacaoEvent?.end_date || null,
      last_updated: new Date().toISOString()
    };
    
    if (existing && existing.length > 0) {
      // Atualizar
      await base44.asServiceRole.entities.ProductFinancialDates.update(
        existing[0].id,
        dateData
      );
    } else {
      // Criar
      await base44.asServiceRole.entities.ProductFinancialDates.create(dateData);
    }
    
    return Response.json({ 
      success: true, 
      product_id: productId,
      dates: dateData
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});