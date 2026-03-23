import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_PHASES = [
  { phase: 'planejamento_contrato', title: 'Planejamento/Contrato' },
  { phase: 'kickoff', title: 'Kickoff' },
  { phase: 'diagnostico', title: 'Diagnóstico' },
  { phase: 'onboarding_cliente', title: 'Onboarding Cliente' },
  { phase: 'configuracao_migracao_hml', title: 'Configuração/Migração de Homologação' },
  { phase: 'homologacao_base', title: 'Homologação da Base' },
  { phase: 'migracao_prd_blackout', title: 'Migração de PRD (Blackout)' },
  { phase: 'configuracao_prd', title: 'Configuração de PRD' },
  { phase: 'treinamento', title: 'Treinamento' },
  { phase: 'go_live', title: 'Go-Live' },
  { phase: 'operacao_assistida', title: 'Operação Assistida' },
  { phase: 'encerramento_bastao', title: 'Encerramento/Passagem de Bastão' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { projectId } = payload;

    if (!projectId) {
      return Response.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Get all products for this project
    const products = await base44.entities.Product.filter({ project_id: projectId });

    if (products.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No products found for this project',
        created: 0
      });
    }

    // Create 12 default stages for each product
    const eventsToCreate = [];
    products.forEach((product, index) => {
      DEFAULT_PHASES.forEach((phaseData, phaseIndex) => {
        eventsToCreate.push({
          project_id: projectId,
          product_id: product.id,
          title: phaseData.title,
          phase: phaseData.phase,
          vertical: product.vertical,
          status: 'nao_iniciado',
          progress: 0,
          order: phaseIndex
        });
      });
    });

    // Bulk create all events
    const created = await base44.entities.TimelineEvent.bulkCreate(eventsToCreate);

    return Response.json({ 
      success: true, 
      created: created.length,
      products: products.length,
      totalStages: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});