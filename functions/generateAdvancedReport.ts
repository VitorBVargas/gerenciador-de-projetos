import { base44 } from "@/api/base44Client";

/**
 * Gera um relatório executivo avançado usando LLM
 * Analisa múltiplas entidades e fornece insights estratégicos
 */
export async function generateAdvancedReport(projectId) {
  try {
    // Fetch all relevant data in parallel
    const [
      project,
      products,
      timelineEvents,
      risks,
      expenses,
      recognizedRevenue,
      kanbanTasks,
      migrationTasks,
      homologationTasks,
      milestones,
      teamMembers,
      statusReports
    ] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.Product.filter({ project_id: projectId }),
      base44.entities.TimelineEvent.filter({ project_id: projectId }),
      base44.entities.Risk.filter({ project_id: projectId }),
      base44.entities.Expense.filter({ project_id: projectId }),
      base44.entities.RecognizedRevenue.filter({ project_id: projectId }),
      base44.entities.KanbanTask.filter({ project_id: projectId }),
      base44.entities.MigrationTask.filter({ project_id: projectId }),
      base44.entities.HomologationTask.filter({ project_id: projectId }),
      base44.entities.ProjectMilestone.filter({ project_id: projectId }),
      base44.entities.TeamMember.filter({ project_id: projectId }),
      base44.entities.StatusReport.filter({ project_id: projectId }, '-created_date', 10)
    ]);

    const projectData = project[0];

    // Prepare analysis data
    const analysisData = {
      project: {
        name: projectData?.name,
        status: projectData?.status,
        deadline: projectData?.deadline,
        implementation_value: projectData?.implementation_value,
        recurring_value: projectData?.recurring_value,
        budget: projectData?.budget
      },
      productAnalysis: {
        total: products.length,
        byStatus: {
          pendente: products.filter(p => p.status === 'pendente').length,
          em_homologacao: products.filter(p => p.status === 'em_homologacao').length,
          homologado: products.filter(p => p.status === 'homologado').length,
          em_producao: products.filter(p => p.status === 'em_producao').length
        },
        byPriority: {
          critica: products.filter(p => p.priority === 'critica').length,
          alta: products.filter(p => p.priority === 'alta').length,
          media: products.filter(p => p.priority === 'media').length,
          baixa: products.filter(p => p.priority === 'baixa').length
        },
        passwordReleases: products.filter(p => p.production_password).length,
        withGracePeriod: products.filter(p => p.password_grace_period_until).length,
        implementationAccepted: products.filter(p => p.implementation_accepted).length
      },
      timelineAnalysis: {
        total: timelineEvents.length,
        byStatus: {
          nao_iniciado: timelineEvents.filter(e => e.status === 'nao_iniciado').length,
          em_andamento: timelineEvents.filter(e => e.status === 'em_andamento').length,
          concluido: timelineEvents.filter(e => e.status === 'concluido').length,
          atrasado: timelineEvents.filter(e => e.status === 'atrasado').length
        },
        avgProgress: (timelineEvents.reduce((sum, e) => sum + (e.progress || 0), 0) / timelineEvents.length).toFixed(1),
        overdueCount: timelineEvents.filter(e => {
          const endDate = new Date(e.end_date);
          return endDate < new Date() && e.status !== 'concluido';
        }).length
      },
      riskAnalysis: {
        total: risks.length,
        critical: risks.filter(r => r.probability === 'alta' && r.impact === 'alto').length,
        byStatus: {
          identificado: risks.filter(r => r.status === 'identificado').length,
          em_monitoramento: risks.filter(r => r.status === 'em_monitoramento').length,
          mitigado: risks.filter(r => r.status === 'mitigado').length,
          ocorreu: risks.filter(r => r.status === 'ocorreu').length
        },
        topRisks: risks
          .filter(r => r.probability === 'alta' || r.impact === 'alto')
          .slice(0, 5)
          .map(r => ({ title: r.title, probability: r.probability, impact: r.impact, status: r.status }))
      },
      financialAnalysis: {
        budgetConsumption: projectData?.budget ? ((expenses.reduce((sum, e) => sum + e.amount, 0) / projectData.budget) * 100).toFixed(1) : 'N/A',
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        implantationRevenueRecognized: recognizedRevenue
          .filter(r => r.type === 'implantacao')
          .reduce((sum, r) => sum + r.amount, 0),
        recurringRevenueRecognized: recognizedRevenue
          .filter(r => r.type === 'recorrente')
          .reduce((sum, r) => sum + r.amount, 0)
      },
      teamAnalysis: {
        totalMembers: teamMembers.length,
        byVertical: {}
      },
      taskAnalysis: {
        kanban: {
          backlog: kanbanTasks.filter(t => t.status === 'backlog').length,
          todo: kanbanTasks.filter(t => t.status === 'todo').length,
          doing: kanbanTasks.filter(t => t.status === 'doing').length,
          review: kanbanTasks.filter(t => t.status === 'review').length,
          done: kanbanTasks.filter(t => t.status === 'done').length
        },
        migration: {
          completed: migrationTasks.filter(t => t.completed).length,
          total: migrationTasks.length
        },
        homologation: {
          completed: homologationTasks.filter(t => t.completed).length,
          total: homologationTasks.length
        }
      }
    };

    // Count members by vertical
    teamMembers.forEach(member => {
      if (!analysisData.teamAnalysis.byVertical[member.vertical]) {
        analysisData.teamAnalysis.byVertical[member.vertical] = 0;
      }
      analysisData.teamAnalysis.byVertical[member.vertical]++;
    });

    // Use LLM to generate intelligent analysis
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em gerenciamento de projetos de implementação de software. Analise os dados do projeto abaixo e gere um relatório executivo inteligente e acionável.

DADOS DO PROJETO:
${JSON.stringify(analysisData, null, 2)}

TAREFAS:
1. DIAGNÓSTICO DO PROJETO: Avalie a saúde geral (Verde/Amarelo/Vermelho) com justificativa clara
2. ANÁLISE DE PRODUTOS: Identifique bloqueadores (produtos pendentes/parados)
3. CRONOGRAMA: Avalie se o projeto está no prazo e identifique etapas em risco
4. RISCOS CRÍTICOS: Highlight dos 3 principais riscos com impacto potencial
5. ANÁLISE FINANCEIRA: Projeção de consumo de orçamento e receita
6. RECOMENDAÇÕES: 5 ações prioritárias com ordem de execução
7. PRÓXIMAS 2 SEMANAS: Milestones críticos e pontos de atenção

FORMATO:
Use estrutura clara com emojis, seja específico (cite números, datas, nomes de produtos), e forneça recomendações acionáveis. Escreva em português.`,
      response_json_schema: {
        type: "object",
        properties: {
          health_status: {
            type: "string",
            description: "Verde/Amarelo/Vermelho"
          },
          health_summary: {
            type: "string",
            description: "Justificativa da saúde do projeto"
          },
          product_analysis: {
            type: "string",
            description: "Análise de status dos produtos"
          },
          timeline_assessment: {
            type: "string",
            description: "Avaliação do cronograma"
          },
          critical_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                impact: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          financial_outlook: {
            type: "string",
            description: "Projeção financeira"
          },
          priority_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                deadline: { type: "string" },
                owner: { type: "string" }
              }
            }
          },
          next_two_weeks: {
            type: "string",
            description: "Milestones e pontos críticos para as próximas 2 semanas"
          }
        }
      }
    });

    return llmResponse;
  } catch (error) {
    console.error('Error generating advanced report:', error);
    throw error;
  }
}