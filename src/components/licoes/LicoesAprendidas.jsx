import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus, Pencil, Trash2, ExternalLink, Tag, User, Calendar,
  BookOpen, AlertCircle, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import LicaoAprendidaModal from '@/components/modals/LicaoAprendidaModal';

const TIPO_LABELS = {
  tecnico: 'Técnico',
  processo: 'Processo',
  comunicacao: 'Comunicação',
  cronograma: 'Cronograma',
  risco: 'Risco',
  cliente: 'Cliente',
  outro: 'Outro',
};

const TIPO_COLORS = {
  tecnico: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  processo: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  comunicacao: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  cronograma: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  risco: 'bg-red-500/20 text-red-300 border-red-500/30',
  cliente: 'bg-green-500/20 text-green-300 border-green-500/30',
  outro: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function formatDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}

function LicaoCard({ licao, onEdit, onDelete, onView }) {
  return (
    <Card
      className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
      onClick={() => onView(licao)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${TIPO_COLORS[licao.tipo] || TIPO_COLORS.outro}`}>
                {TIPO_LABELS[licao.tipo] || licao.tipo}
              </span>
              {licao.tags?.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">{tag}</span>
              ))}
              {licao.tags?.length > 3 && (
                <span className="text-xs text-slate-500">+{licao.tags.length - 3}</span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-white truncate">{licao.title}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(licao)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors rounded">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(licao)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="font-medium text-slate-300">Problema</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{licao.problema}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lightbulb className="w-3 h-3 text-green-400 flex-shrink-0" />
              <span className="font-medium text-slate-300">Solução</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{licao.solucao}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-700/50">
          {licao.responsavel && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {licao.responsavel}
            </span>
          )}
          {licao.data && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(licao.data)}
            </span>
          )}
          {licao.links?.length > 0 && (
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> {licao.links.length} link(s)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LicaoDetailModal({ licao, onClose, onEdit }) {
  if (!licao) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${TIPO_COLORS[licao.tipo] || TIPO_COLORS.outro}`}>
                  {TIPO_LABELS[licao.tipo] || licao.tipo}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{licao.title}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => { onClose(); onEdit(licao); }} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {licao.responsavel && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{licao.responsavel}</span>}
            {licao.data && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(licao.data)}</span>}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
              <AlertCircle className="w-4 h-4 text-red-400" /> Problema
            </div>
            <div className="bg-red-900/10 border border-red-700/20 rounded-lg p-3">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{licao.problema}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
              <Lightbulb className="w-4 h-4 text-green-400" /> Solução
            </div>
            <div className="bg-green-900/10 border border-green-700/20 rounded-lg p-3">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{licao.solucao}</p>
            </div>
          </div>

          {licao.links?.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-blue-400" /> Links úteis
              </p>
              <div className="flex flex-wrap gap-2">
                {licao.links.map((link, idx) => (
                  <a key={idx} href={link} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline truncate max-w-xs flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />{link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {licao.tags?.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-400" /> Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {licao.tags.map(tag => (
                  <span key={tag} className="bg-slate-700 text-slate-300 rounded-full px-2.5 py-0.5 text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LicoesAprendidas({ projectId, portfolio }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: licoes = [], isLoading } = useQuery({
    queryKey: ['licoes', projectId],
    queryFn: () => base44.entities.LicaoAprendida.filter({ project_id: projectId }, '-data', 200),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LicaoAprendida.create({ ...data, project_id: projectId, portfolio: portfolio || '' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licoes', projectId] }); setModalOpen(false); toast.success('Lição adicionada!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LicaoAprendida.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licoes', projectId] }); setModalOpen(false); setEditing(null); toast.success('Lição atualizada!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LicaoAprendida.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licoes', projectId] }); setDeleteConfirm(null); toast.success('Lição removida!'); },
  });

  const handleSave = (form) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleEdit = (licao) => {
    setEditing(licao);
    setModalOpen(true);
  };

  const responsaveis = useMemo(() => [...new Set(licoes.map(l => l.responsavel).filter(Boolean))].sort(), [licoes]);

  const filtered = useMemo(() => licoes.filter(l =>
    (!filterTipo || l.tipo === filterTipo) &&
    (!filterResponsavel || l.responsavel === filterResponsavel)
  ), [licoes, filterTipo, filterResponsavel]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Lições Aprendidas</h2>
            <p className="text-xs text-slate-400">{licoes.length} lição(ões) registrada(s)</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2 self-start md:self-auto">
          <Plus className="w-4 h-4" /> Adicionar Lição
        </Button>
      </div>

      {/* Filters */}
      {licoes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="h-8 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {responsaveis.length > 0 && (
            <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)}
              className="h-8 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs">
              <option value="">Todos os responsáveis</option>
              {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {(filterTipo || filterResponsavel) && (
            <button onClick={() => { setFilterTipo(''); setFilterResponsavel(''); }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
              ✕ Limpar
            </button>
          )}
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} de {licoes.length}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">Nenhuma lição aprendida registrada</p>
          <p className="text-slate-500 text-sm mt-1">Registre problemas e soluções para evitar retrabalho futuro</p>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Adicionar primeira lição
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(licao => (
            <LicaoCard
              key={licao.id}
              licao={licao}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              onView={setViewing}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <LicaoAprendidaModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}
        licao={editing}
        onSave={handleSave}
      />

      <LicaoDetailModal
        licao={viewing}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
      />

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Confirmar exclusão</h3>
            <p className="text-sm text-slate-400">Tem certeza que deseja excluir a lição <span className="text-white font-medium">"{deleteConfirm.title}"</span>? Esta ação é irreversível.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}