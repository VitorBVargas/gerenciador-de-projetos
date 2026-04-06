import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function KPICard({ title, value, description }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-5">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-2">{value}</p>
        {description ? <p className="text-xs text-slate-500 mt-1">{description}</p> : null}
      </CardContent>
    </Card>
  );
}