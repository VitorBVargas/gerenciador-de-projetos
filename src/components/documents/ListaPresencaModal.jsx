import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { gerarListaPresencaDocx, gerarListaPresencaPdf } from './listaPresencaGenerator';

export default function ListaPresencaModal({ products = [], projectName = '', onClose }) {
  const [productIds, setProductIds] = useState([]);
  const [entidadesSel, setEntidadesSel] = useState([]);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [formato, setFormato] = useState('presencial');
  const [instrutor, setInstrutor] = useState('');
  const [local, setLocal] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [qtdPessoas, setQtdPessoas] = useState(10);
  const [tipoArquivo, setTipoArquivo] = useState('doc');
  const [gerando, setGerando] = useState(false);

  // Produtos únicos por nome
  const uniqueProducts = useMemo(() => {
    const seen = new Set();
    return products.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [products]);

  const selectedProducts = useMemo(
    () => uniqueProducts.filter(p => productIds.includes(p.id)),
    [uniqueProducts, productIds]
  );

  const toggleProduct = (id) => {
    setProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleEntidade = (ent) => {
    setEntidadesSel(prev => prev.includes(ent) ? prev.filter(x => x !== ent) : [...prev, ent]);
  };

  // Entidades disponíveis no projeto
  const entidades = useMemo(
    () => [...new Set(products.map(p => p.entity).filter(Boolean))].sort(),
    [products]
  );

  const handleGerar = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione ao menos um produto.');
      return;
    }
    const qtd = Math.max(1, Math.min(200, Number(qtdPessoas) || 1));
    setGerando(true);
    try {
      const gerar = tipoArquivo === 'pdf' ? gerarListaPresencaPdf : gerarListaPresencaDocx;
      const primeiro = selectedProducts[0];
      const produtoNome = selectedProducts.map(p => p.name).join(', ');
      const chamado = selectedProducts.map(p => p.ticket_number).filter(Boolean).join(', ');
      const entsFinal = entidadesSel.length > 0 ? entidadesSel : (primeiro.entity ? [primeiro.entity] : []);
      const entidade = entsFinal.join(', ');
      const entidadeCompleta = entsFinal
        .map(ent => products.find(p => p.entity === ent)?.entity_full_name || ent)
        .join(', ');
      await gerar({
        projectName,
        produtoNome,
        chamado,
        entidade,
        entidadeCompleta,
        instrutor,
        data,
        hora,
        local,
        formato,
        cargaHoraria,
        conteudo,
        qtdLinhas: qtd,
      });
      toast.success('Lista de Presença gerada!');
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
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Lista de Presença de Treinamento
            </h3>
            <p className="text-xs text-slate-400 mt-1">Preencha os dados para gerar o documento.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {/* Produtos (multiseleção) */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Produtos * <span className="text-slate-500">(selecione um ou mais)</span></label>
            <div className="max-h-40 overflow-y-auto rounded-md bg-slate-900 border border-slate-600 divide-y divide-slate-700/60">
              {uniqueProducts.map(p => {
                const checked = productIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(p.id)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm text-slate-200 flex-1">{p.name}</span>
                    {p.ticket_number && <span className="text-[11px] text-slate-500">#{p.ticket_number}</span>}
                  </label>
                );
              })}
            </div>
            {selectedProducts.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">{selectedProducts.length} produto(s) selecionado(s).</p>
            )}
          </div>

          {/* Entidades (multiseleção) */}
          {entidades.length > 1 && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Entidades <span className="text-slate-500">(uma ou mais)</span></label>
              <div className="max-h-32 overflow-y-auto rounded-md bg-slate-900 border border-slate-600 divide-y divide-slate-700/60">
                {entidades.map(ent => (
                  <label key={ent} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-800/60">
                    <input
                      type="checkbox"
                      checked={entidadesSel.includes(ent)}
                      onChange={() => toggleEntidade(ent)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm text-slate-200">{ent}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Instrutor */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Instrutor Betha Sistemas</label>
            <input
              type="text"
              value={instrutor}
              onChange={e => setInstrutor(e.target.value)}
              placeholder="Nome do instrutor"
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Formato + Carga horária */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Formato</label>
              <select
                value={formato}
                onChange={e => setFormato(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              >
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Carga Horária</label>
              <input
                type="text"
                value={cargaHoraria}
                onChange={e => setCargaHoraria(e.target.value)}
                placeholder="Ex: 4 horas"
                className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Local</label>
            <input
              type="text"
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Ex: Sala de treinamento da Prefeitura"
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Conteúdo do treinamento</label>
            <textarea
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              placeholder="Descreva o conteúdo ministrado..."
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm resize-none"
            />
          </div>

          {/* Formato do arquivo */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Formato do arquivo</label>
            <select
              value={tipoArquivo}
              onChange={e => setTipoArquivo(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
            >
              <option value="doc">Word (.doc)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>

          {/* Qtd pessoas */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Quantidade aproximada de pessoas</label>
            <input
              type="number"
              min={1}
              max={200}
              value={qtdPessoas}
              onChange={e => setQtdPessoas(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">Serão criadas {Math.max(1, Number(qtdPessoas) || 1)} linhas para nome e assinatura.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" className="border-slate-600 text-slate-300" onClick={onClose} disabled={gerando}>
            Cancelar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleGerar} disabled={gerando || productIds.length === 0}>
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Gerar Documento
          </Button>
        </div>
      </div>
    </div>
  );
}