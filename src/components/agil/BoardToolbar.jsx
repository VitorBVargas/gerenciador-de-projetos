import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SWIMLANE_OPTIONS } from './boardMeta';
import { TIPO_OPTIONS, PRIORIDADE_OPTIONS } from './backlogMeta';
import { Layers, Lock, Bug, Wrench, X } from 'lucide-react';

const ALL = '__all__';

const Sel = ({ value, onChange, placeholder, options }) => (
  <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
    <SelectTrigger className="h-8 w-auto min-w-[130px] bg-slate-800 border-slate-700 text-slate-200 text-xs">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
      <SelectItem value={ALL}>{placeholder}</SelectItem>
      {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export default function BoardToolbar({ filters, setFilters, swimlane, setSwimlane, options }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const toggle = (k) => setFilters(f => ({ ...f, [k]: !f[k] }));
  const clear = () => setFilters({});
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-1">
        <Layers className="w-3.5 h-3.5" /> Swimlane:
      </div>
      <Select value={swimlane} onValueChange={setSwimlane}>
        <SelectTrigger className="h-8 w-auto min-w-[150px] bg-slate-800 border-slate-700 text-slate-200 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
          {SWIMLANE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-slate-700 mx-1" />

      <Sel value={filters.responsavel} onChange={(v) => set('responsavel', v)} placeholder="Responsável" options={(options.responsaveis || []).map(v => ({ value: v, label: v }))} />
      <Sel value={filters.produto} onChange={(v) => set('produto', v)} placeholder="Produto" options={(options.produtos || []).map(v => ({ value: v, label: v }))} />
      <Sel value={filters.epic_id} onChange={(v) => set('epic_id', v)} placeholder="Epic" options={options.epics || []} />
      <Sel value={filters.tipo} onChange={(v) => set('tipo', v)} placeholder="Tipo" options={TIPO_OPTIONS} />
      <Sel value={filters.prioridade} onChange={(v) => set('prioridade', v)} placeholder="Prioridade" options={PRIORIDADE_OPTIONS} />
      <Sel value={filters.tag} onChange={(v) => set('tag', v)} placeholder="Tag" options={(options.tags || []).map(v => ({ value: v, label: v }))} />

      <Button size="sm" variant={filters.bloqueados ? 'default' : 'outline'} className={`h-8 text-xs ${filters.bloqueados ? 'bg-red-600 hover:bg-red-700' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`} onClick={() => toggle('bloqueados')}><Lock className="w-3.5 h-3.5 mr-1" />Bloqueados</Button>
      <Button size="sm" variant={filters.somenteBugs ? 'default' : 'outline'} className={`h-8 text-xs ${filters.somenteBugs ? 'bg-red-600 hover:bg-red-700' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`} onClick={() => toggle('somenteBugs')}><Bug className="w-3.5 h-3.5 mr-1" />Bugs</Button>
      <Button size="sm" variant={filters.somenteDebito ? 'default' : 'outline'} className={`h-8 text-xs ${filters.somenteDebito ? 'bg-slate-600 hover:bg-slate-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`} onClick={() => toggle('somenteDebito')}><Wrench className="w-3.5 h-3.5 mr-1" />Débito Técnico</Button>

      {activeCount > 0 && (
        <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-white" onClick={clear}>
          <X className="w-3.5 h-3.5 mr-1" />Limpar <Badge className="ml-1 bg-slate-700 text-slate-200">{activeCount}</Badge>
        </Button>
      )}
    </div>
  );
}