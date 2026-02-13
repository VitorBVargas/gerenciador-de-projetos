import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PasswordReleasesChart({ products, visibleCharts = {}, onVisibilityChange }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const chartData = useMemo(() => {
    const verticalData = {};
    const now = new Date();

    // Processar cada produto com senha liberada
    products.forEach(product => {
      if (product.production_password) {
        const vertical = product.vertical || 'outros';
        
        if (!verticalData[vertical]) {
          verticalData[vertical] = {
            vertical,
            liberadas: 0,
            comCarencia: 0,
            products: []
          };
        }

        // Se tem carência até uma data
        if (product.password_grace_period_until) {
          verticalData[vertical].comCarencia += 1;
        } else {
          verticalData[vertical].liberadas += 1;
        }
        
        verticalData[vertical].products.push(product);
      }
    });

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

    return Object.values(verticalData)
      .map(item => ({
        ...item,
        name: verticalLabels[item.vertical] || item.vertical
      }))
      .sort((a, b) => (b.liberadas + b.comCarencia) - (a.liberadas + a.comCarencia));
  }, [products]);

  const releasedProducts = useMemo(() => {
    if (!selectedMonth) return [];

    const dataItem = chartData.find(item => item.vertical === selectedMonth);
    return dataItem?.products || [];
  }, [selectedMonth, chartData]);

  return (
    <>
      {visibleCharts?.password !== false && (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Senhas de Produção Liberadas por Vertical</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 60)}>
            <BarChart 
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                type="number"
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
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Bar
                dataKey="liberadas"
                fill="#10b981"
                name="Liberadas"
                cursor="pointer"
                onClick={(data) => setSelectedMonth(data.vertical)}
                stackId="a"
              />
              <Bar
                dataKey="comCarencia"
                fill="#f59e0b"
                name="Com Carência"
                cursor="pointer"
                onClick={(data) => setSelectedMonth(data.vertical)}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {products.filter(p => p.production_password).length}
            </div>
            <div className="text-sm text-slate-400">Total de senhas liberadas</div>
          </div>
        </CardContent>
        </Card>
        )}

        {/* Lista de senhas liberadas por vertical */}
        {selectedMonth && releasedProducts.length > 0 && (
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">
                Senhas em {chartData.find(d => d.vertical === selectedMonth)?.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(null)}
                className="text-slate-400 hover:text-white"
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Cabeçalho */}
              <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-slate-700 text-xs text-slate-400 font-semibold">
                <div>Produto</div>
                <div>Status</div>
                <div>Fim da Carência</div>
              </div>
              
              {/* Lista de produtos */}
              {releasedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`grid grid-cols-3 gap-4 items-center p-4 rounded-lg border transition-colors ${
                    product.password_grace_period_until
                      ? 'bg-amber-900/20 border-amber-700/50 hover:border-amber-600'
                      : 'bg-emerald-900/20 border-emerald-700/50 hover:border-emerald-600'
                  }`}
                >
                  <div className="font-semibold text-white">{product.name}</div>
                  <div>
                    <Badge className={
                      product.password_grace_period_until
                        ? "bg-amber-600 text-white text-xs"
                        : "bg-emerald-600 text-white text-xs"
                    }>
                      {product.password_grace_period_until ? 'Com Carência' : 'Liberada'}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300">
                    {product.password_grace_period_until 
                      ? format(new Date(product.password_grace_period_until), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}