import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser, canManageUsers, ROLE_LABELS } from '@/lib/permissions';

const ROLE_OPTIONS = ['admin', 'gerente', 'coordenador', 'user'];

export default function UserManagement() {
  const { user: currentUser, loading: loadingUser } = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list('-created_date', 500);
      setUsers(list);
    } catch (e) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!canManageUsers(currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
        <Link to="/ProjectsList"><Button variant="outline">Voltar</Button></Link>
      </div>
    );
  }

  const handleRoleChange = async (userId, newRole) => {
    setSavingId(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success('Papel atualizado');
    } catch (e) {
      toast.error('Erro ao atualizar papel');
    } finally {
      setSavingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('user');
      loadUsers();
    } catch (e) {
      toast.error('Erro ao enviar convite: ' + (e.message || ''));
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/ProjectsList">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h1>
          </div>
        </div>

        {/* Invite */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Convidar novo usuário
          </h2>
          <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
            <Input
              type="email"
              required
              placeholder="email@empresa.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar convite'}
            </Button>
          </form>
        </Card>

        {/* List */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">
              Usuários cadastrados ({users.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || '—'}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingId === u.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    <Select
                      value={u.role || 'user'}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={u.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum usuário cadastrado.
                </div>
              )}
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-500 mt-4">
          Você não pode alterar seu próprio papel.
        </p>
      </div>
    </div>
  );
}