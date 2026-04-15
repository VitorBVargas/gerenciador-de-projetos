import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Package,
  Calendar,
  Plane,
  CheckCircle,
  ArrowLeftRight,
  FileText,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderOpen,
  CheckSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Visão Geral', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Equipe', href: 'Team', icon: Users },
  { name: 'Stakeholders', href: 'Stakeholders', icon: UserCircle },
  { name: 'Produtos', href: 'Products', icon: Package },
  { name: 'Cronograma', href: 'Timeline', icon: Calendar },
  { name: 'Migração', href: 'Migration', icon: ArrowLeftRight },
  { name: 'Homologação', href: 'Homologation', icon: CheckCircle },
  { name: 'Atividades', href: 'Activities', icon: CheckSquare },
  { name: 'Viagens', href: 'Travels', icon: Plane },
  { name: 'Orçamento', href: 'Budget', icon: DollarSign },
  { name: 'IA Projetos Betha', href: 'StatusReports', icon: FileText },
  { name: 'KPI / Indicadores', href: 'Reports', icon: FileText },
  //{ name: 'Relatórios', href: 'Reports', icon: FileText },
  { name: 'Riscos', href: 'Risks', icon: AlertTriangle },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(true);
  const [user, setUser] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  // Get project_id from URL to pass to navigation links
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (projectId) {
      base44.entities.Project.filter({ id: projectId }).then(results => {
        if (results && results.length > 0) setActiveProject(results[0]);
      }).catch(() => {});
    } else {
      setActiveProject(null);
    }
  }, [projectId]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Don't show sidebar on Home, ProjectsList, InternalProjectsList, ExecutiveStatus, BackupManagement
  if (
    currentPageName === 'Home' ||
    currentPageName === 'ProjectsList' ||
    currentPageName === 'PortfolioSelect' ||
    currentPageName === 'InternalProjectsList' ||
    currentPageName === 'InternalDashboard' ||
    currentPageName === 'ExecutiveStatus' ||
    currentPageName === 'BackupManagement' ||
    currentPageName === 'PendenciaEdital'
  ) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Logo */}
        <Link 
          to={createPageUrl(
            currentPageName === 'ProjectsList' ? 'Home' :
            currentPageName === 'Home' || currentPageName === 'ExecutiveStatus' ? 'Home' :
            activeProject?.portfolio ? `ProjectsList?portfolio=${activeProject.portfolio}` : 'ProjectsList'
          )} 
          className="flex items-center h-16 px-4 border-b border-slate-800 hover:bg-slate-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">Gerenciador</p>
              <p className="text-slate-500 text-xs truncate">de Projetos</p>
            </div>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href;
              const url = projectId ? `${item.href}?project_id=${projectId}` : item.href;
              return (
                <Link
                  key={item.href}
                  to={createPageUrl(url)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-20 -right-3 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800">
          {user && !collapsed && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 overflow-x-auto",
        collapsed ? "ml-20" : "ml-64"
      )}>
        {activeProject && (
          <div className="sticky top-0 z-40 flex items-center gap-2 px-6 py-2 bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
            <FolderOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 font-medium truncate">{activeProject.name}</span>
          </div>
        )}
        <div className="min-h-screen min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}