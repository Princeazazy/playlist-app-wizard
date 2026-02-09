import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAppSession, clearAppSession, AppUser } from '@/lib/appSession';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Shield, ShieldOff, UserX, UserCheck, Loader2, ArrowLeft, LogOut } from 'lucide-react';

interface ManagedUser {
  id: string;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export const AdminPanel = () => {
  const navigate = useNavigate();
  const session = getAppSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  const headers = {
    'x-session-token': session?.token || '',
    'x-session-user-id': session?.user?.id || '',
  };

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('app-auth', {
        body: { action: 'list_users' },
        headers,
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.is_admin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('app-auth', {
        body: {
          action: 'create_user',
          username: newUsername.trim(),
          password: newPassword,
          display_name: newDisplayName.trim() || newUsername.trim(),
          is_admin: newIsAdmin,
        },
        headers,
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      setShowCreate(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewIsAdmin(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('app-auth', {
        body: { action: 'update_user', user_id: user.id, is_active: !user.is_active },
        headers,
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAdmin = async (user: ManagedUser) => {
    if (user.id === session?.user?.id) return; // Can't remove own admin
    try {
      const { data, error: fnError } = await supabase.functions.invoke('app-auth', {
        body: { action: 'update_user', user_id: user.id, is_admin: !user.is_admin },
        headers,
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (user.id === session?.user?.id) return;
    if (!confirm(`Delete user "${user.username}"?`)) return;
    try {
      const { data, error: fnError } = await supabase.functions.invoke('app-auth', {
        body: { action: 'delete_user', user_id: user.id },
        headers,
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    clearAppSession();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-card/80 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {error && <p className="text-destructive text-sm bg-destructive/10 rounded-xl p-3">{error}</p>}

        {/* Create User */}
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-5 h-5" /> Add User
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-card rounded-xl p-4 space-y-3 border border-border/30">
            <h2 className="font-semibold text-foreground">Create New User</h2>
            <input placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Display Name (optional)" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground text-sm" />
            <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground text-sm" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} className="rounded" />
              Admin privileges
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !newUsername.trim() || !newPassword} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">Cancel</button>
            </div>
          </form>
        )}

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className={`flex items-center justify-between gap-3 p-4 rounded-xl border border-border/30 ${user.is_active ? 'bg-card' : 'bg-card/50 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{user.display_name || user.username}</p>
                    {user.is_admin && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Admin</span>}
                    {!user.is_active && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Disabled</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">@{user.username} · Joined {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleAdmin(user)} disabled={user.id === session?.user?.id} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center disabled:opacity-30" title={user.is_admin ? 'Remove admin' : 'Make admin'}>
                    {user.is_admin ? <ShieldOff className="w-4 h-4 text-amber-500" /> : <Shield className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleToggleActive(user)} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center" title={user.is_active ? 'Disable' : 'Enable'}>
                    {user.is_active ? <UserX className="w-4 h-4 text-muted-foreground" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                  </button>
                  <button onClick={() => handleDelete(user)} disabled={user.id === session?.user?.id} className="w-9 h-9 rounded-lg hover:bg-destructive/10 flex items-center justify-center disabled:opacity-30" title="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
