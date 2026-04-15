import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusMap = {
  pendente: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  em_andamento: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  concluido: 'bg-green-500/15 text-green-300 border-green-500/30'
};

export default function StatusCell({ status = 'pendente' }) {
  const className = statusMap[status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  return (
    <Badge className={className}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}