import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { VERTICAL_CHART_COLORS } from '../verticalColors';
import { getDefaultTasksForProduct } from '../homologation/homologationTasksHelper';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento'
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-white font-medium mb-1">{data.name}</p>
        <p className="text-blue-400 text-sm mb-2">{payload[0].value}% concluído</p>
        {data.productDetails && data.productDetails.length > 0 && (
          <div className="border-t border-slate-600 pt-2 space-y-1">
            <p className="text-slate-400 text-xs font-medium mb-1">Produtos:</p>
            {data.productDetails.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs">
                <span className={`truncate max-w-[160px] ${p.pct < 100 ? 'text-yellow-400' : 'text-green-400'}`}>{p.name}</span>
                <span className={`font-semibold flex-shrink-0 ${p.pct < 100 ? 'text-yellow-400' : 'text-green-400'}`}>{p.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function HomologationProgressChart({ products, tasks }) {
  // Replica EXATAMENTE a mesma lógica da aba Homologação
  const getProductProgress = (productId, productName) => {
    const productTasks = tasks.filter(t => t.product_id === productId);
    const defaultSections = getDefaultTasksForProduct(productName) || [];

    const importedTasks = productTasks.filter(t => t.title.includes('||'));
    const standardTasks = productTasks.filter(t => !t.title.includes('||'));

    // Importadas: agrupadas por seção, sem duplicatas
    const importedBySection = {};
    importedTasks.forEach(task => {
      const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
      if (!match) return;
      const [, sectionName, taskName] = match;
      if (!importedBySection[sectionName]) importedBySection[sectionName] = new Map();
      const key = taskName.toLowerCase();
      if (!importedBySection[sectionName].has(key)) {
        importedBySection[sectionName].set(key, task);
      } else {
        const existing = importedBySection[sectionName].get(key);
        if (task.completed && !existing.completed) importedBySection[sectionName].set(key, task);
      }
    });

    // Padrão: first-match-wins por seção
    const claimedStandardIds = new Set();
    const standardBySection = {};
    for (const section of defaultSections) {
      standardBySection[section.section] = [];
      const seen = new Map();
      for (const task of standardTasks) {
        if (claimedStandardIds.has(task.id)) continue;
        if (!section.tasks.some(t => t.toLowerCase() === task.title.toLowerCase())) continue;
        const key = task.title.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, task);
          standardBySection[section.section].push(task);
          claimedStandardIds.add(task.id);
        } else {
          const existing = seen.get(key);
          if (task.completed && !existing.completed) {
            const idx = standardBySection[section.section].indexOf(existing);
            standardBySection[section.section][idx] = task;
            seen.set(key, task);
          }
        }
      }
    }

    // Tarefas custom: só se produto NÃO tem template
    const customTasks = defaultSections.length === 0
      ? standardTasks.filter(t => !claimedStandardIds.has(t.id))
      : [];

    const allVisible = [
      ...Object.values(importedBySection).flatMap(m => Array.from(m.values())),
      ...Object.values(standardBySection).flat(),
      ...customTasks
    ];

    if (allVisible.length === 0) return null; // sem tarefas visíveis
    const completed = allVisible.filter(t => t.completed).length;
    return { pct: Math.round((completed / allVisible.length) * 100), total: allVisible.length, completed };
  };

  const dataByVertical = Object.entries(
    products.reduce((acc, product) => {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) {
        acc[vertical] = { totalTasks: 0, completedTasks: 0, productDetails: [] };
      }

      const result = getProductProgress(product.id, product.name);
      if (result === null) return acc; // sem tarefas visíveis, ignorar

      acc[vertical].totalTasks += result.total;
      acc[vertical].completedTasks += result.completed;
      acc[vertical].productDetails.push({ name: product.name, pct: result.pct, total: result.total, completed: result.completed });

      return acc;
    }, {})
  )
  .filter(([, data]) => data.totalTasks > 0)
  .map(([vertical, data]) => ({
    vertical,
    name: verticalLabels[vertical] || vertical,
    progress: Math.round((data.completedTasks / data.totalTasks) * 100),
    color: VERTICAL_CHART_COLORS[vertical] || '#64748b',
    productDetails: data.productDetails.sort((a, b) => a.pct - b.pct)
  }))
  .sort((a, b) => b.progress - a.progress);

  if (dataByVertical.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Progresso de Homologação por Vertical</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm text-center py-8">
            Nenhuma tarefa de homologação cadastrada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Progresso de Homologação por Vertical</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataByVertical} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
            <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
              {dataByVertical.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}