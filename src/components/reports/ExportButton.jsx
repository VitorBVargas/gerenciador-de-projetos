import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ExportButton({ onClick, children = 'Exportar' }) {
  return (
    <Button onClick={onClick} variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">
      <Download className="w-4 h-4 mr-2" />
      {children}
    </Button>
  );
}