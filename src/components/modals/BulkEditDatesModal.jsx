import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { phaseLabels } from '@/components/timeline/phaseLabels';

export default function BulkEditDatesModal({ 
  open, 
  onOpenChange, 
  events = [], 
  onApply,
  mode = 'vertical' // 'vertical' or 'all'
}) {
  const [editedEvents, setEditedEvents] = useState(events);
  const [confirmOpen, setConfirmOpen] = useState(false);

  React.useEffect(() => {
    setEditedEvents(events);
  }, [events, open]);

  const handleDateChange = (eventId, field, value) => {
    setEditedEvents(prev =>
      prev.map(e =>
        e.id === eventId ? { ...e, [field]: value } : e
      )
    );
  };

  const handleApply = async () => {
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    await onApply(editedEvents);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {mode === 'vertical' 
                ? 'Editar Datas por Vertical' 
                : 'Editar Datas de Todas as Entidades'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editedEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Nenhuma etapa encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {editedEvents.map(event => (
                  <div key={event.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-3">
                      {phaseLabels[event.phase] || event.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                        <Input
                          type="date"
                          value={event.start_date || ''}
                          onChange={(e) => handleDateChange(event.id, 'start_date', e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                        <Input
                          type="date"
                          value={event.end_date || ''}
                          onChange={(e) => handleDateChange(event.id, 'end_date', e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={editedEvents.length === 0}
            >
              Aplicar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar alterações</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja alterar as datas de {editedEvents.length} etapa(s)? Esta ação afetará todos os produtos desta {mode === 'vertical' ? 'vertical' : 'entidade'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}