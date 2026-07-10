import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { MoreVertical, Pencil, Copy, ArrowRightLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { TIPO_META, PRIORIDADE_META, STATUS_META } from './backlogMeta';

export default function BacklogTable({ items, sprints, onRowClick, onEdit, onDuplicate, onMove, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700">
        <p className="text-slate-400">Nenhum item encontrado.</p>
      </div>
    );
  }

  const sprintName = (id) => sprints?.find(s => s.id === id)?.nome || 'Backlog geral';

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 text-slate-400 text-left">
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Epic</th>
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">Sprint</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium text-center">SP</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Atualizado</th>
            <th className="px-4 py-3 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const meta = TIPO_META[item.tipo] || TIPO_META.story;
            const Icon = meta.icon;
            const epic = items.find(i => i.id === item.epic_id);
            return (
              <tr
                key={item.id}
                onClick={() => onRowClick(item)}
                className="border-t border-slate-700/60 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${meta.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <span className="text-xs text-slate-400 hidden lg:inline">{meta.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white font-medium max-w-xs truncate">{item.titulo}</td>
                <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">{epic?.titulo || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{item.produto || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{sprintName(item.sprint_id)}</td>
                <td className="px-4 py-3 text-slate-300">{item.responsavel || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-xs font-medium">{item.story_points || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={PRIORIDADE_META[item.prioridade]?.badge}>{PRIORIDADE_META[item.prioridade]?.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_META[item.status]?.badge}>{STATUS_META[item.status]?.label}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{item.updated_date ? format(new Date(item.updated_date), 'dd/MM/yy HH:mm') : '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer focus:bg-slate-700"><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(item)} className="cursor-pointer focus:bg-slate-700"><Copy className="w-4 h-4 mr-2" /> Duplicar</DropdownMenuItem>
                      <MoveSubmenu item={item} sprints={sprints} onMove={onMove} />
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MoveSubmenu({ item, sprints, onMove }) {
  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center gap-2 text-sm mb-1 text-slate-300"><ArrowRightLeft className="w-4 h-4" /> Mover para</div>
      <Select value={item.sprint_id || 'none'} onValueChange={(v) => onMove(item, v === 'none' ? '' : v)}>
        <SelectTrigger className="bg-slate-900 border-slate-700 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          <SelectItem value="none">Backlog geral</SelectItem>
          {(sprints || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}