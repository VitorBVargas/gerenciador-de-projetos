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
    const monthlyData = {};
    const now = new Date();

    // Gerar próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const month = addMonths(now, i);
      const key = format(month, 'yyyy-MM');
      monthlyData[key] = {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        released: 0,
        grace_period: 0,
        raw_key: key
      };
    }

    // Processar cada produto com senha liberada
    products.forEach(product => {
      if (product.production_password) {
        // Data em que a senha foi liberada (usando created_date)
        const releaseDate = product.created_date || new Date().toISOString();
        const releaseMonth = format(new Date(releaseDate), 'yyyy-MM');

        if (monthlyData[releaseMonth]) {
          if (product.password_grace_period_until) {
            monthlyData[releaseMonth].grace_period += 1;
          } else {
            monthlyData[releaseMonth].released += 1;
          }
        }

        // Se tem carência, adicionar no mês que acaba
        if (product.password_grace_period_until) {
          const gracePeriodMonth = format(new Date(product.password_grace_period_until), 'yyyy-MM');
          if (monthlyData[gracePeriodMonth]) {
            // Remover do grace_period e adicionar ao released
            monthlyData[gracePeriodMonth].grace_period -= 1;
            monthlyData[gracePeriodMonth].released += 1;
          }
        }
      }
    });

    return Object.values(monthlyData);
  }, [products]);

  const releasedProducts = useMemo(() => {
    if (!selectedMonth) return [];

    return products.filter(product => {
      if (!product.production_password) return false;
      const releaseDate = product.created_date || new Date().toISOString();
      const releaseMonth = format(new Date(releaseDate), 'yyyy-MM');
      return releaseMonth === selectedMonth;
    });
  }, [selectedMonth, products]);

  return (
    <>
      {/* Controles de Visibilidade */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Gráficos do Financeiro</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="implantacao-chart"
                checked={visibleCharts?.implantacao !== false}
                onCheckedChange={(checked) => onVisibilityChange?.('implantacao', checked)}
                className="border-slate-600 h-4 w-4"
              />
              <label htmlFor="implantacao-chart" className="text-xs text-slate-300 cursor-pointer">
                Implantação
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="recorrente-chart"
                checked={visibleCharts?.recorrente !== false}
                onCheckedChange={(checked) => onVisibilityChange?.('recorrente', checked)}
                className="border-slate-600 h-4 w-4"
              />
              <label htmlFor="recorrente-chart" className="text-xs text-slate-300 cursor-pointer">
                Recorrente
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="password-chart"
                checked={visibleCharts?.password !== false}
                onCheckedChange={(checked) => onVisibilityChange?.('password', checked)}
                className="border-slate-600 h-4 w-4"
              />
              <label htmlFor="password-chart" className="text-xs text-slate-300 cursor-pointer">
                Senhas de Produção
              </label>
            </div>
          </div>
        </div>
      </div>

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
                dataKey="released"
                fill="#10b981"
                name="Liberadas"
                cursor="pointer"
                onClick={(data) => {
                  setSelectedMonth(data.raw_key);
                }}
              />
              <Bar
                dataKey="grace_period"
                fill="#f59e0b"
                name="Com Carência"
                cursor="pointer"
                onClick={(data) => {
                  setSelectedMonth(data.raw_key);
                }}
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
                Senhas Liberadas em {format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}
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
            <div className="space-y-3">
              {releasedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    product.password_grace_period_until
                      ? 'bg-amber-900/20 border-amber-700/50 hover:border-amber-600'
                      : 'bg-emerald-900/20 border-emerald-700/50 hover:border-emerald-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          product.password_grace_period_until
                            ? "bg-amber-600 text-white text-xs"
                            : "bg-emerald-600 text-white text-xs"
                        }>
                          {product.password_grace_period_until ? 'Com Carência' : 'Liberada'}
                        </Badge>
                        <div className="font-semibold text-white">{product.name}</div>
                      </div>
                      {product.password_grace_period_until && (
                        <div className="text-sm text-amber-400 mt-1">
                          Carência até: {format(new Date(product.password_grace_period_until), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                    </div>
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