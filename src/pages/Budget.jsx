import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Upload,
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Pencil,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import ExpenseModal from '../components/modals/ExpenseModal';
import ExpenseImporter from '../components/import/ExpenseImporter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categoryLabels = {
  viagem: 'Viagem',
  hospedagem: 'Hospedagem',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  material: 'Material',
  servico: 'Serviço',
  outros: 'Outros'
};

const categoryColors = {
  viagem: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  hospedagem: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  alimentacao: 'bg-green-500/20 text-green-400 border-green-500/30',
  transporte: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  material: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  servico: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  outros: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export default function Budget() {
  const queryClient = useQueryClient();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetValues, setBudgetValues] = useState({ pre_sales: '', implementation: '' });

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId ? base44.entities.Expense.filter({ project_id: projectId }, '-date') : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      setExpenseModalOpen(false);
      setSelectedExpense(null);
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      setExpenseModalOpen(false);
      setSelectedExpense(null);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingBudget(null);
      setBudgetValues({ pre_sales: '', implementation: '' });
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  });

  const handleSaveExpense = (data) => {
    if (selectedExpense) {
      updateExpenseMutation.mutate({ id: selectedExpense.id, data });
    } else {
      createExpenseMutation.mutate({ ...data, project_id: projectId });
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
    }
  };

  const handleEditBudget = () => {
    setBudgetValues({
      pre_sales: activeProject?.pre_sales_travel_budget?.toString() || '',
      implementation: activeProject?.implementation_estimated_budget?.toString() || ''
    });
    setEditingBudget(true);
  };

  const handleSaveBudget = () => {
    updateProjectMutation.mutate({
      id: activeProject.id,
      data: {
        pre_sales_travel_budget: parseFloat(budgetValues.pre_sales) || 0,
        implementation_estimated_budget: parseFloat(budgetValues.implementation) || 0
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setBudgetValues({ pre_sales: '', implementation: '' });
  };

  // Calculate budget metrics
  const totalBudget = activeProject?.budget || 0;
  const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, exp) => {
    const category = exp.category || 'outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(exp);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Orçamento</h1>
          <p className="text-slate-400 mt-1">Controle financeiro do projeto</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImporterOpen(true)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button 
            onClick={() => { setSelectedExpense(null); setExpenseModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pre-sales Travel Budget Card */}
        <Card className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border-cyan-500/30">
          <CardContent className="p-6">
            {editingBudget === 'pre_sales' ? (
              <div className="space-y-3">
                <p className="text-sm text-cyan-200">Orçamento de Viagens Pré Vendas</p>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={budgetValues.pre_sales}
                  onChange={(e) => setBudgetValues({ ...budgetValues, pre_sales: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  step="0.01"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveBudget}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-cyan-200">Orçamento de Viagens Pré Vendas</p>
                  <button
                    onClick={() => handleEditBudget()}
                    className="p-1 rounded hover:bg-cyan-500/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(activeProject?.pre_sales_travel_budget || 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Implementation Estimated Budget Card */}
        <Card className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 border-indigo-500/30">
          <CardContent className="p-6">
            {editingBudget === 'implementation' ? (
              <div className="space-y-3">
                <p className="text-sm text-indigo-200">Orçamento Estimado Implantação</p>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={budgetValues.implementation}
                  onChange={(e) => setBudgetValues({ ...budgetValues, implementation: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  step="0.01"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveBudget}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-indigo-200">Orçamento Estimado Implantação</p>
                  <button
                    onClick={() => {
                      setBudgetValues({
                        pre_sales: activeProject?.pre_sales_travel_budget?.toString() || '',
                        implementation: activeProject?.implementation_estimated_budget?.toString() || ''
                      });
                      setEditingBudget('implementation');
                    }}
                    className="p-1 rounded hover:bg-indigo-500/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(activeProject?.implementation_estimated_budget || 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-200">Orçamento Total</p>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-200">Valor Gasto</p>
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-red-300 mt-1">{spentPercentage}% do orçamento</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border",
          remaining >= 0 
            ? "bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30"
            : "bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className={cn("text-sm", remaining >= 0 ? "text-green-200" : "text-orange-200")}>
                Saldo Restante
              </p>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                remaining >= 0 ? "bg-green-500/20" : "bg-orange-500/20"
              )}>
                {remaining >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(remaining)}</p>
            {remaining < 0 && (
              <p className="text-xs text-orange-300 mt-1">Orçamento excedido!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Execução do Orçamento</span>
              <span className="text-white font-medium">{spentPercentage}%</span>
            </div>
            <Progress 
              value={Math.min(spentPercentage, 100)} 
              className={cn(
                "h-3",
                spentPercentage > 90 && "bg-red-500"
              )}
            />
            {spentPercentage > 90 && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Atenção: Orçamento próximo do limite
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Despesas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-medium">{expense.title}</h3>
                      <Badge className={cn("border text-xs", categoryColors[expense.category || 'outros'])}>
                        {categoryLabels[expense.category || 'outros']}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>
                        {format(new Date(expense.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                      {expense.notes && (
                        <span className="text-slate-500">• {expense.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(expense.amount)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                        onClick={() => handleEditExpense(expense)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => handleDeleteExpense(expense)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-white mb-2">Nenhuma despesa registrada</h3>
              <p className="text-slate-400 mb-6">Adicione despesas para controlar o orçamento do projeto</p>
              <Button 
                onClick={() => setExpenseModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Despesa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Importer */}
      <ExpenseImporter
        open={importerOpen}
        onOpenChange={setImporterOpen}
        projectId={projectId}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['expenses', projectId] })}
      />

      {/* Expense Modal */}
      <ExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a despesa "{expenseToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Despesa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}