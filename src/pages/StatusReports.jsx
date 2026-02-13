import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Sparkles, FileText, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import EmptyState from '../components/ui/EmptyState';

export default function StatusReports() {
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
    enabled: !!projectId
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['statusReports', projectId],
    queryFn: () => base44.entities.StatusReport.filter({ project_id: projectId }, '-report_date'),
    enabled: !!projectId
  });

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'ia_projetos_betha',
        metadata: { project_id: projectId, type: 'weekly_report' }
      });

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Gere um Status Report semanal do projeto ID ${projectId} referente à semana de ${format(weekStart, 'dd/MM/yyyy')} a ${format(weekEnd, 'dd/MM/yyyy')}.

Estruture o relatório com:

**RESUMO EXECUTIVO**
- Status geral do projeto (use emoji: 🟢 🟡 🔴)
- Progresso geral da semana

**O QUE AVANÇOU ESTA SEMANA**
- Liste etapas do cronograma concluídas ou iniciadas
- Tarefas de migração/homologação completadas
- Marcos atingidos
- Produtos que mudaram de status

**PONTOS DE ATENÇÃO** (priorize por urgência)
1. Prazos críticos próximos (próximos 7 dias)
2. Etapas atrasadas
3. Riscos não mitigados (especialmente >30 dias)
4. Tarefas travadas há muito tempo
5. Orçamento vs despesas

**PRÓXIMAS AÇÕES**
- O que deve ser feito na próxima semana
- Decisões necessárias
- Bloqueadores a resolver

**ATUALIZAÇÕES DE RISCOS**
- Novos riscos identificados
- Riscos que evoluíram ou foram mitigados

Seja específico, objetivo e acionável. Use formato Markdown.`
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedConv = await base44.agents.getConversation(conv.id);
      const aiMessage = updatedConv.messages[updatedConv.messages.length - 1];

      if (aiMessage?.role === 'assistant') {
        const sections = parseReportSections(aiMessage.content);
        
        await base44.entities.StatusReport.create({
          project_id: projectId,
          report_date: today.toISOString().split('T')[0],
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          summary: sections.summary || aiMessage.content,
          progress_updates: sections.progress || '',
          completed_tasks: sections.completed || '',
          attention_points: sections.attention || '',
          next_actions: sections.actions || '',
          risks_updates: sections.risks || '',
          status: 'published'
        });

        queryClient.invalidateQueries({ queryKey: ['statusReports', projectId] });
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const parseReportSections = (content) => {
    const sections = {
      summary: '',
      progress: '',
      completed: '',
      attention: '',
      actions: '',
      risks: ''
    };

    const lines = content.split('\n');
    let currentSection = 'summary';

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('o que avançou') || lower.includes('avançou esta semana')) {
        currentSection = 'progress';
      } else if (lower.includes('pontos de atenção') || lower.includes('atenção')) {
        currentSection = 'attention';
      } else if (lower.includes('próximas ações') || lower.includes('ações')) {
        currentSection = 'actions';
      } else if (lower.includes('riscos') && lower.includes('atualiz')) {
        currentSection = 'risks';
      } else {
        sections[currentSection] += line + '\n';
      }
    });

    return sections;
  };

  const downloadPDF = async (report) => {
    setDownloadingId(report.id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Status Report Semanal', margin, y);
      y += 10;

      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(project?.name || 'Projeto', margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.text(`Semana: ${format(new Date(report.week_start), 'dd/MM/yyyy')} a ${format(new Date(report.week_end), 'dd/MM/yyyy')}`, margin, y);
      y += 10;

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Content
      const addSection = (title, content) => {
        if (!content || content.trim() === '') return;

        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const lines = doc.splitTextToSize(content.replace(/[#*]/g, '').trim(), maxWidth);
        lines.forEach(line => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 6;
        });
        y += 5;
      };

      addSection('Resumo Executivo', report.summary);
      addSection('O que Avançou', report.progress_updates);
      addSection('Pontos de Atenção', report.attention_points);
      addSection('Próximas Ações', report.next_actions);
      addSection('Atualizações de Riscos', report.risks_updates);

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`Status_Report_${format(new Date(report.report_date), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!projectId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="Nenhum projeto selecionado"
          description="Selecione um projeto para visualizar os relatórios"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Status Reports</h1>
          <p className="text-slate-400 mt-1">Relatórios semanais gerados pela IA</p>
        </div>
        <Button
          onClick={generateReport}
          disabled={generatingReport}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generatingReport ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Novo Report
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="bg-slate-800 border-slate-600">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Semana de {format(new Date(report.week_start), 'dd/MM', { locale: ptBR })} a {format(new Date(report.week_end), 'dd/MM/yyyy', { locale: ptBR })}
                    </CardTitle>
                    <p className="text-sm text-slate-400">
                      Gerado em {format(new Date(report.report_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => downloadPDF(report)}
                    disabled={downloadingId === report.id}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    {downloadingId === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Resumo Executivo</h3>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap bg-slate-900/50 p-3 rounded">
                      {report.summary}
                    </div>
                  </div>
                )}
                
                {report.attention_points && (
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-2">⚠️ Pontos de Atenção</h3>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap bg-slate-900/50 p-3 rounded">
                      {report.attention_points}
                    </div>
                  </div>
                )}

                {report.next_actions && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400 mb-2">📋 Próximas Ações</h3>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap bg-slate-900/50 p-3 rounded">
                      {report.next_actions}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhum relatório gerado"
          description="Clique em 'Gerar Novo Report' para criar o primeiro relatório semanal"
          action={
            <Button onClick={generateReport} disabled={generatingReport}>
              <Plus className="w-4 h-4 mr-2" />
              Gerar Primeiro Report
            </Button>
          }
        />
      )}
    </div>
  );
}