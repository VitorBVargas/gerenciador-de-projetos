import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { gerarRelatorioOperacionalDocx, gerarRelatorioOperacionalPdf } from './relatorioOperacionalGenerator';

const novoAtendimento = () => ({ data: '', tecnicosBetha: '', tecnicosEntidade: '', atividades: [''] });
const novaOcorrencia = () => ({ ocorrencia: '', gerouChamado: 'nao', chamado: '', impactos: '', medidas: '' });

const inputCls = 'w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm';
const areaCls = 'w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm resize-none';

export default function GerarRelatorioOperacionalModal({ projectName = '', currentUser, onClose }) {
  const [entidade, setEntidade] = useState('');
  const [chamado, setChamado] = useState('');
  const [responsavelBetha, setResponsavelBetha] = useState(currentUser?.full_name || '');
  const [periodo, setPeriodo] = useState('');
  const [nomeServidor, setNomeServidor] = useState('');
  const [cargoMatricula, setCargoMatricula] = useState('');
  const [atendimentos, setAtendimentos] = useState([novoAtendimento()]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [tipoArquivo, setTipoArquivo] = useState('doc');
  const [gerando, setGerando] = useState(false);

  const updAtend = (i, campo, valor) => setAtendimentos(prev => prev.map((a, idx) => idx === i ? { ...a, [campo]: valor } : a));
  const updAtividade = (ai, li, valor) => setAtendimentos(prev => prev.map((a, idx) => idx === ai ? { ...a, atividades: a.atividades.map((v, j) => j === li ? valor : v) } : a));
  const addAtividade = (ai) => setAtendimentos(prev => prev.map((a, idx) => idx === ai ? { ...a, atividades: [...a.atividades, ''] } : a));
  const rmAtividade = (ai, li) => setAtendimentos(prev => prev.map((a, idx) => idx === ai ? { ...a, atividades: a.atividades.filter((_, j) => j !== li) } : a));

  const updOcor = (i, campo, valor) => setOcorrencias(prev => prev.map((o, idx) => idx === i ? { ...o, [campo]: valor } : o));

  const handleGerar = async () => {
    setGerando(true);
    try {
      const dados = { projectName, entidade, chamado, responsavelBetha, periodo, atendimentos, ocorrencias, nomeServidor, cargoMatricula };
      const gerar = tipoArquivo === 'pdf' ? gerarRelatorioOperacionalPdf : gerarRelatorioOperacionalDocx;
      await gerar(dados);
      toast.success('Relatório Operacional gerado!');
      onClose();
    } catch (e) {
      toast.error('Erro ao gerar: ' + e.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Gerar Relatório Operacional
            </h3>
            <p className="text-xs text-slate-400 mt-1">Preencha os dados para gerar o documento no modelo padrão.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Dados de Identificação */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">1. Dados de Identificação</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Entidade</label>
              <input value={entidade} onChange={e => setEntidade(e.target.value)} placeholder="Ex: Prefeitura Municipal" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Chamado</label>
              <input value={chamado} onChange={e => setChamado(e.target.value)} placeholder="BTHSC XXXX" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Responsável Betha</label>
              <input value={responsavelBetha} onChange={e => setResponsavelBetha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Período</label>
              <input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Ex: 01/01 a 03/01/2026" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Escopo / Atendimentos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">3. Escopo — Atendimentos</p>
            <button onClick={() => setAtendimentos(p => [...p, novoAtendimento()])} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              <Plus className="w-3.5 h-3.5" /> Adicionar data
            </button>
          </div>
          {atendimentos.map((a, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Atendimento {i + 1}</span>
                {atendimentos.length > 1 && (
                  <button onClick={() => setAtendimentos(p => p.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Data</label>
                  <input type="date" value={a.data} onChange={e => updAtend(i, 'data', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Técnicos Betha</label>
                    <input value={a.tecnicosBetha} onChange={e => updAtend(i, 'tecnicosBetha', e.target.value)} placeholder="Nomes" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Técnicos Entidade</label>
                    <input value={a.tecnicosEntidade} onChange={e => updAtend(i, 'tecnicosEntidade', e.target.value)} placeholder="Nomes" className={inputCls} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Atividades Executadas</label>
                <div className="space-y-1.5">
                  {a.atividades.map((at, li) => (
                    <div key={li} className="flex items-center gap-2">
                      <input value={at} onChange={e => updAtividade(i, li, e.target.value)} placeholder={`Atividade ${li + 1}`} className={inputCls} />
                      {a.atividades.length > 1 && (
                        <button onClick={() => rmAtividade(i, li)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addAtividade(i)} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"><Plus className="w-3 h-3" /> Adicionar atividade</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ocorrências */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">4. Ocorrências e Interferências</p>
            <button onClick={() => setOcorrencias(p => [...p, novaOcorrencia()])} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              <Plus className="w-3.5 h-3.5" /> Adicionar ocorrência
            </button>
          </div>
          {ocorrencias.length === 0 && <p className="text-xs text-slate-500">Nenhuma ocorrência registrada (opcional).</p>}
          {ocorrencias.map((o, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ocorrência {i + 1}</span>
                <button onClick={() => setOcorrencias(p => p.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <textarea value={o.ocorrencia} onChange={e => updOcor(i, 'ocorrencia', e.target.value)} placeholder="Descreva a ocorrência" rows={2} className={areaCls} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Gerou bug/chamado?</label>
                  <select value={o.gerouChamado} onChange={e => updOcor(i, 'gerouChamado', e.target.value)} className={inputCls}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Chamado</label>
                  <input value={o.chamado} onChange={e => updOcor(i, 'chamado', e.target.value)} placeholder="BTHSC XXXX" className={inputCls} disabled={o.gerouChamado !== 'sim'} />
                </div>
              </div>
              <textarea value={o.impactos} onChange={e => updOcor(i, 'impactos', e.target.value)} placeholder="Impactos" rows={2} className={areaCls} />
              <textarea value={o.medidas} onChange={e => updOcor(i, 'medidas', e.target.value)} placeholder="Medidas adotadas" rows={2} className={areaCls} />
            </div>
          ))}
        </div>

        {/* Ciência */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">5. Ciência e Conformidade</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nome do Servidor/Responsável</label>
              <input value={nomeServidor} onChange={e => setNomeServidor(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cargo/Matrícula</label>
              <input value={cargoMatricula} onChange={e => setCargoMatricula(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Formato do arquivo */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Formato do arquivo</label>
          <select value={tipoArquivo} onChange={e => setTipoArquivo(e.target.value)} className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
            <option value="doc">Word (.doc)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" className="border-slate-600 text-slate-300" onClick={onClose} disabled={gerando}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleGerar} disabled={gerando}>
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Gerar Documento
          </Button>
        </div>
      </div>
    </div>
  );
}