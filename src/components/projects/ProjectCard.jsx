import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FolderOpen, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import ClosureReportButton from '../closure/ClosureReportButton';

export default function ProjectCard({ project, deletingProjectId, onDelete, canDelete = true }) {
  const [projectProducts, setProjectProducts] = useState([]);

  useEffect(() => {
    if (project.id) {
      base44.entities.Product.filter({ project_id: project.id }).then(setProjectProducts);
    }
  }, [project.id]);

  const totalImplementation = projectProducts.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
  const totalInclusion = projectProducts.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);

  return (
    <Card 
      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group ${
        deletingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start gap-2">
          <div className="flex-1 flex items-start justify-between">
            <CardTitle className="text-white text-lg mb-2">
              {deletingProjectId === project.id ? 'Excluindo...' : project.name}
            </CardTitle>
            {deletingProjectId !== project.id && canDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.manager && (
          <div className="text-sm text-slate-400">
            <span className="text-slate-500">Gerente:</span> {project.manager}
          </div>
        )}
        
        {project.deadline && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Prazo: {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
        )}

        {totalImplementation > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <span>Impl. Produtos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalImplementation)}</span>
          </div>
        )}

        {totalInclusion > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <DollarSign className="w-4 h-4" />
            <span>Inclusão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalInclusion)}</span>
          </div>
        )}

        <Link to={createPageUrl(`Dashboard?project_id=${project.id}`)}>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
            disabled={deletingProjectId === project.id}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Abrir Projeto
          </Button>
        </Link>
        <ClosureReportButton project={project} />
      </CardContent>
    </Card>
  );
}