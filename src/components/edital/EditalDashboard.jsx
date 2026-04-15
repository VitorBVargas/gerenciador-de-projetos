import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EditalTable from '@/components/edital/EditalTable';

export default function EditalDashboard() {
  const items = [];

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Pendência Edital</h1>
        <p className="text-sm text-slate-400 mt-1">Acompanhe as pendências relacionadas aos editais.</p>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Visão geral</CardTitle>
        </CardHeader>
        <CardContent>
          <EditalTable items={items} />
        </CardContent>
      </Card>
    </div>
  );
}