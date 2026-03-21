'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Trash2, Shield, User as UserIcon, Mail, MoreHorizontal, X, Check, ChevronDown } from 'lucide-react';
import { usersApi, User } from '@/services/users';

function avatarColor(name: string) {
  const palette = ['#E2445C','#FDAB3D','#00C875','#0073EA','#A25DDC','#FF7575','#037F4C','#FF642E','#FF158A','#0086C0'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: 0.5 }}>
      {initials(name)}
    </div>
  );
}

function RoleBadge({ role, userId, onUpdate }: { role: 'USER' | 'ADMIN'; userId: string; onUpdate: (id: string, role: 'USER' | 'ADMIN') => void }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const isAdmin = role === 'ADMIN';

  function handleOpen() {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(p => !p);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick() { setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={btnRef} onClick={handleOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          backgroundColor: isAdmin ? '#FFF0F0' : '#F0F7FF',
          borderColor: isAdmin ? '#E2445C' : '#0073EA',
          color: isAdmin ? '#E2445C' : '#0073EA',
        }}>
        {isAdmin ? <Shield size={11} /> : <UserIcon size={11} />}
        {isAdmin ? 'Admin' : 'Member'}
        <ChevronDown size={11} />
      </button>
      {open && rect && (
        <div onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999, background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.14)', border: '1px solid #E6E9EF', minWidth: 140, overflow: 'hidden' }}>
          {(['USER', 'ADMIN'] as const).map(r => (
            <div key={r} onClick={() => { onUpdate(userId, r); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#323338' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r === 'ADMIN' ? <Shield size={13} color="#E2445C" /> : <UserIcon size={13} color="#0073EA" />}
                {r === 'ADMIN' ? 'Admin' : 'Member'}
              </span>
              {role === r && <Check size={13} color="#0073EA" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await usersApi.invite(email.trim(), name.trim() || undefined);
      onInvited(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }} onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', padding: '32px 36px', width: 460, fontFamily: 'Roboto, sans-serif' }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: 0 }}>Invite member</h2>
            <p style={{ fontSize: 14, color: '#676879', margin: '4px 0 0' }}>Add a new member to your workspace</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#676879', display: 'flex' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#323338', marginBottom: 6 }}>Email address *</label>
            <input autoFocus value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="colleague@company.com"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = '#D0D4E4')} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#323338', marginBottom: 6 }}>Full name <span style={{ color: '#676879', fontWeight: 400 }}>(optional)</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = '#D0D4E4')} />
          </div>
          {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#FFF0F0', border: '1px solid #F5C6CB', fontSize: 13, color: '#E2445C' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #D0D4E4', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#323338' }}>Cancel</button>
            <button type="submit" disabled={!email.trim() || loading}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: !email.trim() || loading ? '#C5C7D4' : '#0073EA', color: '#fff', fontSize: 14, fontWeight: 600, cursor: !email.trim() || loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Inviting...' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  async function handleDelete() {
    setLoading(true);
    try { await usersApi.remove(user.id); onDeleted(user.id); onClose(); }
    catch { setLoading(false); }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }} onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', padding: '32px 36px', width: 420, fontFamily: 'Roboto, sans-serif' }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={20} color="#E2445C" />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#323338', margin: 0 }}>Remove member</h3>
            <p style={{ fontSize: 14, color: '#676879', margin: '2px 0 0' }}>This action cannot be undone.</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#323338', marginBottom: 24, lineHeight: 1.5 }}>
          Are you sure you want to remove <strong>{user.name}</strong> ({user.email}) from the workspace?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #D0D4E4', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#323338' }}>Cancel</button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#E2445C', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [showInvite, setShowInvite] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRoleChange(id: string, role: 'USER' | 'ADMIN') {
    try {
      const updated = await usersApi.update(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const memberCount = users.filter(u => u.role === 'USER').length;

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'Roboto, sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#323338', margin: 0 }}>Team members</h1>
          <p style={{ fontSize: 14, color: '#676879', margin: '4px 0 0' }}>Manage your workspace members and their roles</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0073EA', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={16} /> Invite member
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#FFF0F0', border: '1px solid #F5C6CB', fontSize: 13, color: '#E2445C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E2445C', display: 'flex' }}><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total members', value: users.length, color: '#0073EA', bg: '#EEF6FF' },
          { label: 'Admins', value: adminCount, color: '#E2445C', bg: '#FFF0F0' },
          { label: 'Members', value: memberCount, color: '#037F4C', bg: '#EDFBF4' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '18px 22px', borderRadius: 12, background: s.bg, border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#676879', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #D0D4E4', borderRadius: 8, padding: '9px 14px', background: '#fff' }}>
          <Search size={15} color="#676879" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', flex: 1, color: '#323338', background: 'transparent' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#676879' }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'ADMIN', 'USER'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                borderColor: roleFilter === r ? '#0073EA' : '#D0D4E4',
                background: roleFilter === r ? '#EEF6FF' : '#fff',
                color: roleFilter === r ? '#0073EA' : '#676879' }}>
              {r === 'ALL' ? 'All roles' : r === 'ADMIN' ? 'Admins' : 'Members'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E6E9EF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 140px 150px 80px', padding: '12px 20px', borderBottom: '1px solid #F0F1F7', background: '#FAFBFC' }}>
          {['Member', 'Email', 'Role', 'Joined', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 12, fontWeight: 600, color: '#676879', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#676879', fontSize: 14 }}>Loading members...</div>
        ) : error ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#E2445C', fontSize: 14 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#323338', marginBottom: 4 }}>{search ? 'No members found' : 'No members yet'}</div>
            <div style={{ fontSize: 13, color: '#676879' }}>{search ? 'Try a different search term' : 'Invite your first team member'}</div>
          </div>
        ) : (
          filtered.map((user, idx) => (
            <div key={user.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 140px 150px 80px', padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #F0F1F7' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {/* Name + Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={user.name} size={38} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#323338' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: '#676879' }}>{user.role === 'ADMIN' ? 'Administrator' : 'Member'}</div>
                </div>
              </div>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#676879' }}>
                <Mail size={13} color="#C5C7D4" />
                {user.email}
              </div>
              {/* Role badge */}
              <div>
                <RoleBadge role={user.role} userId={user.id} onUpdate={handleRoleChange} />
              </div>
              {/* Joined date */}
              <div style={{ fontSize: 13, color: '#676879' }}>{formatDate(user.createdAt)}</div>
              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <button onClick={() => setDeleteTarget(user)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#C5C7D4' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF0F0'; (e.currentTarget as HTMLElement).style.color = '#E2445C'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#C5C7D4'; }}
                  title="Remove member">
                  <Trash2 size={15} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', color: '#C5C7D4' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F6F8'; (e.currentTarget as HTMLElement).style.color = '#676879'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#C5C7D4'; }}>
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)}
          onInvited={user => setUsers(prev => [user, ...prev.filter(u => u.id !== user.id)])} />
      )}
      {deleteTarget && (
        <DeleteConfirm user={deleteTarget} onClose={() => setDeleteTarget(null)}
          onDeleted={id => setUsers(prev => prev.filter(u => u.id !== id))} />
      )}
    </div>
  );
}
