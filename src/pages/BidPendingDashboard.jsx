import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, ArrowLeft, List, FolderOpen } from 'lucide-react';
import BidPendingStatsCards from '@/components/bid-pending/BidPendingStatsCards';
import BidPendingImportModal from '@/components/bid-pending/BidPendingImportModal';

const portfolioLabels = {
  grandes_contas_sc_mg: 'Grandes Contas SC/MG',
  grandes_contas_sc_sp: 'Grandes Contas SC/SP',
  medias_contas: 'Médias Contas',
};

const enrichItems = (items) => {
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 7);

  return items.map((item) => {
    const due = item.due_date ? new Date(`${item.due_date}T00:00:00`) : null;
    const normalizedStatus = String(item.status || '').toLowerCase();
    const isCompleted = normalizedStatus.includes('conclu');
    const isOverdue = Boolean(due && due < today && !isCompleted);
    const isUpcoming = Boolean(due && due >= today && due <= soon && !isCompleted);
    return { ...item, isCompleted, isOverdue, isUpcoming };
  });
};

export default function BidPendingDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const portfolio = urlParams.get('portfolio') || 'grandes_contas_sc_mg';
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ['bid-pending-items', portfolio],
    queryFn: () => base44.entities.BidPendingItem.filter({ portfolio }, '-updated_date', 10000),
  });

  const items = useMemo(() => enrichItems(rawItems), [rawItems]);

  const stats = useMemo(() => ({
    total: items.length,
    overdue: items.filter((item) => item.isOverdue).length,
    upcoming: items.filter((item) => item.isUpcoming).length,
    completed: items.filter((item) => item.isCompleted).length,
  }), [items]);

  const statusChart = useMemo(() => Object.entries(items.reduce((acc, item) => {
    const key = item.status || 'Sem status';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([name, total]) => ({ name, total })), [items]);

  const verticalChart = useMemo(() => Object.entries(items.reduce((acc, item) => {
    const key = item.vertical || 'Sem vertical';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([name, total]) => ({ name, total })), [items]);

  const projectChart = useMemo(() => Object.entries(items.reduce((acc, item) => {
    acc[item.project_name] = (acc[item.project_name] || 0) + 1;
    return acc;
  }, {})).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total), [items]);

  const topProjects = projectChart.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center flex-shrink-0"><span className="text-white font-bold text-xl">B</span></div>
            <div><p className="text-white font-semibold text-sm">Pendência</p><p className="text-slate-500 text-xs">Edital</p></div>
          </Link>
          <Link to={createPageUrl('BidPendingPortfolio')}>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Pendência Edital — {portfolioLabels[portfolio]}</h1>
            <p className="text-slate-400 mt-1">Visão executiva consolidada dos itens de edital</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to={createPageUrl(`BidPendingList?portfolio=${portfolio}`)}>
              <Button className="bg-slate-700 hover:bg-slate-600"><List className="w-4 h-4 mr-2" />Lista Geral</Button>
            </Link>
            <Button onClick={() => setImportOpen(true)} className="bg-cyan-600 hover:bg-cyan-700"><Upload className="w-4 h-4 mr-2" />Importar Planilha</Button>
          </div>
        </div>

        <BidPendingStatsCards stats={stats} />

        <Tabs defaultValue="graficos" className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="graficos" className="data-[state=active]:bg-slate-700">Gráficos</TabsTrigger>
            <TabsTrigger value="alertas" className="data-[state=active]:bg-slate-700">Alertas</TabsTrigger>
            <TabsTrigger value="projetos" className="data-[state=active]:bg-slate-700">Projetos</TabsTrigger>
          </TabsList>

          <TabsContent value="graficos" className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            {[{ title: 'Por Status', data: statusChart }, { title: 'Por Vertical', data: verticalChart }, { title: 'Por Projeto', data: topProjects }].map((chart) => (
              <Card key={chart.title} className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white">{chart.title}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" hide />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                      <Bar dataKey="total" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="alertas" className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-red-300">Itens atrasados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.filter((item) => item.isOverdue).slice(0, 12).map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-white font-medium">{item.project_name} • Item {item.bid_item_number}</p>
                    <p className="text-sm text-slate-300">{item.bid_item_description || 'Sem descrição'}</p>
                  </div>
                ))}
                {items.filter((item) => item.isOverdue).length === 0 && <p className="text-slate-400">Nenhum item atrasado.</p>}
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-yellow-300">Próximos do prazo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.filter((item) => item.isUpcoming).slice(0, 12).map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-white font-medium">{item.project_name} • Item {item.bid_item_number}</p>
                    <p className="text-sm text-slate-300">{item.bid_item_description || 'Sem descrição'}</p>
                  </div>
                ))}
                {items.filter((item) => item.isUpcoming).length === 0 && <p className="text-slate-400">Nenhum item próximo do prazo.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projetos" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projectChart.map((project) => (
                <Card key={project.name} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">{project.name}</p>
                      <p className="text-sm text-slate-400">{project.total} item(ns)</p>
                    </div>
                    <Link to={createPageUrl(`BidPendingProject?portfolio=${portfolio}&project=${encodeURIComponent(project.name)}`)}>
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"><FolderOpen className="w-4 h-4 mr-2" />Abrir</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BidPendingImportModal open={importOpen} onOpenChange={setImportOpen} portfolio={portfolio} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['bid-pending-items', portfolio] })} />
    </div>
  );
}