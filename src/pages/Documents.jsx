import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileText, Upload, Download, Check, X, CheckCircle2,
  Clock, AlertCircle, ChevronRight, Loader2, Package
} from 'lucide-react';
import { toast } from 'sonner';
import KickoffDeck from '@/components/kickoff/KickoffDeck';
import ListaPresencaModal from '@/components/documents/ListaPresencaModal';

const DOCUMENTS = [
  { key: 'tap', label: 'TAP', byProduct: false, description: 'Termo de Abertura do Projeto' },
  { key: 'kickoff', label: 'Kickoff', byProduct: false, description: 'Documento de Kickoff' },
  { key: 'diagnostico', label: 'Diagnóstico', byProduct: true, description: 'Diagnóstico por produto' },
  { key: 'mapa_relatorios', label: 'Mapa de Relatórios', byProduct: false, description: 'Mapa de relatórios do projeto' },
  { key: 'acordos_conversao', label: 'Acordos de Conversão', byProduct: false, description: 'Acordos de conversão de dados' },
  { key: 'aceite_homologacao', label: 'Aceite de Homologação', byProduct: false, description: 'Aceite de homologação' },
  { key: 'tac', label: 'TAC', byProduct: false, description: 'Termo de Aceite de Contrato' },
  { key: 'treinamentos_prova', label: 'Treinamentos/Prova', byProduct: true, description: 'Documentos de treinamento por produto' },
  { key: 'aceite_implantacao', label: 'Aceite de Implantação', byProduct: false, description: 'Aceite de implantação final' },
];

export default function Documents() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const [activeTab, setActiveTab] = useState('padrao');
  const [collapsedDocs, setCollapsedDocs] = useState({});
  const [filterVertical, setFilterVertical] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [productModal, setProductModal] = useState(null);
  const [templateProductModal, setTemplateProductModal] = useState(null);
  const [controlModal, setControlModal] = useState(null);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [expandedVerticals, setExpandedVerticals] = useState({});
  const [uploadingTemplate, setUploadingTemplate] = useState(null);
  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [listaPresencaOpen, setListaPresencaOpen] = useState(false);
  const fileInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => base44.entities.Product.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Global templates — shared across all projects
  const { data: globalTemplates = [] } = useQuery({
    queryKey: ['globalTemplates'],
    queryFn: () => base44.entities.GlobalDocumentTemplate.list(),
  });

  // Mapa para templates globais SEM produto (chave = document_type)
  const globalTemplateMap = useMemo(() => {
    const map = {};
    globalTemplates.forEach(t => {
      if (!t.product_name) map[t.document_type] = t;
    });
    return map;
  }, [globalTemplates]);

  // Mapa para templates globais POR produto (chave = document_type + nome do produto)
  const globalProductTemplateMap = useMemo(() => {
    const map = {};
    globalTemplates.forEach(t => {
      if (t.product_name) map[`${t.document_type}__${t.product_name}`] = t;
    });
    return map;
  }, [globalTemplates]);

  const getGlobalProductTemplate = (docType, productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return null;
    return globalProductTemplateMap[`${docType}__${product.name}`] || null;
  };

  const upsertTemplateMutation = useMutation({
    mutationFn: async ({ docType, file_url, productId = null }) => {
      if (productId) {
        // Template POR PRODUTO agora também é global (compartilhado entre projetos pelo nome do produto)
        const product = products.find(p => p.id === productId);
        if (!product) throw new Error('Produto não encontrado');
        const existing = globalProductTemplateMap[`${docType}__${product.name}`];
        if (existing) return base44.entities.GlobalDocumentTemplate.update(existing.id, { template_url: file_url });
        return base44.entities.GlobalDocumentTemplate.create({
          document_type: docType,
          product_name: product.name,
          template_url: file_url,
        });
      } else {
        // Template global do tipo de documento
        const existing = globalTemplateMap[docType];
        if (existing) return base44.entities.GlobalDocumentTemplate.update(existing.id, { template_url: file_url });
        return base44.entities.GlobalDocumentTemplate.create({ document_type: docType, template_url: file_url });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['documentControls', projectId] });
    },
  });

  const { data: docControls = [], isLoading } = useQuery({
    queryKey: ['documentControls', projectId],
    queryFn: () => base44.entities.ProjectDocumentControl.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const verticals = useMemo(() => [...new Set(products.map(p => p.vertical).filter(Boolean))].sort(), [products]);
  const entities = useMemo(() => [...new Set(products.map(p => p.entity).filter(Boolean))].sort(), [products]);

  const filteredProducts = useMemo(() =>
    selectedVertical ? products.filter(p => p.vertical === selectedVertical) : products,
    [products, selectedVertical]
  );

  // Deduplicate products by name (one per product name)
  const uniqueProductsByName = useMemo(() => {
    const seen = new Set();
    return filteredProducts.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [filteredProducts]);

  const controlProductsByVertical = useMemo(() => {
    const groups = {};
    let result = products;
    if (filterVertical) result = result.filter(p => p.vertical === filterVertical);
    if (filterEntity) result = result.filter(p => p.entity === filterEntity);
    result.forEach(p => {
      const v = p.vertical || 'sem_vertical';
      if (!groups[v]) groups[v] = [];
      groups[v].push(p);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [products, filterVertical, filterEntity]);

  const filteredControlProducts = useMemo(() => {
    let result = products;
    if (filterVertical) result = result.filter(p => p.vertical === filterVertical);
    if (filterEntity) result = result.filter(p => p.entity === filterEntity);
    return result;
  }, [products, filterVertical, filterEntity]);

  const controlMap = useMemo(() => {
    const map = {};
    docControls.forEach(d => {
      const key = d.product_id ? `${d.document_type}_${d.product_id}` : d.document_type;
      map[key] = d;
    });
    return map;
  }, [docControls]);

  const getControl = (docKey, productId = null) =>
    controlMap[productId ? `${docKey}_${productId}` : docKey] || null;

  const upsertMutation = useMutation({
    mutationFn: async ({ docType, productId, data }) => {
      const existing = getControl(docType, productId);
      if (existing) {
        return base44.entities.ProjectDocumentControl.update(existing.id, data);
      } else {
        return base44.entities.ProjectDocumentControl.create({
          project_id: projectId,
          document_type: docType,
          ...(productId ? { product_id: productId } : {}),
          ...data,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentControls', projectId] }),
  });

  const handleToggleSent = async (docType, productId = null) => {
    const ctrl = getControl(docType, productId);
    const newSent = !(ctrl?.sent);
    await upsertMutation.mutateAsync({
      docType, productId,
      data: { sent: newSent, sent_date: newSent ? new Date().toISOString().split('T')[0] : null },
    });
  };

  const [bulkLoadingVertical, setBulkLoadingVertical] = useState(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const handleBulkMarkForVertical = async (vertical, verticalProducts, mode /* 'sent' | 'signed' */) => {
    setBulkLoadingVertical(`${vertical}__${mode}`);
    const today = new Date().toISOString().split('T')[0];

    // Monta a fila apenas com o que ainda não está marcado
    const queue = [];
    verticalProducts.forEach(product => {
      DOCUMENTS.forEach(doc => {
        const ctrl = getControl(doc.key, product.id);
        if (mode === 'sent' && ctrl?.sent) return;
        if (mode === 'signed' && ctrl?.signed) return;
        queue.push({ doc, product, ctrl });
      });
    });

    if (queue.length === 0) {
      toast.info(mode === 'sent' ? 'Todos já estavam enviados.' : 'Todos já estavam assinados.');
      setBulkLoadingVertical(null);
      return;
    }

    setBulkProgress({ current: 0, total: queue.length });

    // Processa sequencialmente (com retry) para não estourar rate limit
    for (let i = 0; i < queue.length; i++) {
      const { doc, product, ctrl } = queue[i];
      const payload = mode === 'sent'
        ? { sent: true, sent_date: today }
        : { signed: true };
      const exec = () => ctrl
        ? base44.entities.ProjectDocumentControl.update(ctrl.id, payload)
        : base44.entities.ProjectDocumentControl.create({
            project_id: projectId,
            document_type: doc.key,
            product_id: product.id,
            ...payload,
          });
      try {
        await exec();
      } catch (e) {
        await new Promise(r => setTimeout(r, 600));
        await exec().catch(() => {});
      }
      setBulkProgress({ current: i + 1, total: queue.length });
    }

    toast.success(`${queue.length} documento(s) marcados como ${mode === 'sent' ? 'enviados' : 'assinados'}.`);
    queryClient.invalidateQueries({ queryKey: ['documentControls', projectId] });
    setBulkLoadingVertical(null);
    setBulkProgress({ current: 0, total: 0 });
  };

  const handleToggleSigned = async (docType, productId = null) => {
    const ctrl = getControl(docType, productId);
    const newSigned = !(ctrl?.signed);
    await upsertMutation.mutateAsync({ docType, productId, data: { signed: newSigned } });
  };

  const handleDateChange = async (docType, productId, date) => {
    await upsertMutation.mutateAsync({ docType, productId, data: { sent_date: date } });
  };

  const handleUploadSigned = async (file, docType, productId = null) => {
    setUploadingDoc(`${docType}_${productId || ''}`);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await upsertMutation.mutateAsync({ docType, productId, data: { signed_file_url: file_url, signed: true } });
      toast.success('Documento enviado!');
    } catch (e) {
      toast.error('Erro ao enviar: ' + e.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleUploadTemplate = async (file, docKey, productId = null) => {
    const uploadKey = productId ? `${docKey}_${productId}` : docKey;
    setUploadingTemplate(uploadKey);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await upsertTemplateMutation.mutateAsync({ docType: docKey, file_url, productId });
      const msg = productId ? 'Template do produto salvo!' : 'Template global salvo!';
      toast.success(msg);
    } catch (e) {
      toast.error('Erro ao enviar template: ' + e.message);
    } finally {
      setUploadingTemplate(null);
    }
  };

  const progress = useMemo(() => {
    const total = DOCUMENTS.length;
    const signed = DOCUMENTS.filter(d => {
      if (d.byProduct) return products.some(p => getControl(d.key, p.id)?.signed);
      return getControl(d.key)?.signed;
    }).length;
    return { signed, total, pct: Math.round((signed / total) * 100) };
  }, [docControls, products]);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Selecione um projeto para ver os documentos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos</h1>
          <p className="text-sm text-slate-400 mt-1">Hub central de documentos do projeto</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Documentos assinados</p>
            <p className="text-sm font-bold text-white">{progress.signed}/{progress.total}</p>
          </div>
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-green-400">{progress.pct}%</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="padrao" className="data-[state=active]:bg-blue-600">
            <FileText className="w-4 h-4 mr-1.5" /> Documentos Padrão
          </TabsTrigger>
          <TabsTrigger value="controle" className="data-[state=active]:bg-blue-600">
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Controle de Documentos
          </TabsTrigger>
        </TabsList>

        {/* ===== DOCUMENTOS PADRÃO ===== */}
        <TabsContent value="padrao" className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Templates são <span className="text-blue-400 font-medium">globais</span> — um único upload serve para todos os projetos.
            Documentos com variação por produto permitem selecionar vertical e produto.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCUMENTS.map(doc => {
              const globalTpl = globalTemplateMap[doc.key];
              const productsWithTemplate = doc.byProduct ? products.filter(p => {
                return !!globalProductTemplateMap[`${doc.key}__${p.name}`]?.template_url;
              }) : [];
              const hasTemplate = !!globalTpl?.template_url || productsWithTemplate.length > 0;
              return (
                <Card key={doc.key} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-white">{doc.label}</span>
                          {doc.byProduct && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5">Por produto</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{doc.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {doc.byProduct && productsWithTemplate.length > 0 && (
                        <div className="text-xs text-slate-400 bg-slate-700/30 rounded px-2 py-1.5 border border-slate-600/50 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-slate-300">
                            <span className="font-semibold text-white">{productsWithTemplate.length}</span> {productsWithTemplate.length === 1 ? 'template carregado' : 'templates carregados'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasTemplate ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 gap-1.5 text-xs h-7"
                              onClick={() => {
                                if (doc.byProduct) setProductModal(doc);
                                else window.open(globalTpl.template_url, '_blank');
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {doc.byProduct ? 'Selecionar e Gerar' : 'Baixar'}
                            </Button>
                            {doc.key === 'kickoff' && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs h-7"
                                onClick={() => setKickoffOpen(true)}
                              >
                                <FileText className="w-3.5 h-3.5" /> Gerar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-400 hover:text-white text-xs h-7 gap-1.5"
                              onClick={() => {
                                if (doc.byProduct) setTemplateProductModal(doc);
                                else { templateInputRef.current._docKey = doc.key; templateInputRef.current.click(); }
                              }}
                            >
                              <Upload className="w-3.5 h-3.5" /> {doc.byProduct ? 'Adicionar mais' : 'Atualizar'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 text-xs h-7 gap-1.5"
                            onClick={() => {
                              if (doc.byProduct) setTemplateProductModal(doc);
                              else { templateInputRef.current._docKey = doc.key; templateInputRef.current.click(); }
                            }}
                          >
                            {uploadingTemplate === doc.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            Upload de template
                          </Button>
                        )}
                        {doc.key === 'kickoff' && !hasTemplate && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs h-7"
                            onClick={() => setKickoffOpen(true)}
                          >
                            <FileText className="w-3.5 h-3.5" /> Gerar
                          </Button>
                        )}
                        {doc.key === 'treinamentos_prova' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs h-7"
                            onClick={() => setListaPresencaOpen(true)}
                          >
                            <FileText className="w-3.5 h-3.5" /> Gerar Lista de Presença
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <input
            ref={templateInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const file = e.target.files[0];
              const key = templateInputRef.current._docKey;
              const productId = templateInputRef.current._productId;
              if (file && key) handleUploadTemplate(file, key, productId);
              e.target.value = '';
              templateInputRef.current._productId = null;
            }}
          />
        </TabsContent>

        {/* ===== CONTROLE DE DOCUMENTOS ===== */}
        <TabsContent value="controle" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 whitespace-nowrap">Vertical:</label>
              <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)}
                className="h-8 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs">
                <option value="">Todas</option>
                {verticals.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 whitespace-nowrap">Entidade:</label>
              <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                className="h-8 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs">
                <option value="">Todas</option>
                {entities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            {(filterVertical || filterEntity) && (
              <button onClick={() => { setFilterVertical(''); setFilterEntity(''); }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                ✕ Limpar filtros
              </button>
            )}
            <span className="text-xs text-slate-500 ml-auto">{Object.values(controlProductsByVertical).flat().length} produto(s)</span>
            </div>

            {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
          ) : filteredControlProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm">Nenhum produto encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Produto</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Entidade</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Vertical</th>
                    {DOCUMENTS.map(doc => (
                      <th key={doc.key} className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[90px]">
                        <span className="block leading-tight">{doc.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {Object.entries(controlProductsByVertical).map(([vertical, verticalProducts]) => {
                    const isExpanded = expandedVerticals[vertical];
                    const totalDocs = verticalProducts.length * DOCUMENTS.length;
                    const sentDocs = verticalProducts.reduce((sum, product) => {
                      return sum + DOCUMENTS.filter(doc => {
                        const ctrl = getControl(doc.key, product.id);
                        return ctrl?.sent;
                      }).length;
                    }, 0);
                    const allSent = sentDocs === totalDocs && totalDocs > 0;
                    return (
                      <React.Fragment key={vertical}>
                        <tr className={`border-t-2 border-slate-600 hover:bg-slate-700/60 cursor-pointer transition-colors ${
                          allSent ? 'bg-green-900/20' : 'bg-slate-700/40'
                        }`}
                          onClick={() => setExpandedVerticals(prev => ({ ...prev, [vertical]: !prev[vertical] }))}
                        >
                          <td colSpan={3} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <span className={`text-sm font-semibold capitalize ${
                                allSent ? 'text-green-400' : 'text-white'
                              }`}>{vertical}</span>
                              <span className={`text-xs ml-2 ${
                                allSent ? 'text-green-400 font-semibold' : 'text-slate-500'
                              }`}>({verticalProducts.length})</span>
                              {(() => {
                                const sentKey = `${vertical}__sent`;
                                const signedKey = `${vertical}__signed`;
                                const isBusySent = bulkLoadingVertical === sentKey;
                                const isBusySigned = bulkLoadingVertical === signedKey;
                                return (
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Marcar todos como Enviados em "${vertical}"?`)) {
                                          handleBulkMarkForVertical(vertical, verticalProducts, 'sent');
                                        }
                                      }}
                                      disabled={!!bulkLoadingVertical}
                                      className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                                      title="Marcar todos como Enviados"
                                    >
                                      {isBusySent ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                                      {isBusySent ? `${bulkProgress.current}/${bulkProgress.total}` : 'Enviado'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Marcar todos como Assinados em "${vertical}"?`)) {
                                          handleBulkMarkForVertical(vertical, verticalProducts, 'signed');
                                        }
                                      }}
                                      disabled={!!bulkLoadingVertical}
                                      className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-green-500/40 text-green-300 hover:bg-green-500/10 disabled:opacity-50"
                                      title="Marcar todos como Assinados"
                                    >
                                      {isBusySigned ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                                      {isBusySigned ? `${bulkProgress.current}/${bulkProgress.total}` : 'Assinado'}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          {DOCUMENTS.map(doc => {
                            const docSent = verticalProducts.filter(product => getControl(doc.key, product.id)?.sent).length;
                            const docTotal = verticalProducts.length;
                            const docAllSent = docSent === docTotal && docTotal > 0;
                            return (
                              <td key={doc.key} className={`px-2 py-2.5 text-center text-xs font-medium ${
                                docAllSent ? 'text-green-400' : 'text-slate-400'
                              }`}>
                                {docSent}/{docTotal}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && verticalProducts.map(product => (
                          <tr key={product.id} className="hover:bg-slate-800/60 transition-colors">
                            <td className="px-3 py-2.5">
                              <p className="text-white font-medium text-xs leading-tight truncate max-w-[140px]">{product.name}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-slate-400">{product.entity || '—'}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-slate-400">{product.vertical || '—'}</span>
                            </td>
                            {DOCUMENTS.map(doc => {
                              const ctrl = getControl(doc.key, product.id);
                              const isSent = ctrl?.sent || false;
                              const isSigned = ctrl?.signed || false;
                              const uploadKey = `${doc.key}_${product.id}`;
                              return (
                                <td key={doc.key} className="px-2 py-2.5">
                                  <DocCell
                                    isSent={isSent}
                                    isSigned={isSigned}
                                    sentDate={ctrl?.sent_date}
                                    signedFileUrl={ctrl?.signed_file_url}
                                    isUploading={uploadingDoc === uploadKey}
                                    onToggleSent={() => handleToggleSent(doc.key, product.id)}
                                    onToggleSigned={() => handleToggleSigned(doc.key, product.id)}
                                    onDateChange={(d) => handleDateChange(doc.key, product.id, d)}
                                    onUpload={(file) => handleUploadSigned(file, doc.key, product.id)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template product selection modal */}
      {templateProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTemplateProductModal(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Upload template: {templateProductModal.label}</h3>
              <button onClick={() => setTemplateProductModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Vertical</label>
                <select value={selectedVertical} onChange={e => { setSelectedVertical(e.target.value); setSelectedProduct(''); }}
                  className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
                  <option value="">Todas</option>
                  {verticals.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Produto</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
                  <option value="">Selecionar produto</option>
                  {uniqueProductsByName.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <Button
              disabled={!selectedProduct}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => {
                if (selectedProduct) {
                  templateInputRef.current._docKey = templateProductModal.key;
                  templateInputRef.current._productId = selectedProduct;
                  templateInputRef.current.click();
                  setTemplateProductModal(null);
                }
              }}
            >
              <Upload className="w-4 h-4" /> Selecionar arquivo
            </Button>
          </div>
        </div>
      )}

      {/* Product selection modal */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setProductModal(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Gerar: {productModal.label}</h3>
              <button onClick={() => setProductModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Vertical</label>
                <select value={selectedVertical} onChange={e => { setSelectedVertical(e.target.value); setSelectedProduct(''); }}
                  className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
                  <option value="">Todas</option>
                  {verticals.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Produto</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
                  <option value="">Selecionar produto</option>
                  {uniqueProductsByName.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <Button
              disabled={!selectedProduct}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => {
                const productTpl = getGlobalProductTemplate(productModal.key, selectedProduct);
                const tpl = productTpl?.template_url ? productTpl : globalTemplateMap[productModal.key];
                if (tpl?.template_url) window.open(tpl.template_url, '_blank');
                else toast.info('Template ainda não foi carregado para este documento.');
                setProductModal(null);
              }}
            >
              <Download className="w-4 h-4" /> Gerar Documento
            </Button>
          </div>
        </div>
      )}

      {/* Control modal — step through products of a vertical */}
      {controlModal && (() => {
        const { doc, vertical, products: vProducts, index } = controlModal;
        const product = vProducts[index];
        const ctrl = getControl(doc.key, product.id);
        const uploadKey = `${doc.key}_${product.id}`;
        const fileRef2 = React.createRef();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">{doc.label} · {vertical}</p>
                  <h3 className="text-white font-semibold text-base mt-0.5">{product.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{index + 1} / {vProducts.length}</span>
                  <button onClick={() => setControlModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-sm text-slate-300">Enviado</span>
                  <button onClick={() => handleToggleSent(doc.key, product.id)}
                    className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${ctrl?.sent ? 'bg-blue-600 border-blue-500' : 'bg-slate-600 border-slate-500 hover:border-blue-500'}`}>
                    {ctrl?.sent && <Check className="w-4 h-4 text-white" />}
                  </button>
                </div>
                {ctrl?.sent && (
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-300">Data de envio</span>
                    <input type="date" value={ctrl?.sent_date || ''} onChange={e => handleDateChange(doc.key, product.id, e.target.value)}
                      className="text-xs bg-slate-600 border border-slate-500 text-slate-200 rounded px-2 py-1" />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-sm text-slate-300">Assinado</span>
                  <button onClick={() => handleToggleSigned(doc.key, product.id)}
                    className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${ctrl?.signed ? 'bg-green-600 border-green-500' : 'bg-slate-600 border-slate-500 hover:border-green-500'}`}>
                    {ctrl?.signed && <Check className="w-4 h-4 text-white" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-sm text-slate-300">Documento assinado</span>
                  <div className="flex items-center gap-2">
                    {ctrl?.signed_file_url && (
                      <a href={ctrl.signed_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Ver
                      </a>
                    )}
                    <button onClick={() => fileRef2.current?.click()}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-slate-600 rounded px-2 py-1">
                      {uploadingDoc === uploadKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Upload
                    </button>
                    <input ref={fileRef2} type="file" className="hidden" onChange={e => { if (e.target.files[0]) handleUploadSigned(e.target.files[0], doc.key, product.id); e.target.value = ''; }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" disabled={index === 0}
                  onClick={() => setControlModal(m => ({ ...m, index: m.index - 1 }))}>
                  ← Anterior
                </Button>
                {index < vProducts.length - 1 ? (
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setControlModal(m => ({ ...m, index: m.index + 1 }))}>
                    Próximo →
                  </Button>
                ) : (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setControlModal(null)}>
                    <Check className="w-4 h-4 mr-1" /> Concluir
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {kickoffOpen && (
        <KickoffDeck projectId={projectId} onClose={() => setKickoffOpen(false)} />
      )}

      {listaPresencaOpen && (
        <ListaPresencaModal
          products={products}
          projectName={products[0]?.entity_full_name || ''}
          onClose={() => setListaPresencaOpen(false)}
        />
      )}
    </div>
  );
}

function DocCell({ isSent, isSigned, sentDate, signedFileUrl, isUploading, onToggleSent, onToggleSigned, onDateChange, onUpload }) {
  const fileRef = useRef(null);
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className="flex items-center gap-1.5">
        {/* Enviado */}
        <button onClick={onToggleSent} title="Enviado"
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSent ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600 hover:border-blue-400'}`}>
          {isSent && <Check className="w-3 h-3 text-white" />}
        </button>
        {/* Assinado */}
        <button onClick={onToggleSigned} title="Assinado"
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSigned ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600 hover:border-green-400'}`}>
          {isSigned && <Check className="w-3 h-3 text-white" />}
        </button>
        {/* Upload / Ver arquivo */}
        {signedFileUrl ? (
          <a href={signedFileUrl} target="_blank" rel="noreferrer" title="Ver documento assinado"
            className="text-blue-400 hover:text-blue-300">
            <Download className="w-3.5 h-3.5" />
          </a>
        ) : (
          <button onClick={() => fileRef.current?.click()} title="Upload documento assinado"
            className="text-slate-500 hover:text-slate-300">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          </button>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {isSent && (
        <input type="date" value={sentDate || ''} onChange={e => onDateChange(e.target.value)}
          className="w-full text-[10px] bg-slate-700 border border-slate-600 text-slate-300 rounded px-1 py-0.5" />
      )}
    </div>
  );
}