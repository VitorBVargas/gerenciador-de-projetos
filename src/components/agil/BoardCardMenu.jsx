import React from 'react';
import { Edit, Copy, CalendarRange, Lock, Bug, GitBranch, Trash2 } from 'lucide-react';

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-200 hover:bg-slate-700'}`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

export default function BoardCardMenu({ x, y, item, sprints, onClose, onEdit, onDuplicate, onMoveSprint, onBlock, onConvertBug, onSubtask, onDelete }) {
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-[61] w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 overflow-hidden"
        style={{ top: Math.min(y, window.innerHeight - 320), left: Math.min(x, window.innerWidth - 220) }}
      >
        <MenuItem icon={Edit} label="Editar" onClick={() => { onEdit(item); onClose(); }} />
        <MenuItem icon={Copy} label="Duplicar" onClick={() => { onDuplicate(item); onClose(); }} />
        <div className="relative group">
          <div className="px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 cursor-default"><CalendarRange className="w-4 h-4" /> Mover Sprint</div>
          <div className="hidden group-hover:block absolute left-full top-0 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 max-h-60 overflow-y-auto">
            <MenuItem icon={CalendarRange} label="Backlog geral" onClick={() => { onMoveSprint(item, ''); onClose(); }} />
            {(sprints || []).map(s => <MenuItem key={s.id} icon={CalendarRange} label={s.nome} onClick={() => { onMoveSprint(item, s.id); onClose(); }} />)}
          </div>
        </div>
        <MenuItem icon={Lock} label={item.bloqueado ? 'Desbloquear' : 'Bloquear'} onClick={() => { onBlock(item); onClose(); }} />
        {item.tipo !== 'bug' && <MenuItem icon={Bug} label="Converter em Bug" onClick={() => { onConvertBug(item); onClose(); }} />}
        <MenuItem icon={GitBranch} label="Criar Subtask" onClick={() => { onSubtask(item); onClose(); }} />
        <div className="h-px bg-slate-700 my-1" />
        <MenuItem icon={Trash2} label="Excluir" danger onClick={() => { onDelete(item); onClose(); }} />
      </div>
    </>
  );
}