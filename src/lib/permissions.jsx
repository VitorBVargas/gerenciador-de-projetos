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
export function canEditStructure(user) {
  return isPrivileged(user);
}

// Apenas admin pode gerenciar usuários
export function canManageUsers(user) {
  return user?.role === 'admin';
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
  user: 'Usuário'
};