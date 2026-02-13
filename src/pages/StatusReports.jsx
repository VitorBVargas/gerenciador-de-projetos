import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Download, Sparkles, FileText, Loader2, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import EmptyState from '../components/ui/EmptyState';

export default function StatusReports() {
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isAnalyzingWeek, setIsAnalyzingWeek] = useState(false);
  const [conversationInitialized, setConversationInitialized] = useState(false);

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

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'ia_projetos_betha',
        metadata: { project_id: projectId }
      });
      setConversation(conv);
      setMessages(conv.messages || []);

      // Subscrever a atualizações
      const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || !conversation || sending) return;

    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
      setUserMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const generateWeeklyReport = async () => {
    if (!conversation) return;
    
    setGeneratingReport(true);
    setSending(true);
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `Gere um Status Report semanal do projeto referente à semana de ${format(weekStart, 'dd/MM/yyyy')} a ${format(weekEnd, 'dd/MM/yyyy')}.

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

Seja específico, objetivo e acionável.`
      });

      // Aguardar resposta completa
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Salvar no banco
      const updatedConv = await base44.agents.getConversation(conversation.id);
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
    } finally {
      setGeneratingReport(false);
      setSending(false);
    }
  };

  const analyzeLastSevenDays = async () => {
    if (!conversation) return;
    
    setIsAnalyzingWeek(true);
    setSending(true);
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `Faça uma análise inteligente do projeto referente aos últimos 7 dias corridos (de ${format(sevenDaysAgo, 'dd/MM/yyyy')} a ${format(today, 'dd/MM/yyyy')}).

Analise:
1. **Evolução do Cronograma**: Quais etapas avançaram ou tiveram atrasos
2. **Tarefas em Andamento**: Progresso em migrações e homologações
3. **Marcos Alcançados**: Quais foram atingidos neste período
4. **Riscos e Bloqueadores**: Novos riscos ou problemas identificados
5. **Recomendações**: Ações prioritárias para a próxima semana

Seja específico e acionável.`
      });

      // Aguardar resposta
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Erro ao analisar semana:', error);
    } finally {
      setIsAnalyzingWeek(false);
      setSending(false);
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

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

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
          description="Selecione um projeto para acessar a IA"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">IA Projetos Betha</h1>
          <p className="text-slate-400 mt-1">Converse com a IA e gere relatórios inteligentes</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="chat" className="data-[state=active]:bg-blue-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat com IA
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600">
            <FileText className="w-4 h-4 mr-2" />
            Status Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card className="bg-slate-800 border-slate-600">
            <CardContent className="p-6">
              {/* Chat Messages */}
              <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <p className="text-slate-400">Pergunte qualquer coisa sobre o projeto</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Ex: "Como está o progresso?", "Quais os principais riscos?", "Gere um status report"
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem..."
                  className="bg-slate-900 border-slate-600 text-white resize-none"
                  rows={2}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!userMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateWeeklyReport}
                  disabled={generatingReport || sending}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {generatingReport ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 mr-2" />
                      Gerar Status Report
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analyzeLastSevenDays()}
                  disabled={isAnalyzingWeek || sending}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {isAnalyzingWeek ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-2" />
                      Análise Inteligente
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
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
              description="Vá para a aba Chat e clique em 'Gerar Status Report'"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}