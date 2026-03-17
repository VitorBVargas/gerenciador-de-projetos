import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { productHasMigration } from '../migration/migrationTasks';
import { VERTICAL_CHART_COLORS } from '../verticalColors';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
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
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold mb-1">{data.name}</p>
        <p className="text-slate-300 text-sm">
          Progresso: <span className="text-blue-400 font-semibold">{data.progress}%</span>
        </p>
        <p className="text-slate-400 text-xs mt-1">
          {data.completed} de {data.total} tarefas
        </p>
      </div>
    );
  }
  return null;
};

export default function MigrationProgressChart({ products, tasks }) {
  // Agrupa produtos por vertical (apenas produtos que TÊM processo de migração)
  const productsByVertical = products.reduce((acc, product) => {
    // Só inclui produtos que têm migração definida
    if (productHasMigration(product.name)) {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(product);
    }
    return acc;
  }, {});

  // Calcula progresso por vertical (removendo duplicatas como na página de Migração)
  const chartData = Object.entries(productsByVertical).map(([vertical, verticalProducts]) => {
    const productIds = verticalProducts.map(p => p.id);
    const verticalTasks = tasks.filter(t => productIds.includes(t.product_id));
    
    // Remover duplicatas (mesma lógica de Migration.jsx)
    const importedTasks = verticalTasks.filter(t => t.title.includes('||'));
    const standardTasks = verticalTasks.filter(t => !t.title.includes('||'));
    
    // Remover duplicatas importadas
    const importedBySection = importedTasks.reduce((acc, task) => {
      const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
      if (match) {
        const [, sectionName, taskName] = match;
        const titleLower = taskName.toLowerCase();
        if (!acc[sectionName]) acc[sectionName] = new Map();
        if (!acc[sectionName].has(titleLower)) {
          acc[sectionName].set(titleLower, task);
        }
      }
      return acc;
    }, {});
    
    // Remover duplicatas padrão
    const uniqueStandardTasks = [];
    const seenTitles = new Set();
    for (const task of standardTasks) {
      const titleLower = task.title.toLowerCase();
      if (!seenTitles.has(titleLower)) {
        seenTitles.add(titleLower);
        uniqueStandardTasks.push(task);
      }
    }
    
    // Contar apenas tarefas visíveis (únicas)
    const visibleTasks = [
      ...uniqueStandardTasks,
      ...Object.values(importedBySection).flatMap(map => Array.from(map.values()))
    ];
    
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(t => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      vertical,
      name: verticalLabels[vertical] || vertical,
      progress,
      completed,
      total,
      color: VERTICAL_CHART_COLORS[vertical] || '#64748b'
    };
  }); // Mostra todas as verticais com produtos de migração, mesmo com 0 tarefas

  // Ordena por progresso decrescente
  chartData.sort((a, b) => b.progress - a.progress);

  if (chartData.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Progresso da Migração</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <p className="text-center text-slate-500 text-sm">
            Nenhuma tarefa de migração cadastrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Progresso da Migração por Vertical</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8' }}
              width={110}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }} />
            <Bar dataKey="progress" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}