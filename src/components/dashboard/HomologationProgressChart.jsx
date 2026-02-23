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
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium">{payload[0].payload.name}</p>
        <p className="text-blue-400 text-sm">{payload[0].value}% concluído</p>
      </div>
    );
  }
  return null;
};

export default function HomologationProgressChart({ products, tasks }) {
  // Agrupa produtos por vertical e calcula progresso
  const dataByVertical = Object.entries(
    products.reduce((acc, product) => {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) {
        acc[vertical] = { products: [], totalTasks: 0, completedTasks: 0 };
      }
      
      const productTasks = tasks.filter(t => t.product_id === product.id);
      const completed = productTasks.filter(t => t.completed).length;
      
      acc[vertical].products.push(product);
      acc[vertical].totalTasks += productTasks.length;
      acc[vertical].completedTasks += completed;
      
      return acc;
    }, {})
  )
  .filter(([vertical, data]) => data.totalTasks > 0) // Só verticais com tarefas
  .map(([vertical, data]) => ({
    vertical,
    name: verticalLabels[vertical] || vertical,
    progress: Math.round((data.completedTasks / data.totalTasks) * 100),
    color: VERTICAL_CHART_COLORS[vertical] || '#64748b'
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