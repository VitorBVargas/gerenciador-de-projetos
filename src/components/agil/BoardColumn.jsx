import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import BoardCard from './BoardCard';
import { wipState } from './boardMeta';
import { AlertTriangle } from 'lucide-react';

const STATE_STYLES = {
  normal: { header: 'bg-slate-800/70 border-slate-700', badge: 'bg-slate-700 text-slate-300' },
  warning: { header: 'bg-yellow-500/10 border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-300' },
  over: { header: 'bg-red-500/10 border-red-500/40', badge: 'bg-red-500/20 text-red-300' },
};

export default function BoardColumn({ column, items, epicsById, onCardClick, onCardContext }) {
  const count = items.length;
  const sp = items.reduce((s, i) => s + (i.story_points || 0), 0);
  const horas = items.reduce((s, i) => s + (i.tempo_gasto || 0), 0);
  const state = wipState(count, column.wip);
  const styles = STATE_STYLES[state];

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <div className={`rounded-t-xl border px-3 py-2.5 ${styles.header}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${column.dot}`} />
            <span className="text-sm font-semibold text-white">{column.label}</span>
            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${styles.badge}`}>{count}</span>
          </div>
          {column.wip > 0 && (
            <span className={`text-[10px] flex items-center gap-1 ${state !== 'normal' ? 'text-yellow-300' : 'text-slate-500'}`}>
              {state !== 'normal' && <AlertTriangle className="w-3 h-3" />}
              WIP {count}/{column.wip}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span>{sp} SP</span>
          <span>{horas}h</span>
        </div>
      </div>

      {/* Lista de cards */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-b-xl border border-t-0 border-slate-700/60 p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-700/30' : 'bg-slate-900/40'}`}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dp, ds) => (
                  <BoardCard
                    item={item}
                    epic={epicsById[item.epic_id]}
                    innerRef={dp.innerRef}
                    dragProps={dp.draggableProps}
                    dragHandle={dp.dragHandleProps}
                    isDragging={ds.isDragging}
                    onClick={() => onCardClick(item)}
                    onContextMenu={(e) => onCardContext(e, item)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {items.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-center text-[11px] text-slate-600 py-4">Sem itens</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}