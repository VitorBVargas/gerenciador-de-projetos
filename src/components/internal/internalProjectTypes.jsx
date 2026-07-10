// Configuração dos tipos de Projeto Interno e quais abas cada tipo exibe.
// As chaves das abas correspondem aos ids em NAV (InternalDashboard).

export const INTERNAL_TYPE_META = {
  implantacao: { label: 'Implantação', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  sustentacao: { label: 'Sustentação', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  agil: { label: 'Ágil (Scrum/Kanban)', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export const INTERNAL_TYPE_OPTIONS = Object.entries(INTERNAL_TYPE_META).map(([value, m]) => ({ value, label: m.label }));

// Abas visíveis por tipo (ids das abas do dashboard interno)
export const INTERNAL_TABS_BY_TYPE = {
  implantacao: ['overview', 'team', 'stakeholders', 'products', 'discovery', 'schedule', 'migration', 'checklist', 'activities', 'travels', 'budget', 'risks', 'kpi'],
  sustentacao: ['overview', 'team', 'stakeholders', 'products', 'schedule', 'checklist', 'activities', 'travels', 'budget', 'risks', 'kpi'],
  agil: ['overview', 'team', 'stakeholders', 'products', 'discovery', 'activities', 'budget', 'risks', 'kpi'],
};

export function getVisibleTabs(projectType) {
  return INTERNAL_TABS_BY_TYPE[projectType] || INTERNAL_TABS_BY_TYPE.implantacao;
}