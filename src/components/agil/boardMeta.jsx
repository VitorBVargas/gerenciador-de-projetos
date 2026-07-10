// Colunas do Sprint Board + limites WIP padrão
export const BOARD_COLUMNS = [
  { id: 'backlog', label: 'Backlog', wip: 0, dot: 'bg-slate-500' },
  { id: 'ready', label: 'Ready', wip: 10, dot: 'bg-sky-500' },
  { id: 'em_desenvolvimento', label: 'Em Desenvolvimento', wip: 5, dot: 'bg-yellow-500' },
  { id: 'code_review', label: 'Code Review', wip: 4, dot: 'bg-purple-500' },
  { id: 'teste', label: 'Teste', wip: 6, dot: 'bg-cyan-500' },
  { id: 'homologacao', label: 'Homologação', wip: 5, dot: 'bg-orange-500' },
  { id: 'concluido', label: 'Concluído', wip: 0, dot: 'bg-green-500' },
];

// Mapeia board_status -> status "de negócio" do backlog
export const BOARD_TO_STATUS = {
  backlog: 'backlog',
  ready: 'to_do',
  em_desenvolvimento: 'em_andamento',
  code_review: 'em_revisao',
  teste: 'em_revisao',
  homologacao: 'em_revisao',
  concluido: 'concluido',
};

// Estado da coluna em relação ao WIP: normal | warning | over
export function wipState(count, wip) {
  if (!wip) return 'normal';
  if (count > wip * 1.5) return 'over';
  if (count > wip) return 'warning';
  return 'normal';
}

export const SWIMLANE_OPTIONS = [
  { value: 'none', label: 'Sem swimlane' },
  { value: 'responsavel', label: 'Por Responsável' },
  { value: 'produto', label: 'Por Produto' },
  { value: 'epic_id', label: 'Por Epic' },
  { value: 'prioridade', label: 'Por Prioridade' },
  { value: 'tipo', label: 'Por Tipo' },
];

// board_status efetivo (fallback derivado do status antigo)
export function effectiveColumn(item) {
  if (item.board_status) return item.board_status;
  const map = {
    backlog: 'backlog',
    to_do: 'ready',
    em_andamento: 'em_desenvolvimento',
    em_revisao: 'code_review',
    bloqueado: 'em_desenvolvimento',
    concluido: 'concluido',
  };
  return map[item.status] || 'backlog';
}