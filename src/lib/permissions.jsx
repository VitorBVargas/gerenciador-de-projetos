import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Perfis com privilégio total (podem criar/editar/excluir projetos e tudo mais).
 */
const PRIVILEGED_ROLES = ['admin', 'gerente', 'coordenador'];

/**
 * Verifica se o usuário tem privilégio total.
 */
export function isPrivileged(user) {
  if (!user) return false;
  return PRIVILEGED_ROLES.includes(user.role);
}

/**
 * Verifica se o usuário é um Parceiro (acesso restrito a projetos liberados).
 */
export function isParceiro(user) {
  return user?.role === 'parceiro';
}

/**
 * Lista de IDs de projetos que o Parceiro pode ver/editar.
 */
export function getAllowedProjectIds(user) {
  return Array.isArray(user?.allowed_project_ids) ? user.allowed_project_ids : [];
}

/**
 * Verifica se o usuário pode acessar um projeto específico.
 * Parceiros só acessam os projetos liberados; demais perfis acessam todos.
 */
export function canAccessProject(user, projectId) {
  if (!isParceiro(user)) return true;
  return getAllowedProjectIds(user).includes(projectId);
}

/**
 * Páginas internas de um projeto que o Parceiro NÃO pode ver.
 */
const PARCEIRO_BLOCKED_PAGES = ['Budget', 'HorasApontamento'];

/**
 * Verifica se o Parceiro pode ver uma página interna do projeto.
 */
export function canParceiroSeePage(user, pageName) {
  if (!isParceiro(user)) return true;
  return !PARCEIRO_BLOCKED_PAGES.includes(pageName);
}

/**
 * Permissões granulares — todas as áreas restritas para "user" comum
 * passam por esses helpers.
 */
export function canEditProject(user) {
  return isPrivileged(user);
}

export function canDeleteProject(user) {
  return isPrivileged(user);
}

export function canCreateProject(user) {
  return isPrivileged(user);
}

// Estruturais do projeto (produtos, equipe, stakeholders, riscos, timeline, documentos, cronograma)
// Parceiros podem editar os dados dos projetos liberados.
export function canEditStructure(user) {
  return isPrivileged(user) || isParceiro(user);
}

// Apenas admin pode gerenciar usuários
export function canManageUsers(user) {
  return user?.role === 'admin';
}

// Usuários do tipo "user" não têm acesso ao Status Executivo
export function canSeeExecutiveStatus(user) {
  return user?.role !== 'user';
}

/**
 * Hook para carregar o usuário logado uma única vez.
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then((u) => { if (mounted) setUser(u); })
      .catch(() => { if (mounted) setUser(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { user, loading };
}

export const ROLE_LABELS = {
  admin: 'Administrador',
  gerente: 'Gerente',
  coordenador: 'Coordenador',
  user: 'Usuário',
  parceiro: 'Parceiro'
};