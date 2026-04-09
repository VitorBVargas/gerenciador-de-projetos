import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import BidPendingTable from '@/components/bid-pending/BidPendingTable';
import BidPendingDescriptionModal from '@/components/bid-pending/BidPendingDescriptionModal';

const enrichItems = (items) => {
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 7);
  return items.map((item) => {
    const due = item.due_date ? new Date(`${item.due_date}T00:00:00`) : null;
    const normalizedStatus = String(item.status || '').toLowerCase();
    const isCompleted = normalizedStatus.includes('conclu');
    return {
      ...item,
      isOverdue: Boolean(due && due < today && !isCompleted),
      isUpcoming: Boolean(due && due >= today && due <= soon && !isCompleted),
    };
  });
};

export default function BidPendingList() {
  const urlParams = new URLSearchParams(window.location.search);
  const portfolio = urlParams.get('portfolio') || 'grandes_contas_sc_mg';
  const [projectFilter, setProjectFilter] = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: rawItems = [] } = useQuery({
    queryKey: ['bid-pending-items', portfolio],
    queryFn: () => base44.entities.BidPendingItem.filter({ portfolio }, '-updated_date', 10000),
  });

  const items = useMemo(() => enrichItems(rawItems), [rawItems]);
  const projects = useMemo(() => Array.from(new Set(items.map((item) => item.project_name))).sort(), [items]);
  const verticals = useMemo(() => Array.from(new Set(items.map((item) => item.vertical).filter(Boolean))).sort(), [items]);
  const statuses = useMemo(() => Array.from(new Set(items.map((item) => item.status).filter(Boolean))).sort(), [items]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const projectMatch = projectFilter === 'all' || item.project_name === projectFilter;
    const verticalMatch = verticalFilter === 'all' || item.vertical === verticalFilter;
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    return projectMatch && verticalMatch && statusMatch;
  }), [items, projectFilter, verticalFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Lista Geral de Itens</h1>
          <p className="text-slate-400 mt-1">Acompanhamento operacional das pendências de edital</p>
        </div>
        <Link to={createPageUrl(`BidPendingDashboard?portfolio=${portfolio}`)}>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </Link>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>{['all', ...projects].map((value) => <SelectItem key={value} value={value}>{value === 'all' ? 'Todos os projetos' : value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200"><SelectValue placeholder="Vertical" /></SelectTrigger>
            <SelectContent>{['all', ...verticals].map((value) => <SelectItem key={value} value={value}>{value === 'all' ? 'Todas as verticais' : value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>{['all', ...statuses].map((value) => <SelectItem key={value} value={value}>{value === 'all' ? 'Todos os status' : value}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <BidPendingTable items={filteredItems} onOpenDescription={setSelectedItem} />
      <BidPendingDescriptionModal open={!!selectedItem} onOpenChange={() => setSelectedItem(null)} item={selectedItem} />
    </div>
  );
}