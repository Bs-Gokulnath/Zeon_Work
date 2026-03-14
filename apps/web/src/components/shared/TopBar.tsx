'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth, type AuthUser } from '@/hooks/useAuth';
import ZeonLogo from '@/components/ui/ZeonLogo';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = ['#0073EA', '#E2445C', '#00C875', '#FDAB3D', '#A25DDC', '#037F4C', '#0086C0'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────

const ACCOUNT_ITEMS = [
  { label: 'My profile',     icon: '👤', href: '/dashboard/profile' },
  { label: 'Import data',    icon: '⬇',  href: '#' },
  { label: 'Developers',     icon: '</>',href: '#' },
  { label: 'Spaces',         icon: '⬡',  href: '#', badge: 'Alpha' },
  { label: 'Trash',          icon: '🗑',  href: '#' },
  { label: 'Archive',        icon: '⊡',  href: '#' },
  { label: 'Administration', icon: '⚙',  href: '#' },
  { label: 'Teams',          icon: '👥', href: '#' },
];

const EXPLORE_ITEMS = [
  { label: 'App marketplace', icon: '⬆', href: '#' },
  { label: 'Mobile app',      icon: '📱', href: '#' },
  { label: 'Zeon.labs',       icon: '⚗', href: '#' },
  { label: 'Shortcuts',       icon: '⌨', href: '#' },
];

const EXPLORE_ITEMS2 = [
  { label: 'Invite members',  icon: '+',  href: '#' },
  { label: 'Get help',        icon: '?',  href: '#' },
  { label: 'Change theme',    icon: '☼',  href: '#', arrow: true },
  { label: 'Upgrade account', icon: '↑',  href: '#' },
];

function ProfileDropdown({ user, anchorRect, onClose, onSignout }: {
  user: AuthUser;
  anchorRect: DOMRect;
  onClose: () => void;
  onSignout: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<'on' | 'off'>('off');

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const top = anchorRect.bottom + 6;
  const right = window.innerWidth - anchorRect.right;

  const menuItem = (label: string, icon: string, href: string, extra?: { badge?: string; arrow?: boolean }) => (
    <Link key={label} href={href} onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', color: '#323338', fontSize: 13, textDecoration: 'none', fontFamily: 'inherit' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span style={{ width: 18, textAlign: 'center', fontSize: 14, color: '#676879' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {extra?.badge && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#0073EA', border: '1px solid #0073EA', borderRadius: 4, padding: '1px 5px' }}>{extra.badge}</span>
      )}
      {extra?.arrow && (
        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12, color: '#C5C7D4' }}>
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      )}
    </Link>
  );

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top, right, zIndex: 9999,
      backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 10,
      boxShadow: '0 8px 28px rgba(0,0,0,0.14)', width: 480, fontFamily: 'Roboto, sans-serif',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
    }}>
      {/* ── Header ── */}
      <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #E6E9EF', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: avatarColor(user.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {initials(user.name)}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ZeonLogo size={22} showText={true} textSize={12} />
          </div>
          <p style={{ fontSize: 12, color: '#676879', margin: '2px 0 0' }}>{user.email}</p>
        </div>
      </div>

      {/* ── Left column: Account ── */}
      <div style={{ borderRight: '1px solid #E6E9EF', paddingBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#676879', padding: '10px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Account</p>
        {ACCOUNT_ITEMS.map(i => menuItem(i.label, i.icon, i.href, { badge: i.badge }))}
        <div style={{ borderTop: '1px solid #E6E9EF', margin: '4px 0' }} />
        <button onClick={() => { onSignout(); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E2445C', fontFamily: 'inherit', textAlign: 'left' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF0F0')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span style={{ width: 18, textAlign: 'center' }}>↩</span>
          Log out
        </button>
      </div>

      {/* ── Right column: Explore ── */}
      <div style={{ paddingBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#676879', padding: '10px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Explore</p>
        {EXPLORE_ITEMS.map(i => menuItem(i.label, i.icon, i.href))}
        <div style={{ borderTop: '1px solid #E6E9EF', margin: '4px 0' }} />
        {EXPLORE_ITEMS2.map(i => menuItem(i.label, i.icon, i.href, { arrow: i.arrow }))}
      </div>

      {/* ── Footer: Working status ── */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #E6E9EF', padding: '10px 14px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#676879', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Working status</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Do not disturb toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#323338' }}>🔔 Do not disturb</span>
            <button onClick={() => setDoNotDisturb(v => !v)}
              style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: doNotDisturb ? '#0073EA' : '#D0D4E4', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 2, left: doNotDisturb ? 18 : 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', display: 'block' }} />
            </button>
          </div>
          {/* On / Off */}
          {(['on', 'off'] as const).map(val => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: '#323338' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${workingStatus === val ? '#0073EA' : '#D0D4E4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {workingStatus === val && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0073EA', display: 'block' }} />}
              </span>
              <input type="radio" style={{ display: 'none' }} checked={workingStatus === val} onChange={() => setWorkingStatus(val)} />
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </label>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#0073EA', cursor: 'pointer' }}>More &rsaquo;</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export default function TopBar() {
  const { user, signout } = useAuth(true);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!user) return (
    <header style={{ height: 48, borderBottom: '1px solid #D0D4E4', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px' }} />
  );

  return (
    <>
      <header style={{
        height: 48, borderBottom: '1px solid #D0D4E4', backgroundColor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 16px', gap: 8, flexShrink: 0,
      }}>
        {/* Notification bell */}
        <button style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#676879' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
            <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6zM8.5 17a1.5 1.5 0 003 0" />
          </svg>
        </button>

        {/* Search */}
        <button style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#676879' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16 }}>
            <circle cx="8.5" cy="8.5" r="5" /><path d="M13 13l3.5 3.5" />
          </svg>
        </button>

        {/* Avatar */}
        <button ref={btnRef}
          onClick={() => setAnchorRect(anchorRect ? null : btnRef.current!.getBoundingClientRect())}
          style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: avatarColor(user.name), border: anchorRect ? '2px solid #0073EA' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, transition: 'border-color 0.15s' }}>
          {initials(user.name)}
        </button>
      </header>

      {anchorRect && (
        <ProfileDropdown user={user} anchorRect={anchorRect} onClose={() => setAnchorRect(null)} onSignout={signout} />
      )}
    </>
  );
}
