import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import BidPendingStatsCards from '@/components/bid-pending/BidPendingStatsCards';
import BidPendingTable from '@/components/bid-pending/BidPendingTable';
import BidPendingDescriptionModal from '@/components/bid-pending/BidPendingDescriptionModal';
import { ArrowLeft } from 'lucide-react';

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
      isCompleted,
      isOverdue: Boolean(due && due < today && !isCompleted),
      isUpcoming: Boolean(due && due >= today && due <= soon && !isCompleted),
    };
  });
};

export default function BidPendingProject() {
  const urlParams = new URLSearchParams(window.location.search);
  const portfolio = urlParams.get('portfolio') || 'grandes_contas_sc_mg';
  const project = urlParams.get('project') || '';
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: rawItems = [] } = useQuery({
    queryKey: ['bid-pending-project-items', portfolio, project],
    queryFn: () => base44.entities.BidPendingItem.filter({ portfolio, project_name: project }, '-updated_date', 10000),
  });

  const items = useMemo(() => enrichItems(rawItems), [rawItems]);
  const stats = useMemo(() => ({
    total: items.length,
    overdue: items.filter((item) => item.isOverdue).length,
    upcoming: items.filter((item) => item.isUpcoming).length,
    completed: items.filter((item) => item.isCompleted).length,
  }), [items]);

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">{project}</h1>
          <p className="text-slate-400 mt-1">Acompanhamento detalhado dos itens do projeto</p>
        </div>
        <Link to={createPageUrl(`BidPendingDashboard?portfolio=${portfolio}`)}>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </Link>
      </div>

      <BidPendingStatsCards stats={stats} />
      <BidPendingTable items={items} onOpenDescription={setSelectedItem} showProject={false} />
      <BidPendingDescriptionModal open={!!selectedItem} onOpenChange={() => setSelectedItem(null)} item={selectedItem} />
    </div>
  );
}