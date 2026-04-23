import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function Documents() {
  return (
    <div className="p-6 lg:p-8">
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Página de documentos criada com sucesso.</p>
        </CardContent>
      </Card>
    </div>
  );
}