import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, X, ExternalLink, Tag, User, Calendar,
  BookOpen, Zap, Star, ChevronRight, ArrowLeft, Sparkles, MessageSquare
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import AIChat from '@/components/kb/AIChat';

const TIPO_LABELS = {
  tecnico: 'Tecnico',
  processo: 'Processo',
  comunicacao: 'Comunicacao',
  cronograma: 'Cronograma',
  risco: 'Risco',
  cliente: 'Cliente',
  outro: 'Outro',
};

const TIPO_COLORS = {
  tecnico:    { bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  processo:   { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  comunicacao:{ bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  cronograma: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-400' },
  risco:      { bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-300',    dot: 'bg-red-400'    },
  cliente:    { bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-300',  dot: 'bg-green-400'  },
  outro:      { bg: 'bg-slate-500/15',  border: 'border-slate-500/30',  text: 'text-slate-300',  dot: 'bg-slate-400'  },
};

function formatDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), "dd MMM yyyy", { locale: ptBR }); }
  catch { return d; }
}

function scoreResult(licao, query) {
  if (!query) return 0;
  const q = query.toLowerCase();
  let score = 0;
  if (licao.title?.toLowerCase().includes(q)) score += 10;
  if (licao.problema?.toLowerCase().includes(q)) score += 5;
  if (licao.solucao?.toLowerCase().includes(q)) score += 5;
  if (licao.tags?.some(t => t.toLowerCase().includes(q))) score += 8;
  if (licao.responsavel?.toLowerCase().includes(q)) score += 2;
  return score;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ licao, projectMap, onClose }) {
  if (!licao) return null;
  const tipo = TIPO_COLORS[licao.tipo] || TIPO_COLORS.outro;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${tipo.bg} ${tipo.border} ${tipo.text}`}>
                {TIPO_LABELS[licao.tipo] || licao.tipo}
              </span>
              {licao.data && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(licao.data)}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{licao.title}</h2>
            {projectMap[licao.project_id] && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Projeto: <span className="text-slate-300 ml-1">{projectMap[licao.project_id]}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Problema */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-semibold text-slate-200">Problema</span>
            </div>
            <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{licao.problema}</p>
            </div>
          </div>

          {/* Solucao */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-slate-200">Solucao</span>
            </div>
            <div className="bg-green-950/30 border border-green-900/30 rounded-xl p-4">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{licao.solucao}</p>
            </div>
          </div>

          {/* Links */}
          {licao.links?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-sm font-semibold text-slate-200">Links uteis</span>
              </div>
              <div className="space-y-2">
                {licao.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline bg-blue-950/20 border border-blue-900/30 rounded-lg px-3 py-2 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tags + Responsavel */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-800">
            {licao.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {licao.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-full px-2.5 py-0.5 text-xs">
                    <Tag className="w-2.5 h-2.5" />{tag}
                  </span>
                ))}
              </div>
            )}
            {licao.responsavel && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <User className="w-3 h-3" /> {licao.responsavel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function LicaoCard({ licao, onClick, highlight }) {
  const tipo = TIPO_COLORS[licao.tipo] || TIPO_COLORS.outro;
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-0.5 ${
        highlight
          ? 'border-blue-500/40 bg-blue-950/20'
          : 'border-slate-700/60 bg-slate-800/60'
      } hover:border-slate-500`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${tipo.bg} ${tipo.border} ${tipo.text}`}>
            {TIPO_LABELS[licao.tipo] || licao.tipo}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5" />
        </div>
        <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-blue-300 transition-colors">
          {licao.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{licao.problema}</p>
        {licao.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {licao.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] bg-slate-700/80 text-slate-400 rounded-full px-2 py-0.5">{tag}</span>
            ))}
            {licao.tags.length > 4 && (
              <span className="text-[10px] text-slate-500">+{licao.tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KnowledgeBase() {
  const [search, setSearch]           = useState('');
  const [filterTipo, setFilterTipo]   = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterTag, setFilterTag]     = useState('');
  const [sortBy, setSortBy]           = useState('recente');
  const [selected, setSelected]       = useState(null);
  const [showChat, setShowChat]       = useState(false);

  const { data: licoes = [], isLoading } = useQuery({
    queryKey: ['licoes_kb'],
    queryFn: () => base44.entities.LicaoAprendida.list('-data', 1000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects_kb'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  const allTags = useMemo(() => {
    const set = new Set();
    licoes.forEach(l => l.tags?.forEach(t => set.add(t)));
    return [...set].sort();
  }, [licoes]);

  const projectsWithLicoes = useMemo(() => {
    const ids = [...new Set(licoes.map(l => l.project_id).filter(Boolean))];
    return ids.map(id => ({ id, name: projectMap[id] || id })).filter(p => p.name);
  }, [licoes, projectMap]);

  const results = useMemo(() => {
    let list = licoes.filter(l => {
      if (filterTipo && l.tipo !== filterTipo) return false;
      if (filterProject && l.project_id !== filterProject) return false;
      if (filterTag && !l.tags?.includes(filterTag)) return false;
      if (!search.trim()) return true;
      return scoreResult(l, search) > 0;
    });

    if (search.trim() && sortBy === 'relevante') {
      list = list
        .map(l => ({ ...l, _score: scoreResult(l, search) }))
        .sort((a, b) => b._score - a._score);
    } else {
      list = [...list].sort((a, b) => {
        if (!a.data && !b.data) return 0;
        if (!a.data) return 1;
        if (!b.data) return -1;
        return b.data.localeCompare(a.data);
      });
    }
    return list;
  }, [licoes, search, filterTipo, filterProject, filterTag, sortBy]);

  const destaques = useMemo(() =>
    licoes.filter(l => l.links?.length > 0 || l.tags?.length > 0).slice(0, 3),
  [licoes]);

  const hasFilters = search || filterTipo || filterProject || filterTag;

  const clearFilters = () => {
    setSearch('');
    setFilterTipo('');
    setFilterProject('');
    setFilterTag('');
  };

  return (
    <div className="min-h-screen bg-slate-900">

      {/* Floating AI Chat Button */}
      <button
        onClick={() => setShowChat(o => !o)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-2xl shadow-emerald-900/50 transition-all duration-300 hover:scale-105"
      >
        {showChat ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="text-sm font-semibold">{showChat ? 'Fechar IA' : 'Perguntar a IA'}</span>
      </button>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="fixed bottom-20 right-6 z-40 w-full max-w-md shadow-2xl shadow-black/50 rounded-2xl">
          <AIChat />
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pb-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao inicio
          </Link>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium mb-4">
              <Zap className="w-3.5 h-3.5" /> Base de Conhecimento
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Como podemos te{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ajudar?
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Encontre solucoes para problemas ja resolvidos pela equipe
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar problemas, solucoes, tags..."
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-slate-800/80 border border-slate-600 text-white placeholder:text-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-lg"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {Object.entries(TIPO_LABELS).map(([k, v]) => {
              const c = TIPO_COLORS[k];
              const count = licoes.filter(l => l.tipo === k).length;
              if (count === 0) return null;
              return (
                <button
                  key={k}
                  onClick={() => setFilterTipo(filterTipo === k ? '' : k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filterTipo === k
                      ? `${c.bg} ${c.border} ${c.text} shadow-md`
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {v}
                  <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Destaques */}
        {!hasFilters && destaques.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Destaques</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {destaques.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer group rounded-xl border border-yellow-500/20 bg-yellow-950/10 hover:border-yellow-500/40 hover:bg-yellow-950/20 p-4 transition-all duration-200 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-yellow-300">{TIPO_LABELS[l.tipo] || l.tipo}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-yellow-200 transition-colors leading-snug">
                    {l.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{l.problema}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filters + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {projectsWithLicoes.length > 0 && (
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-slate-500"
              >
                <option value="">Todos os projetos</option>
                {projectsWithLicoes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-slate-500"
              >
                <option value="">Todas as tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 h-8 px-2.5 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-slate-500 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            <span className="text-xs text-slate-500">
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
            {[{ k: 'recente', l: 'Mais recente' }, { k: 'relevante', l: 'Mais relevante' }].map(({ k, l }) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  sortBy === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Search className="w-14 h-14 text-slate-700" />
            <p className="text-slate-300 font-semibold text-lg">Nenhum resultado encontrado</p>
            <p className="text-slate-500 text-sm">
              Tente palavras diferentes ou{' '}
              <button onClick={clearFilters} className="text-blue-400 hover:underline">limpe os filtros</button>
            </p>
          </div>
        ) : (
          <>
            {!search && !filterTipo ? (
              Object.entries(TIPO_LABELS).map(([tipo, label]) => {
                const group = results.filter(l => l.tipo === tipo);
                if (group.length === 0) return null;
                const c = TIPO_COLORS[tipo];
                return (
                  <section key={tipo}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <h2 className="text-sm font-semibold text-slate-300">{label}</h2>
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-xs text-slate-500">{group.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.map(l => (
                        <LicaoCard key={l.id} licao={l} onClick={() => setSelected(l)} highlight={false} />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map(l => (
                  <LicaoCard key={l.id} licao={l} onClick={() => setSelected(l)} highlight={!!search} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DetailModal licao={selected} projectMap={projectMap} onClose={() => setSelected(null)} />
    </div>
  );
}