import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        
        const { event, data } = body;
        
        if (!data || !data.project_id) {
            return Response.json({ success: true });
        }

        const projectId = data.project_id;
        
        // Buscar todos os produtos do projeto
        const products = await base44.asServiceRole.entities.Product.filter({ project_id: projectId });
        
        // Calcular totais
        const totalImplantacao = products.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
        const totalInclusao = products.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);
        
        // Atualizar o projeto com os totais
        await base44.asServiceRole.entities.Project.update(projectId, {
            implementation_value: totalImplantacao,
            recurring_value: totalInclusao
        });
        
        return Response.json({ 
            success: true, 
            total_products: products.length,
            implementation_value: totalImplantacao,
            recurring_value: totalInclusao
        });
    } catch (error) {
        console.error('Erro ao atualizar totais:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});