import React from 'react';
import AIChat from '@/components/kb/AIChat';

export default function KnowledgeBase() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="text-sm text-slate-400">Área inicial para consulta e interação com IA.</p>
        </div>

        <AIChat />
      </div>
    </div>
  );
}