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
  Kanban,
  GraduationCap,
  Plane,
  CheckCircle,
  ArrowLeftRight,
  FileText,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Visão Geral', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Equipe', href: 'Team', icon: Users },
  { name: 'Stakeholders', href: 'Stakeholders', icon: UserCircle },
  { name: 'Produtos', href: 'Products', icon: Package },
  { name: 'Cronograma', href: 'Timeline', icon: Calendar },
  { name: 'Kanban', href: 'Kanban', icon: Kanban },
  { name: 'Treinamentos', href: 'Trainings', icon: GraduationCap },
  { name: 'Viagens', href: 'Travels', icon: Plane },
  { name: 'Homologação', href: 'Homologation', icon: CheckCircle },
  { name: 'Migração', href: 'Migration', icon: ArrowLeftRight },
  { name: 'Relatórios', href: 'Reports', icon: FileText },
  { name: 'Riscos', href: 'Risks', icon: AlertTriangle },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Get project_id from URL to pass to navigation links
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  // Don't show sidebar on ProjectsList page
  if (currentPageName === 'ProjectsList') {
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
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">Gerenciador</p>
              <p className="text-slate-500 text-xs truncate">de Projetos</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
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
        "flex-1 transition-all duration-300",
        collapsed ? "ml-20" : "ml-64"
      )}>
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}