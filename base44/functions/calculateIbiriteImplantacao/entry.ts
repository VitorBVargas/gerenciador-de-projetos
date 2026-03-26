import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar todos os produtos do projeto Ibirité/MG
        const projectId = '69b2fd01707dcf32104fd039';
        const products = await base44.entities.Product.filter({ project_id: projectId });
        
        // Calcular soma dos valores de implantação
        const totalImplantacao = products.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
        const totalInclusao = products.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);
        
        return Response.json({
            total_products: products.length,
            total_implantacao: totalImplantacao,
            total_inclusao: totalInclusao,
            formatted_implantacao: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalImplantacao),
            formatted_inclusao: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInclusao)
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});