import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function BidPendingStatsCards({ stats }) {
  const cards = [
    { label: 'Total de itens', value: stats.total, color: 'text-white' },
    { label: 'Atrasados', value: stats.overdue, color: 'text-red-400' },
    { label: 'Próximos do prazo', value: stats.upcoming, color: 'text-yellow-400' },
    { label: 'Concluídos', value: stats.completed, color: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-slate-800 border-slate-700">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}