import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Check, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';

const portfolioLabels = {
  grandes_contas_sc_mg: 'Grandes Contas SC/MG',
  grandes_contas_sc_sp: 'Grandes Contas SC/SP',
  medias_contas: 'Médias Contas',
};

/**
 * Lista todos os projetos e permite selecionar quais um Parceiro pode acessar.
 * Salva diretamente no usuário (allowed_project_ids).
 */
export default function ParceiroProjectsSelector({ user, onSaved }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(user.allowed_project_ids || []);

  useEffect(() => {
    let mounted = true;
    base44.entities.Project.list('-created_date', 1000)
      .then((list) => { if (mounted) setProjects(list); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSelected(user.allowed_project_ids || []);
  }, [user.id, user.allowed_project_ids]);

  const toggle = async (projectId) => {
    const next = selected.includes(projectId)
      ? selected.filter((id) => id !== projectId)
      : [...selected, projectId];
    setSelected(next);
    setSaving(true);
    try {
      await base44.entities.User.update(user.id, { allowed_project_ids: next });
      onSaved?.(next);
    } finally {
      setSaving(false);
    }
  };

  const filtered = projects.filter((p) =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" />
          Projetos liberados ({selected.length})
        </p>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
      </div>
      <Input
        placeholder="Buscar projeto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm mb-2 bg-white"
      />
      {loading ? (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {filtered.map((p) => {
            const isSel = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left text-sm transition-colors ${
                  isSel ? 'bg-blue-100 text-blue-900' : 'hover:bg-white text-slate-700'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {portfolioLabels[p.portfolio] || p.portfolio}
                  </span>
                </span>
                {isSel && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3">Nenhum projeto encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}