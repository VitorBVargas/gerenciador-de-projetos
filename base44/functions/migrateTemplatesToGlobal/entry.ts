import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Buscar todos os ProjectDocumentControl que têm template_url
    const allControls = await base44.asServiceRole.entities.ProjectDocumentControl.list('-created_date', 5000);
    const controlsWithTemplate = allControls.filter(c => c.template_url && c.product_id);

    // Carregar todos produtos para mapear product_id -> name
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    const productNameById = {};
    for (const p of allProducts) {
      productNameById[p.id] = p.name;
    }

    // Carregar templates globais existentes para dedupe
    const allGlobals = await base44.asServiceRole.entities.GlobalDocumentTemplate.list('-created_date', 5000);
    const existingKey = new Set();
    for (const g of allGlobals) {
      if (g.product_name) existingKey.add(`${g.document_type}__${g.product_name}`);
    }

    let created = 0;
    let skipped = 0;
    let noProduct = 0;
    const errors = [];

    // Para deduplicar dentro do próprio lote (vários projetos com mesmo produto)
    const seenInBatch = new Set();

    for (const ctrl of controlsWithTemplate) {
      const productName = productNameById[ctrl.product_id];
      if (!productName) {
        noProduct++;
        continue;
      }
      const key = `${ctrl.document_type}__${productName}`;
      if (existingKey.has(key) || seenInBatch.has(key)) {
        skipped++;
        continue;
      }
      try {
        await base44.asServiceRole.entities.GlobalDocumentTemplate.create({
          document_type: ctrl.document_type,
          product_name: productName,
          template_url: ctrl.template_url,
        });
        seenInBatch.add(key);
        created++;
      } catch (e) {
        errors.push({ ctrl_id: ctrl.id, error: e.message });
      }
    }

    return Response.json({
      total_with_template: controlsWithTemplate.length,
      created,
      skipped_already_exists: skipped,
      skipped_product_not_found: noProduct,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});