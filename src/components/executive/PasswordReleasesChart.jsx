import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PasswordReleasesChart({ products, projects = [], visibleCharts = {}, onVisibilityChange }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const chartData = useMemo(() => {
    const monthlyData = {};
    const now = new Date();

    // Gerar próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const month = addMonths(now, i);
      const key = format(month, 'yyyy-MM');
      monthlyData[key] = {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        liberadas: 0,
        comCarencia: 0,
        raw_key: key,
        products: []
      };
    }

    // Processar cada produto com senha liberada
    products.forEach(product => {
      if (product.production_password) {
        const inclusionValue = product.inclusion_value || 0;
        
        // Se tem carência até uma data
        if (product.password_grace_period_until) {
          // Somar em COM CARÊNCIA de hoje até o mês da carência
          const graceEndDate = new Date(product.password_grace_period_until);
          const graceEndMonth = format(graceEndDate, 'yyyy-MM');
          
          let currentMonth = format(now, 'yyyy-MM');
          let checkDate = new Date(now);
          
          // Percorrer todos os meses de hoje até o fim da carência
          while (currentMonth <= graceEndMonth) {
            if (monthlyData[currentMonth]) {
              monthlyData[currentMonth].comCarencia += inclusionValue;
              if (!monthlyData[currentMonth].products.includes(product)) {
                monthlyData[currentMonth].products.push(product);
              }
            }
            checkDate = addMonths(checkDate, 1);
            currentMonth = format(checkDate, 'yyyy-MM');
          }
          
          // Somar no mês SEGUINTE ao fim da carência como LIBERADA
          const nextMonthAfterGrace = addMonths(new Date(product.password_grace_period_until), 1);
          const countMonth = format(new Date(nextMonthAfterGrace.getFullYear(), nextMonthAfterGrace.getMonth(), 1), 'yyyy-MM');
          
          if (monthlyData[countMonth]) {
            monthlyData[countMonth].liberadas += inclusionValue;
            if (!monthlyData[countMonth].products.includes(product)) {
              monthlyData[countMonth].products.push(product);
            }
          }
        } else {
          // Senha liberada SEM carência: somar no mês atual
          const currentMonth = format(now, 'yyyy-MM');
          if (monthlyData[currentMonth]) {
            monthlyData[currentMonth].liberadas += inclusionValue;
            monthlyData[currentMonth].products.push(product);
          }
        }
      }
    });

    return Object.values(monthlyData).filter(d => d.liberadas > 0 || d.comCarencia > 0);
  }, [products]);

  const releasedProducts = useMemo(() => {
    if (!selectedMonth) return [];

    const dataItem = chartData.find(item => item.raw_key === selectedMonth);
    return dataItem?.products || [];
  }, [selectedMonth, chartData]);

  return (
    <>
      {visibleCharts?.password !== false && (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Senhas de Produção Liberadas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
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
                onClick={(data) => setSelectedMonth(data.raw_key)}
                stackId="a"
              />
              <Bar
                dataKey="comCarencia"
                fill="#f59e0b"
                name="Com Carência"
                cursor="pointer"
                onClick={(data) => setSelectedMonth(data.raw_key)}
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

        {/* Lista de senhas liberadas no mês selecionado */}
        {selectedMonth && releasedProducts.length > 0 && (
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">
                Senhas liberadas em {format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}
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
              <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-slate-700 text-xs text-slate-400 font-semibold">
                <div>Produto</div>
                <div>Projeto</div>
                <div>Status</div>
                <div>Fim da Carência</div>
              </div>
              
              {/* Lista de produtos */}
              {releasedProducts.map((product) => {
                // Determinar se a carência acabou no mês selecionado
                const hasGracePeriod = product.password_grace_period_until;
                const isReleasedInSelectedMonth = hasGracePeriod && selectedMonth ? 
                  new Date(product.password_grace_period_until) < new Date(selectedMonth + '-01') : false;

                const isGraceActive = hasGracePeriod && !isReleasedInSelectedMonth;

                return (
                <div
                  key={product.id}
                  className={`grid grid-cols-4 gap-4 items-center p-4 rounded-lg border transition-colors ${
                    isGraceActive
                      ? 'bg-amber-900/20 border-amber-700/50 hover:border-amber-600'
                      : 'bg-emerald-900/20 border-emerald-700/50 hover:border-emerald-600'
                  }`}
                >
                  <div className="font-semibold text-white">{product.name}</div>
                  <div className="text-sm text-slate-300">{projects.find(p => p.id === product.project_id)?.name || product.project_id}</div>
                  <div>
                    <Badge className={
                      isGraceActive
                        ? "bg-amber-600 text-white text-xs"
                        : "bg-emerald-600 text-white text-xs"
                    }>
                      {isGraceActive ? 'Com Carência' : 'Liberada'}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300">
                    {product.password_grace_period_until 
                      ? format(new Date(product.password_grace_period_until), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}