import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Stopwords e normalização (mesma lógica do PDF para manter consistência)
const STOPWORDS = new Set([
  'de','da','do','das','dos','e','a','o','as','os','em','para','com','por',
  'prefeitura','municipal','municipio','município','camara','câmara','cm','pm',
  'ipasi','sas','grp','govview','cloud','contas','grandes','medias','médias','sc','mg','sp'
]);

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractCity(name) {
  if (!name) return '';
  const cleaned = name.replace(/\s*-\s*.*$/, '').trim();
  const prefixes = ['cm ', 'pm ', 'prefeitura municipal de ', 'prefeitura de ', 'camara municipal de ', 'câmara municipal de ', 'ipasi '];
  let result = cleaned;
  for (const p of prefixes) {
    if (result.toLowerCase().startsWith(p)) {
      result = result.substring(p.length).trim();
      break;
    }
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Aceita invocação manual (project_id) ou via automation (event.entity_id + data)
    const projectId = body.project_id || body.event?.entity_id;
    const data = body.data || null;
    const oldData = body.old_data || null;

    if (!projectId) {
      return Response.json({ error: 'project_id ausente' }, { status: 400 });
    }

    // Se veio de automation: só dispara quando status mudou para "concluido"
    if (body.event?.type === 'update' && data && oldData) {
      if (data.status !== 'concluido' || oldData.status === 'concluido') {
        return Response.json({ skipped: true, reason: 'status não mudou para concluido' });
      }
    }

    // Buscar projeto (para nome/portfólio)
    const project = data || await base44.asServiceRole.entities.Project.get(projectId);
    if (!project) {
      return Response.json({ error: 'projeto não encontrado' }, { status: 404 });
    }

    // Buscar itens de edital do portfólio
    const editalItems = await base44.asServiceRole.entities.EditalItem.filter({ portfolio: project.portfolio }).catch(() => []);

    // Correlação por nº do contrato do projeto = numero_contrato do item de edital.
    // REGRA: se o projeto tem contrato cadastrado, SÓ vincula pelo contrato (sem fallback).
    // Fallback por nome/cidade só ocorre quando o projeto não tem contract_number.
    const contractNumber = (project.contract_number || '').trim();
    let related = [];
    let matchedBy;

    if (contractNumber) {
      const cnNorm = contractNumber.toLowerCase();
      related = editalItems.filter(item => (item.numero_contrato || '').trim().toLowerCase() === cnNorm);
      matchedBy = 'contract_number';
    } else {
      const city = (project.city && project.city.trim()) || extractCity(project.name);
      const projectNameNorm = normalize(project.name);
      const cityNorm = normalize(city);
      const projectTokens = projectNameNorm.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t));

      related = editalItems.filter(item => {
        const proj = normalize(item.projeto);
        if (!proj) return false;
        if (cityNorm && cityNorm.length >= 3 && proj.includes(cityNorm)) return true;
        if (projectNameNorm && (proj.includes(projectNameNorm) || projectNameNorm.includes(proj))) return true;
        return projectTokens.some(t => proj.includes(t));
      });
      matchedBy = 'name_fallback';
    }

    const open = related.filter(i => {
      const s = (i.status || '').toLowerCase();
      return !s.includes('concl') && !s.includes('atend');
    });

    const overdue = open.filter(i => {
      if (!i.data_prevista) return false;
      const today = new Date();
      const prev = new Date(i.data_prevista);
      return prev < today;
    });

    const openItems = open.map(i => ({
      numero_item: i.numero_item || '',
      chamado: i.chamado || '',
      chamado_link: i.chamado_link || '',
      item_edital: i.item_edital || '',
      status: i.status || '',
      data_prevista: i.data_prevista || ''
    }));

    // Evitar duplicar: se já existe snapshot para o projeto, atualiza
    const existing = await base44.asServiceRole.entities.EditalClosureSnapshot.filter({ project_id: projectId }).catch(() => []);

    const payload = {
      project_id: projectId,
      captured_at: new Date().toISOString(),
      total_count: related.length,
      open_count: open.length,
      overdue_count: overdue.length,
      open_items: openItems,
      matched_by: matchedBy,
      contract_number: contractNumber
    };

    let snapshot;
    if (existing.length > 0) {
      snapshot = await base44.asServiceRole.entities.EditalClosureSnapshot.update(existing[0].id, payload);
    } else {
      snapshot = await base44.asServiceRole.entities.EditalClosureSnapshot.create(payload);
    }

    return Response.json({ success: true, snapshot });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});