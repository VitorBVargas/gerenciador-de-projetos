import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import StatusCell from '@/components/edital/StatusCell';
import { base44 } from '@/api/base44Client';
import { ExternalLink, AlertTriangle, Clock, X, Search, Pencil, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import EditalPagination from '@/components/edital/EditalPagination';
import EditEditalItemModal from '@/components/edital/EditEditalItemModal';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// Compara "Nº Item" como número quando possível, caindo para string como fallback.
const compareNumeroItem = (a = '', b = '') => {
  const na = parseFloat(String(a).replace(',', '.'));
  const nb = parseFloat(String(b).replace(',', '.'));
  const aNum = !Number.isNaN(na);
  const bNum = !Number.isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
};

const getStatusCls = (s = '') => {
  const sl = s.toLowerCase();
  if (sl.includes('conclu') || sl.includes('entregue') || sl.includes('aprovad') || sl.includes('finaliz')) return 'text-green-300 bg-green-500/20 border-green-500/40';
  if (sl.includes('andamento') || sl.includes('desenvolvimento') || sl.includes('análise') || sl.includes('analise')) return 'text-blue-300 bg-blue-500/20 border-blue-500/40';
  if (sl.includes('cancel') || sl.includes('recusad')) return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
  return 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40'; // default: aguardando etc
};

export default function EditalTable({ items, portfolio, showProject = true, projectName = null, showFilters = false }) {
  const [filterVertical, setFilterVertical] = useState('');
  const [filterSistema, setFilterSistema] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect all unique statuses from current data for the dropdown
  const allStatuses = [...new Set(items.map(i => i.status).filter(Boolean))];

  const verticals = [...new Set(items.map(i => i.vertical).filter(Boolean))].sort();
  const sistemas = [...new Set(items.map(i => i.sistema).filter(Boolean))].sort();
  const statusOptions = [...new Set(items.map(i => i.status).filter(Boolean))].sort();

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const result = items.filter(i => {
      const matchesFilters =
        (!filterVertical || i.vertical === filterVertical) &&
        (!filterSistema || i.sistema === filterSistema) &&
        (!filterStatus || i.status === filterStatus);

      if (!matchesFilters) return false;
      if (!normalizedSearch) return true;

      const searchableText = [
        i.chamado,
        i.vertical,
        i.sistema,
        i.numero_item,
        i.item_edital,
        i.status,
        i.projeto,
        i.tipo,
        i.observacoes,
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

    // Na Lista Geral (showProject=true), ordena por Projeto → Nº Item
    if (showProject) {
      result.sort((a, b) => {
        const projCmp = String(a.projeto || '').localeCompare(String(b.projeto || ''), 'pt-BR', { sensitivity: 'base' });
        if (projCmp !== 0) return projCmp;
        return compareNumeroItem(a.numero_item, b.numero_item);
      });
    }

    return result;
  }, [items, filterVertical, filterSistema, filterStatus, normalizedSearch, showProject]);

  // Paginação apenas na Lista Geral
  const isListaGeral = showProject;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const totalPages = isListaGeral ? Math.max(1, Math.ceil(filteredItems.length / pageSize)) : 1;

  // Reset para página 1 quando filtros/busca/total/tamanho mudarem
  useEffect(() => { setPage(1); }, [filterVertical, filterSistema, filterStatus, normalizedSearch, items.length, pageSize]);
  // Garante que a página atual nunca passe do total (após mudança de filtros)
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    if (!isListaGeral) return filteredItems;
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, isListaGeral, page, pageSize]);

  const [itemModal, setItemModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractInput, setContractInput] = useState('');
  const [savingContract, setSavingContract] = useState(false);
  const queryClient = useQueryClient();

  const currentContract = useMemo(() => {
    const list = [...new Set(items.map(i => i.numero_contrato).filter(Boolean))];
    return list.join(', ');
  }, [items]);

  const openContractModal = () => {
    setContractInput(currentContract);
    setContractModalOpen(true);
  };

  const saveContractForProject = async () => {
    if (!projectName) return;
    setSavingContract(true);
    try {
      const value = contractInput.trim();
      await Promise.all(
        items.map(i => base44.entities.EditalItem.update(i.id, { numero_contrato: value }))
      );
      await queryClient.invalidateQueries({ queryKey: ['editalItems', portfolio] });
      toast.success('Número do contrato atualizado para todos os itens do projeto.');
      setContractModalOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSavingContract(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EditalItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['editalItems', portfolio] }),
    onError: () => toast.error('Erro ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EditalItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editalItems', portfolio] });
      toast.success('Item excluído');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const handleDelete = (item) => {
    if (window.confirm(`Excluir o item Nº ${item.numero_item || ''}? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const isDone = (s = '') => { const sl = s.toLowerCase(); return sl.includes('conclu') || sl.includes('entregue') || sl.includes('aprovad') || sl.includes('finaliz') || sl.includes('cancel') || sl.includes('recusad'); };
  const isAtrasado = (item) => !isDone(item.status) && item.data_prevista && item.data_prevista.length >= 10 && item.data_prevista < today;
  const isProximo = (item) => !isDone(item.status) && item.data_prevista && item.data_prevista.length >= 10 && item.data_prevista >= today && item.data_prevista <= soon;

  const atrasados = items.filter(isAtrasado).length;
  const proximos = items.filter(isProximo).length;

  // Semaforo for project tab
  let semaforoText = '', semaforoColor = '';
  if (projectName) {
    if (atrasados > 0) { semaforoText = '🔴 Com atraso'; semaforoColor = 'text-red-400'; }
    else if (proximos > 0) { semaforoText = '🟡 Atenção'; semaforoColor = 'text-yellow-400'; }
    else { semaforoText = '🟢 No prazo'; semaforoColor = 'text-green-400'; }
  }

  return (
    <div className="space-y-3">
      {/* Project header */}
      {projectName && (
        <div className="flex items-center gap-4 flex-wrap pb-1">
          <h2 className="text-lg font-bold text-white">{projectName}</h2>
          <button
            onClick={openContractModal}
            className="text-xs text-slate-200 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-orange-500 rounded-md px-2 py-1 flex items-center gap-1.5 transition-colors"
            title="Clique para editar o número do contrato"
          >
            <FileText className="w-3 h-3 text-orange-400" />
            Contrato:{' '}
            <b className="text-white">
              {currentContract || <span className="text-slate-400 font-normal italic">cadastrar</span>}
            </b>
            <Pencil className="w-3 h-3 text-slate-400" />
          </button>
          <span className={`text-sm font-semibold ${semaforoColor}`}>{semaforoText}</span>
          <div className="flex items-center gap-4 ml-auto text-xs text-slate-400">
            <span>Total: <b className="text-white">{items.length}</b></span>
            <span>Concluídos: <b className="text-green-400">{items.filter(i => isDone(i.status)).length}</b></span>
            <span>Pendentes: <b className="text-yellow-400">{items.filter(i => !isDone(i.status)).length}</b></span>
            {atrasados > 0 && <span>Atrasados: <b className="text-red-400">{atrasados}</b></span>}
          </div>
        </div>
      )}

      {/* Filters for project tabs */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)}
            className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs">
            <option value="">Todas as Verticais</option>
            {verticals.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterSistema} onChange={e => setFilterSistema(e.target.value)}
            className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs">
            <option value="">Todos os Sistemas</option>
            {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs">
            <option value="">Todos os Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar palavra..."
              className="h-7 w-full pl-7 pr-2 rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 text-xs"
            />
          </div>
          {(filterVertical || filterSistema || filterStatus || searchTerm) && (
            <button onClick={() => { setFilterVertical(''); setFilterSistema(''); setFilterStatus(''); setSearchTerm(''); }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500">
              ✕ Limpar
            </button>
          )}
          <span className="text-xs text-slate-500 ml-auto">{filteredItems.length} de {items.length}</span>
        </div>
      )}

      {/* Alert bar for lista geral */}
      {!projectName && (atrasados > 0 || proximos > 0) && (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          {atrasados > 0 && (
            <span className="flex items-center gap-1.5 text-red-400 bg-red-900/20 border border-red-700/30 rounded-md px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {atrasados} atrasados
            </span>
          )}
          {proximos > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-md px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" /> {proximos} próximos do prazo
            </span>
          )}
          <span className="text-xs text-slate-500">{items.length} itens no total</span>
        </div>
      )}

      {/* Busca global para a Lista Geral (filtra em todas as colunas) */}
      {isListaGeral && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[280px] flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar em todas as colunas (projeto, status, vertical, chamado...)"
              className="h-8 w-full pl-8 pr-2 rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
            >
              ✕ Limpar
            </button>
          )}
          <span className="text-xs text-slate-500 ml-auto">
            {filteredItems.length} de {items.length} itens
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              {showProject && (
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Projeto</th>
              )}
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Chamado</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Vertical</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Sistema</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Nº Item</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Item do Edital</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Status</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Data Prevista</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {pagedItems.map(item => {
              const atrasado = isAtrasado(item);
              const proximo = isProximo(item);
              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    atrasado ? 'bg-red-900/15 hover:bg-red-900/25' :
                    proximo ? 'bg-yellow-900/10 hover:bg-yellow-900/20' :
                    'hover:bg-slate-800/50'
                  }`}
                >
                  {showProject && (
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-slate-300 truncate block max-w-[120px]" title={item.projeto}>
                        {item.projeto}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    {(item.chamado_link || item.chamado?.startsWith('http')) ? (
                      <a
                        href={item.chamado_link || item.chamado}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[80px]">
                          {!item.chamado?.startsWith('http') ? item.chamado : 'Abrir'}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">{item.chamado || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-slate-300">{item.vertical || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-slate-300">{item.sistema || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono text-slate-300">{item.numero_item || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {item.item_edital ? (
                      <button
                        onClick={() => setItemModal(item)}
                        className="text-xs text-left text-slate-200 hover:text-white hover:underline line-clamp-2 max-w-[260px]"
                        title="Clique para ver completo"
                      >
                        {item.item_edital}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusCell
                      status={item.status}
                      allStatuses={allStatuses}
                      onSave={val => updateMutation.mutate({ id: item.id, data: { status: val } })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {atrasado && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      {proximo && !atrasado && <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                      <input
                        type="date"
                        value={item.data_prevista || ''}
                        onChange={e => updateMutation.mutate({ id: item.id, data: { data_prevista: e.target.value } })}
                        className={`text-xs rounded border px-1.5 py-0.5 bg-transparent cursor-pointer ${
                          atrasado ? 'border-red-500/60 text-red-300' :
                          proximo ? 'border-yellow-500/60 text-yellow-300' :
                          'border-slate-600 text-slate-300'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setEditItem(item)}
                        title="Editar item"
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-orange-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        title="Excluir item"
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação (apenas Lista Geral) */}
      {isListaGeral && (
        <EditalPagination
          page={page}
          totalPages={totalPages}
          total={filteredItems.length}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          onChange={setPage}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <EditEditalItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          isSaving={updateMutation.isPending}
          onSave={(data) => {
            updateMutation.mutate(
              { id: editItem.id, data },
              {
                onSuccess: () => {
                  toast.success('Item atualizado');
                  setEditItem(null);
                },
              }
            );
          }}
        />
      )}

      {/* Contract number modal */}
      {contractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !savingContract && setContractModalOpen(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  Número do Contrato
                </h3>
                <p className="text-xs text-slate-400 mt-1">{projectName} · {items.length} itens</p>
              </div>
              <button onClick={() => setContractModalOpen(false)} className="text-slate-400 hover:text-white" disabled={savingContract}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="text-xs text-slate-300 mb-1 block">Nº do Contrato</label>
            <input
              type="text"
              value={contractInput}
              onChange={e => setContractInput(e.target.value)}
              placeholder="Ex: 123/2025"
              className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:border-orange-500 focus:outline-none"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-2">Será aplicado a todos os itens deste projeto.</p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setContractModalOpen(false)}
                disabled={savingContract}
                className="px-3 py-1.5 rounded text-sm border border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveContractForProject}
                disabled={savingContract}
                className="px-3 py-1.5 rounded text-sm bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {savingContract ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item description modal */}
      {itemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setItemModal(null)}>
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">
                  {itemModal.projeto} · Nº {itemModal.numero_item}
                </p>
                <p className="text-xs text-slate-400">
                  {[itemModal.vertical, itemModal.sistema].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={() => setItemModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{itemModal.item_edital}</p>
            {(itemModal.chamado || itemModal.chamado_link) && (
              <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2">
                <span className="text-xs text-slate-400">Chamado:</span>
                {itemModal.chamado_link ? (
                  <a href={itemModal.chamado_link} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {itemModal.chamado || 'Abrir'}
                  </a>
                ) : (
                  <span className="text-xs text-white">{itemModal.chamado}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}