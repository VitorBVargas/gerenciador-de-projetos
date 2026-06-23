import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Edit, Plus } from 'lucide-react';
import EntityModal from './EntityModal';

export default function EntityManagerCard({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities', projectId],
    queryFn: () => base44.entities.Entidade.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const orderedEntities = useMemo(() => {
    return [...entities].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || (a.nome || '').localeCompare(b.nome || ''));
  }, [entities]);

  const handleSave = async (data) => {
    if (editing?.id) {
      await base44.entities.Entidade.update(editing.id, data);
    } else {
      await base44.entities.Entidade.create({ ...data, project_id: projectId, ordem: orderedEntities.length });
    }
    queryClient.invalidateQueries(['entities', projectId]);
  };

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" /> Entidades da Prestação de Contas
        </CardTitle>
        {canEdit && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6"><div className="w-6 h-6 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : orderedEntities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-4 text-sm text-slate-400">
            Nenhuma entidade cadastrada ainda. Ao adicionar, ela vira aba na prestação de contas e também entra no filtro do quadro consolidado.
          </div>
        ) : (
          orderedEntities.map((entity) => (
            <div key={entity.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/30 px-4 py-3">
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{entity.nome}</p>
                <p className="text-xs text-slate-400 truncate">{entity.nome_completo || 'Sem nome completo'}</p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => { setEditing(entity); setOpen(true); }}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
      <EntityModal open={open} onOpenChange={setOpen} entity={editing} onSave={handleSave} />
    </Card>
  );
}