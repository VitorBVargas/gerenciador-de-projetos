import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Crown } from 'lucide-react';

const verticalLabels = {
  gerenciamento: 'Gerenciamento',
  arrecadacao: 'Arrecadação',
  compras: 'Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  atendimento: 'Atendimento',
  extensoes: 'Extensões',
  gestao_projetos: 'Gestão de Projetos',
  gestao_operacoes: 'Gestão de Operações',
  coordenacao_tecnica: 'Coordenação Técnica',
  outros: 'Outros'
};

export default function TeamCountModal({ project, members = [], onClose }) {
  // Agrupa por vertical
  const grouped = {};
  members.forEach((m) => {
    const key = m.vertical || 'outros';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });
  const groups = Object.entries(grouped).sort((a, b) =>
    (verticalLabels[a[0]] || a[0]).localeCompare(verticalLabels[b[0]] || b[0])
  );

  return (
    <Dialog open={!!project} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-blue-400" />
            Equipe — {project?.name}
            <span className="ml-1 text-sm font-normal text-slate-400">({members.length} {members.length === 1 ? 'pessoa' : 'pessoas'})</span>
          </DialogTitle>
        </DialogHeader>

        {members.length === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">Nenhum membro cadastrado neste projeto.</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([vertical, list]) => (
              <div key={vertical}>
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                  {verticalLabels[vertical] || vertical} <span className="text-slate-500">({list.length})</span>
                </div>
                <div className="space-y-1.5">
                  {list.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-white truncate">{m.name}</span>
                          {m.is_leader && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                        </div>
                        {m.role && <div className="text-xs text-slate-400 truncate">{m.role}</div>}
                      </div>
                      {m.entity && <span className="text-[10px] text-slate-300 bg-slate-700/60 border border-slate-600 px-2 py-0.5 rounded flex-shrink-0">{m.entity}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}