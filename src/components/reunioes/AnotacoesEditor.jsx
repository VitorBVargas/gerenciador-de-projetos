import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock } from 'lucide-react';

export default function AnotacoesEditor({ reuniao, currentUser }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState(reuniao?.anotacoes?.temas || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setTexto(reuniao?.anotacoes?.temas || '');
  }, [reuniao?.id]);

  const handleChange = (value) => {
    setTexto(value);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => autosave(value), 1500);
  };

  const autosave = async (value) => {
    setSaving(true);
    await base44.entities.Reuniao.update(reuniao.id, {
      anotacoes: { ...(reuniao?.anotacoes || {}), temas: value },
      last_edited_by: currentUser?.full_name || '',
      last_edited_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries(['reunioes']);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Anotações da Reunião</h3>
        <div className="flex items-center gap-1.5 text-xs">
          {saving && <><Clock className="w-3 h-3 text-slate-400 animate-spin" /><span className="text-slate-400">Salvando...</span></>}
          {saved && <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Salvo</span></>}
          {reuniao?.last_edited_by && !saving && !saved && (
            <span className="text-slate-500">Editado por {reuniao.last_edited_by}</span>
          )}
        </div>
      </div>
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <textarea
          value={texto}
          onChange={e => handleChange(e.target.value)}
          placeholder="Registre aqui as anotações da reunião: temas discutidos, observações, pendências, próximos passos..."
          rows={16}
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  );
}