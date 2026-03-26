import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const projectId = '69b2fd01707dcf32104fd039';
        
        // Buscar produtos em lotes
        let allProducts = [];
        let skip = 0;
        const batchSize = 100;
        
        while (true) {
            const batch = await base44.entities.Product.list('-created_date', batchSize, skip);
            if (!batch || batch.length === 0) break;
            
            const projectProducts = batch.filter(p => p.project_id === projectId);
            allProducts = allProducts.concat(projectProducts);
            
            if (batch.length < batchSize) break;
            skip += batchSize;
        }
        
        // Calcular somas
        const totalImplantacao = allProducts.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
        const totalInclusao = allProducts.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);
        
        // Separar por vertical para detalhamento
        const byVertical = {};
        allProducts.forEach(p => {
            const v = p.vertical || 'outros';
            if (!byVertical[v]) byVertical[v] = { implantacao: 0, inclusao: 0, count: 0 };
            byVertical[v].implantacao += p.implementation_value || 0;
            byVertical[v].inclusao += p.inclusion_value || 0;
            byVertical[v].count += 1;
        });
        
        return Response.json({
            total_products: allProducts.length,
            total_implantacao: Math.round(totalImplantacao * 100) / 100,
            total_inclusao: Math.round(totalInclusao * 100) / 100,
            by_vertical: byVertical
        });
    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});