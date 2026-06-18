import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock } from 'lucide-react';

const SECTIONS = [
  { key: 'temas', label: 'Temas Discutidos', placeholder: 'Descreva os temas abordados na reunião...' },
  { key: 'decisoes', label: 'Decisões Tomadas', placeholder: 'Liste as decisões formalizadas...' },
  { key: 'pendencias', label: 'Pendências Identificadas', placeholder: 'Liste pendências e itens em aberto...' },
  { key: 'proximos_passos', label: 'Próximos Passos', placeholder: 'Descreva os próximos passos acordados...' },
  { key: 'observacoes', label: 'Observações Gerais', placeholder: 'Observações adicionais...' },
];

export default function AnotacoesEditor({ reuniao, currentUser }) {
  const queryClient = useQueryClient();
  const [anotacoes, setAnotacoes] = useState(reuniao?.anotacoes || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setAnotacoes(reuniao?.anotacoes || {});
  }, [reuniao?.id]);

  const handleChange = (key, value) => {
    const updated = { ...anotacoes, [key]: value };
    setAnotacoes(updated);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => autosave(updated), 1500);
  };

  const autosave = async (data) => {
    setSaving(true);
    await base44.entities.Reuniao.update(reuniao.id, {
      anotacoes: data,
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
      <div className="space-y-3">
        {SECTIONS.map(sec => (
          <div key={sec.key} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">{sec.label}</label>
            <textarea
              value={anotacoes[sec.key] || ''}
              onChange={e => handleChange(sec.key, e.target.value)}
              placeholder={sec.placeholder}
              rows={3}
              className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  );
}