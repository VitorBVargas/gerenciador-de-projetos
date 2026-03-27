import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { VERTICAL_CHART_COLORS } from '../verticalColors';

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
  // Agrupa produtos por vertical e calcula progresso
  // Deduplica tarefas por produto (igual à lógica da aba Homologação)
  const deduplicateProductTasks = (productTasks) => {
    const importedTasks = productTasks.filter(t => t.title.includes('||'));
    const standardTasks = productTasks.filter(t => !t.title.includes('||'));

    // Deduplicar tarefas padrão por título
    const uniqueStandard = [];
    const seenTitles = new Set();
    for (const task of standardTasks) {
      const key = task.title.toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        uniqueStandard.push(task);
      }
    }

    // Deduplicar tarefas importadas por seção+título, preferindo marcadas
    const importedBySection = {};
    for (const task of importedTasks) {
      const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
      if (match) {
        const [, section, name] = match;
        const key = `${section}|||${name.toLowerCase()}`;
        if (!importedBySection[key] || (task.completed && !importedBySection[key].completed)) {
          importedBySection[key] = task;
        }
      }
    }

    return [...uniqueStandard, ...Object.values(importedBySection)];
  };

  const dataByVertical = Object.entries(
    products.reduce((acc, product) => {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) {
        acc[vertical] = { products: [], totalTasks: 0, completedTasks: 0, productDetails: [] };
      }
      
      const productTasks = tasks.filter(t => t.product_id === product.id);
      const uniqueTasks = deduplicateProductTasks(productTasks);
      
      // Ignorar produtos sem nenhuma tarefa de homologação
      if (uniqueTasks.length === 0) return acc;
      
      const completed = uniqueTasks.filter(t => t.completed).length;
      const pct = Math.round((completed / uniqueTasks.length) * 100);
      
      acc[vertical].products.push(product);
      acc[vertical].totalTasks += uniqueTasks.length;
      acc[vertical].completedTasks += completed;
      acc[vertical].productDetails.push({ name: product.name, pct, total: uniqueTasks.length, completed });
      
      return acc;
    }, {})
  )
  .filter(([vertical, data]) => data.totalTasks > 0)
  .map(([vertical, data]) => ({
    vertical,
    name: verticalLabels[vertical] || vertical,
    progress: Math.round((data.completedTasks / data.totalTasks) * 100),
    color: VERTICAL_CHART_COLORS[vertical] || '#64748b',
    productDetails: (data.productDetails || []).sort((a, b) => a.pct - b.pct)
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