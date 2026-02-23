import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default function TimelineScaler({ zoom, onZoomChange }) {
  const zoomLevels = [
    { label: 'Dia', value: 'day', pixels: 60 },
    { label: 'Semana', value: 'week', pixels: 30 },
    { label: 'Mês', value: 'month', pixels: 8 },
    { label: 'Trimestre', value: 'quarter', pixels: 2 }
  ];

  const currentIndex = zoomLevels.findIndex(z => z.value === zoom);
  const canZoomIn = currentIndex > 0;
  const canZoomOut = currentIndex < zoomLevels.length - 1;

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded border border-slate-600">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canZoomIn}
        onClick={() => onZoomChange(zoomLevels[currentIndex - 1].value)}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <div className="text-xs text-slate-400 px-2 min-w-12 text-center">
        {zoomLevels[currentIndex].label}
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canZoomOut}
        onClick={() => onZoomChange(zoomLevels[currentIndex + 1].value)}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
    </div>
  );
}