import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function AIChat() {
  return (
    <Card className="border-slate-800 bg-slate-900 text-white shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          AI Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
          Estrutura inicial do chat criada com sucesso.
        </div>
      </CardContent>
    </Card>
  );
}