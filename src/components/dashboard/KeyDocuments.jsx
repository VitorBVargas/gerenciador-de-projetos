import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento',
  saude: 'Saúde',
  gerenciamento: 'Gerenciamento',
  outros: 'Outros',
};

export default function KeyDocuments({ projectId, project, products = [] }) {
  const queryClient = useQueryClient();
  
  // Group products by vertical and entity
  const productsByVertical = {};
  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))];
  
  products.forEach(p => {
    const v = p.vertical || 'outros';
    if (!productsByVertical[v]) productsByVertical[v] = [];
    productsByVertical[v].push(p);
  });
  
  const verticals = Object.keys(productsByVertical).sort();
  const [activeVertical, setActiveVertical] = useState(verticals[0] || '');
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Filter products by entity if selected
  const currentProducts = selectedEntity
    ? (productsByVertical[activeVertical] || []).filter(p => p.entity === selectedEntity)
    : (productsByVertical[activeVertical] || []);

  const entitiesInVertical = [...new Set((productsByVertical[activeVertical] || []).map(p => p.entity).filter(Boolean))];

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
    },
  });

  if (verticals.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">Nenhum produto cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Controle de Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeVertical} onValueChange={setActiveVertical}>
          <TabsList className="bg-slate-700 border border-slate-600 flex-wrap h-auto p-1 gap-1">
            {verticals.map(v => (
              <TabsTrigger 
                key={v} 
                value={v} 
                className="data-[state=active]:bg-blue-600 text-xs"
              >
                {verticalLabels[v] || v}
              </TabsTrigger>
            ))}
          </TabsList>

          {verticals.map(vertical => (
            <TabsContent key={vertical} value={vertical} className="space-y-4 mt-4">
              {/* Entity Filter */}
              {entitiesInVertical.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Entidade:</span>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                      !selectedEntity
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                    )}
                  >
                    Todas
                  </button>
                  {entitiesInVertical.sort((a, b) => {
                    if (a === 'PM') return -1;
                    if (b === 'PM') return 1;
                    return a.localeCompare(b);
                  }).map(entity => (
                    <button
                      key={entity}
                      onClick={() => setSelectedEntity(entity === selectedEntity ? null : entity)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                        selectedEntity === entity
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                      )}
                    >
                      {entity}
                    </button>
                  ))}
                </div>
              )}

              {/* Products Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Etapa</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Data execução</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Doc enviado?</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Doc assinado?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map(product => {
                      // Buscar timeline event para pegar data
                      const productEvents = useQuery({
                        queryKey: ['timelineEvents', projectId],
                        queryFn: () => base44.entities.TimelineEvent.filter({ project_id: projectId }),
                        enabled: !!projectId,
                      });
                      
                      const event = (productEvents.data || []).find(e => e.product_id === product.id);
                      
                      return (
                        <tr key={product.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="px-3 py-2.5 text-white">{product.name}</td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {event?.start_date ? new Date(event.start_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Select
                              value={product.document_sent ? 'sim' : 'nao'}
                              onValueChange={(value) => 
                                updateProductMutation.mutate({
                                  id: product.id,
                                  data: { document_sent: value === 'sim' }
                                })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 w-20 mx-auto text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="sim" className="text-white text-xs">Sim</SelectItem>
                                <SelectItem value="nao" className="text-white text-xs">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Select
                              value={product.document_signed ? 'sim' : 'nao'}
                              onValueChange={(value) => 
                                updateProductMutation.mutate({
                                  id: product.id,
                                  data: { document_signed: value === 'sim' }
                                })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 w-20 mx-auto text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="sim" className="text-white text-xs">Sim</SelectItem>
                                <SelectItem value="nao" className="text-white text-xs">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                    {currentProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-500 text-sm">
                          Nenhum produto nesta vertical
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}