import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Brain } from 'lucide-react';
import AIAnalysisModal from './AIAnalysisModal';

export default function AIAnalysisButton({ project }) {
  const [open, setOpen] = useState(false);

  if (!project || project.status !== 'concluido') return null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className="w-full bg-purple-600 hover:bg-purple-700 mt-2"
      >
        <Brain className="w-4 h-4 mr-2" />
        Gerar Análise IA
      </Button>
      <AIAnalysisModal project={project} open={open} onOpenChange={setOpen} />
    </>
  );
}