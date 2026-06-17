import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const FIELDS = [
  { key: 'projeto', label: 'Projeto', type: 'text' },
  { key: 'numero_contrato', label: 'Nº do Contrato', type: 'text' },
  { key: 'chamado', label: 'Chamado', type: 'text' },
  { key: 'chamado_link', label: 'Link do Chamado', type: 'text' },
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'vertical', label: 'Vertical', type: 'text' },
  { key: 'sistema', label: 'Sistema', type: 'text' },
  { key: 'numero_item', label: 'Nº Item', type: 'text' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'data_prevista', label: 'Data Prevista', type: 'date' },
  { key: 'item_edital', label: 'Item do Edital', type: 'textarea' },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
];

export default function EditEditalItemModal({ item, onClose, onSave, isSaving }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (item) {
      const initial = {};
      FIELDS.forEach(f => { initial[f.key] = item[f.key] || ''; });
      setForm(initial);
    }
  }, [item]);

  if (!item) return null;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Editar Item do Edital</h3>
            <p className="text-xs text-slate-400 mt-0.5">{item.projeto} · Nº {item.numero_item}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.filter(f => f.type !== 'textarea').map(f => (
              <div key={f.key}>
                <Label className="text-xs text-slate-300 mb-1 block">{f.label}</Label>
                <Input
                  type={f.type}
                  value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  className="bg-slate-900 border-slate-600 text-slate-200 h-9 text-sm"
                />
              </div>
            ))}
          </div>

          {FIELDS.filter(f => f.type === 'textarea').map(f => (
            <div key={f.key}>
              <Label className="text-xs text-slate-300 mb-1 block">{f.label}</Label>
              <Textarea
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                rows={f.key === 'item_edital' ? 5 : 3}
                className="bg-slate-900 border-slate-600 text-slate-200 text-sm"
              />
            </div>
          ))}
        </form>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700 bg-slate-800/50">
          <Button type="button" variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}