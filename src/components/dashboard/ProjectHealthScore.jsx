import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

/**
 * Health Score Calculation Methodology:
 * 
 * 1. Timeline Health (30 points):
 *    - On time tasks: Full points
 *    - Delayed tasks: Subtract based on severity
 * 
 * 2. Budget Health (25 points):
 *    - Under budget: Full points
 *    - Over budget: Deduct based on percentage
 * 
 * 3. Migration & Homologation Progress (25 points):
 *    - Completion rate of migration/homologation tasks
 * 
 * 4. Risk Assessment (20 points):
 *    - Critical risks: High deduction
 *    - Medium/Low risks: Lower deduction
 * 
 * Final Score: 0-100
 * - 80-100: Healthy (Green)
 * - 60-79: Warning (Yellow)
 * - 40-59: At Risk (Orange)
 * - 0-39: Critical (Red)
 */

const calculateHealthScore = (data) => {
  let score = 100;
  const factors = [];

  // 1. Timeline Health (30 points max)
  const timelineScore = calculateTimelineScore(data.timeline);
  score -= (30 - timelineScore);
  if (timelineScore < 20) {
    factors.push({
      icon: AlertCircle,
      text: 'Etapas atrasadas no cronograma',
      severity: 'high'
    });
  } else if (timelineScore < 25) {
    factors.push({
      icon: AlertTriangle,
      text: 'Algumas etapas com atraso',
      severity: 'medium'
    });
  }

  // 2. Budget Health (25 points max)
  const budgetScore = calculateBudgetScore(data.budget, data.spent);
  score -= (25 - budgetScore);
  if (budgetScore < 15) {
    factors.push({
      icon: AlertCircle,
      text: 'Orçamento excedido',
      severity: 'high'
    });
  } else if (budgetScore < 20) {
    factors.push({
      icon: AlertTriangle,
      text: 'Orçamento próximo do limite',
      severity: 'medium'
    });
  }

  // 3. Migration & Homologation Progress (25 points max)
  const progressScore = calculateProgressScore(
    data.migrationTasks,
    data.homologationTasks
  );
  score -= (25 - progressScore);
  if (progressScore < 15) {
    factors.push({
      icon: AlertCircle,
      text: 'Atrasos em migração/homologação',
      severity: 'high'
    });
  }

  // 4. Risk Assessment (20 points max)
  const riskScore = calculateRiskScore(data.risks);
  score -= (20 - riskScore);
  if (riskScore < 12) {
    factors.push({
      icon: AlertCircle,
      text: 'Riscos críticos identificados',
      severity: 'high'
    });
  } else if (riskScore < 16) {
    factors.push({
      icon: AlertTriangle,
      text: 'Riscos em monitoramento',
      severity: 'medium'
    });
  }

  // Add positive factors
  if (score >= 80) {
    factors.push({
      icon: CheckCircle2,
      text: 'Projeto em dia com cronograma',
      severity: 'good'
    });
  }

  return {
    score: Math.max(0, Math.round(score)),
    factors: factors.slice(0, 3) // Show top 3 factors
  };
};

const calculateTimelineScore = (timeline = []) => {
  if (!timeline.length) return 30;
  
  const total = timeline.length;
  const completed = timeline.filter(e => e.status === 'concluido').length;
  const delayed = timeline.filter(e => e.status === 'atrasado').length;
  const inProgress = timeline.filter(e => e.status === 'em_andamento').length;

  // Check for overdue tasks
  const today = new Date();
  const overdueTasks = timeline.filter(e => {
    if (e.status === 'concluido') return false;
    if (!e.end_date) return false;
    return new Date(e.end_date) < today;
  }).length;

  let score = 30;
  score -= delayed * 3; // -3 points per delayed task
  score -= overdueTasks * 2; // -2 points per overdue task
  
  // Bonus for high completion rate
  const completionRate = completed / total;
  if (completionRate > 0.8) score += 5;

  return Math.max(0, Math.min(30, score));
};

const calculateBudgetScore = (budget = 0, spent = 0) => {
  if (!budget) return 25;
  
  const percentSpent = (spent / budget) * 100;
  
  if (percentSpent <= 70) return 25;
  if (percentSpent <= 85) return 20;
  if (percentSpent <= 100) return 15;
  if (percentSpent <= 120) return 10;
  return 0;
};

const calculateProgressScore = (migrationTasks = [], homologationTasks = []) => {
  const allTasks = [...migrationTasks, ...homologationTasks];
  if (!allTasks.length) return 25;

  const completed = allTasks.filter(t => t.completed).length;
  const completionRate = completed / allTasks.length;

  return Math.round(completionRate * 25);
};

const calculateRiskScore = (risks = []) => {
  if (!risks.length) return 20;

  const critical = risks.filter(r => 
    r.probability === 'alta' && r.impact === 'alto'
  ).length;
  const high = risks.filter(r => 
    (r.probability === 'alta' && r.impact === 'medio') ||
    (r.probability === 'media' && r.impact === 'alto')
  ).length;

  let score = 20;
  score -= critical * 4; // -4 points per critical risk
  score -= high * 2; // -2 points per high risk

  return Math.max(0, score);
};

const getHealthStatus = (score) => {
  if (score >= 80) return {
    label: 'Saudável',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    icon: CheckCircle2
  };
  if (score >= 60) return {
    label: 'Atenção',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    icon: AlertTriangle
  };
  if (score >= 40) return {
    label: 'Em Risco',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500',
    icon: AlertCircle
  };
  return {
    label: 'Crítico',
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    icon: AlertCircle
  };
};

export default function ProjectHealthScore({ 
  timeline = [],
  budget = 0,
  spent = 0,
  migrationTasks = [],
  homologationTasks = [],
  risks = []
}) {
  const { score, factors } = calculateHealthScore({
    timeline,
    budget,
    spent,
    migrationTasks,
    homologationTasks,
    risks
  });

  const status = getHealthStatus(score);
  const StatusIcon = status.icon;

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Health Score do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24">
            {/* Circular Progress */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                className={status.color}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${status.color}`}>{score}</span>
            </div>
          </div>

          <div className="flex-1">
            <div className={`flex items-center gap-2 mb-2 ${status.color}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-semibold text-lg">{status.label}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${status.bgColor} transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Key Factors */}
        {factors.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <p className="text-xs font-medium text-slate-400 uppercase">Principais Fatores</p>
            {factors.map((factor, idx) => {
              const FactorIcon = factor.icon;
              const iconColor = 
                factor.severity === 'high' ? 'text-red-400' :
                factor.severity === 'medium' ? 'text-yellow-400' :
                'text-green-400';
              
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <FactorIcon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
                  <span className="text-slate-300">{factor.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}