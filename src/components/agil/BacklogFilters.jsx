import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TIPO_OPTIONS, PRIORIDADE_OPTIONS, STATUS_OPTIONS } from './backlogMeta';

const FilterSelect = ({ value, onChange, placeholder, options }) => (
  <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
    <SelectTrigger className="bg-slate-800 border-slate-700 h-9 text-sm w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className="bg-slate-800 border-slate-700 text-white">
      <SelectItem value="all">{placeholder}</SelectItem>
      {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export default function BacklogFilters({ filters, setFilters, options }) {
  const set = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const hasActive = Object.values(filters).some(Boolean);

  const toOpts = (arr) => arr.filter(Boolean).map(v => ({ value: v, label: v }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
      <FilterSelect value={filters.produto} onChange={(v) => set('produto', v)} placeholder="Produto" options={toOpts(options.produtos)} />
      <FilterSelect value={filters.vertical} onChange={(v) => set('vertical', v)} placeholder="Vertical" options={toOpts(options.verticals)} />
      <FilterSelect value={filters.sprint_id} onChange={(v) => set('sprint_id', v)} placeholder="Sprint" options={options.sprints} />
      <FilterSelect value={filters.tipo} onChange={(v) => set('tipo', v)} placeholder="Tipo" options={TIPO_OPTIONS} />
      <FilterSelect value={filters.responsavel} onChange={(v) => set('responsavel', v)} placeholder="Responsável" options={toOpts(options.responsaveis)} />
      <FilterSelect value={filters.prioridade} onChange={(v) => set('prioridade', v)} placeholder="Prioridade" options={PRIORIDADE_OPTIONS} />
      <FilterSelect value={filters.status} onChange={(v) => set('status', v)} placeholder="Status" options={STATUS_OPTIONS} />
      <FilterSelect value={filters.tag} onChange={(v) => set('tag', v)} placeholder="Tags" options={toOpts(options.tags)} />
      <FilterSelect value={filters.story_points} onChange={(v) => set('story_points', v)} placeholder="Story Points" options={toOpts(options.storyPoints)} />
      <FilterSelect value={filters.epic_id} onChange={(v) => set('epic_id', v)} placeholder="Epic" options={options.epics} />
      {hasActive && (
        <Button variant="outline" className="border-slate-700 text-slate-300 h-9" onClick={() => setFilters({})}>
          <X className="w-4 h-4 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}