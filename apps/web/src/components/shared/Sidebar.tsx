'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ZeonLogo from '@/components/ui/ZeonLogo';

// ── Add New Menu ──────────────────────────────────────────────────────────────

const ADD_MENU_ITEMS = [
  { label: 'Project',           icon: '◫', arrow: false },
  { label: 'Portfolio',         icon: '⊞', arrow: false },
  null,
  { label: 'Board',             icon: '▦', arrow: true  },
  { label: 'Doc',               icon: '≡', arrow: true  },
  { label: 'Dashboard',         icon: '▨', arrow: false },
  { label: 'Magic AI solution', icon: '✦', arrow: false, color: '#A259FF' },
  { label: 'Vibe app',          icon: '♥', arrow: false, color: '#FF4593' },
  { label: 'Form',              icon: '✎', arrow: true  },
  { label: 'Workflow',          icon: '⟳', arrow: false },
  { label: 'Canvas',            icon: '⬡', arrow: false },
  { label: 'Folder',            icon: '⊡', arrow: false },
  null,
  { label: 'Installed apps',    icon: '↑', arrow: true  },
  { label: 'Import data',       icon: '⬇', arrow: true  },
  { label: 'Template center',   icon: '✦', arrow: false },
];

function AddNewMenu({ anchorRect, onClose, onNewBoard }: { anchorRect: DOMRect; onClose: () => void; onNewBoard: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const top = anchorRect.top;
  const left = anchorRect.right + 6;

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top, left, zIndex: 9999,
      backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: '6px 0', width: 234,
      fontFamily: 'Roboto, sans-serif',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#676879', padding: '4px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        Add new
      </p>
      {ADD_MENU_ITEMS.map((item, i) => {
        if (!item) return <div key={i} style={{ borderTop: '1px solid #E6E9EF', margin: '4px 0' }} />;
        return (
          <button key={item.label} onClick={() => { if (item.label === 'Board') { onNewBoard(); } onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#323338', textAlign: 'left', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span style={{ width: 18, textAlign: 'center', color: item.color || '#676879', fontSize: 14 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.arrow && (
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12, color: '#C5C7D4' }}>
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M7 18v-6h6v6" />
    </svg>
  );
}

function MyWorkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
      <rect x="2" y="2" width="16" height="16" rx="2" />
      <path d="M2 7h16M7 7v11" />
    </svg>
  );
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: 'Home', icon: HomeIcon, href: '/dashboard' },
  { label: 'My work', icon: MyWorkIcon, href: '/dashboard/my-work' },
  { label: 'More', icon: MoreIcon, href: '/dashboard/more' },
];

const S = {
  sidebar: { backgroundColor: '#F5F6F8', borderRight: '1px solid #D0D4E4' },
  logoWrap: { borderBottom: '1px solid #D0D4E4' },
  logoBox: { backgroundColor: '#0073EA', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  navActive: { backgroundColor: '#DCE9FC', color: '#0073EA', borderRadius: 6 },
  navDefault: { color: '#323338', borderRadius: 6 },
  iconActive: { color: '#0073EA' },
  iconDefault: { color: '#676879' },
  divider: { borderTop: '1px solid #D0D4E4', margin: '4px 12px' },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#676879', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  wsBox: { backgroundColor: '#ffffff', border: '1px solid #D0D4E4', borderRadius: 6 },
  wsAvatar: { backgroundColor: '#0073EA', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  plusBtn: { backgroundColor: '#0073EA', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
};

// ── New Board Modal ───────────────────────────────────────────────────────────

function NewBoardModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim());
    setLoading(false);
    onClose();
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: '24px 28px', width: 380, fontFamily: 'Roboto, sans-serif' }}
        onMouseDown={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323338', margin: '0 0 16px' }}>New Board</h3>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 6 }}>Board name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter board name"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D0D4E4', fontSize: 13, color: '#323338', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#0073EA'}
            onBlur={e => e.target.style.borderColor = '#D0D4E4'}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #D0D4E4', background: '#fff', fontSize: 13, color: '#323338', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              style={{ padding: '7px 16px', borderRadius: 6, border: 'none', backgroundColor: !name.trim() || loading ? '#8DC8F8' : '#0073EA', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [favOpen, setFavOpen] = useState(true);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const plusBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    import('@/services/boards').then(({ boardsApi }) => {
      boardsApi.getAll().then(res => setBoards(res.data)).catch(() => {});
    });
  }, []);

  async function handleCreateBoard(name: string) {
    const { boardsApi } = await import('@/services/boards');
    const res = await boardsApi.create(name);
    setBoards(prev => [...prev, res.data]);
  }

  return (
    <aside className="flex flex-col overflow-y-auto select-none" style={{ width: 220, minWidth: 220, height: '100vh', ...S.sidebar }}>

      {/* Logo */}
      <div style={{ ...S.logoWrap, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px' }}>
        <ZeonLogo size={30} showText={true} />
      </div>

      {/* Main nav */}
      <nav className="px-2 pt-2 pb-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link key={label} href={href}
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[#ECEDF5]"
              style={active ? S.navActive : S.navDefault}>
              <span style={active ? S.iconActive : S.iconDefault}><Icon /></span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={S.divider} />

      {/* Zeon AI */}
      <div className="px-2 py-0.5">
        <button className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md hover:bg-[#ECEDF5] transition-colors"
          style={{ fontSize: 12, fontWeight: 500, color: '#676879' }}>
          <span style={{ color: '#0073EA' }}>✦</span>
          Zeon AI
          <ChevronIcon />
        </button>
      </div>

      {/* Favorites */}
      <div className="px-2 py-0.5">
        <button onClick={() => setFavOpen(v => !v)}
          className="flex items-center gap-1 w-full px-2.5 py-1 rounded-md hover:bg-[#ECEDF5] transition-colors"
          style={S.sectionLabel}>
          <ChevronIcon open={favOpen} />
          Favorites
        </button>
      </div>

      {/* Workspaces */}
      <div className="px-2 mt-1">
        <div className="flex items-center justify-between px-2.5 py-1">
          <span style={S.sectionLabel}>Workspaces</span>
          <div className="flex items-center gap-2" style={{ color: '#676879' }}>
            <button className="hover:text-[#323338] transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <circle cx="4" cy="10" r="1.3" /><circle cx="10" cy="10" r="1.3" /><circle cx="16" cy="10" r="1.3" />
              </svg>
            </button>
            <button className="hover:text-[#323338] transition-colors">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                <circle cx="8.5" cy="8.5" r="5" /><path d="M13 13l3.5 3.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workspace selector */}
        <div className="flex items-center gap-1.5 mt-1 mb-2 px-1">
          <button className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 hover:bg-[#ECEDF5] transition-colors"
            style={{ ...S.wsBox, fontSize: 12, fontWeight: 500, color: '#323338' }}>
            <span style={S.wsAvatar}>M</span>
            <span className="truncate">Main workspac...</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 ml-auto shrink-0" style={{ color: '#676879' }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            ref={plusBtnRef}
            onClick={() => {
              if (anchorRect) {
                setAnchorRect(null);
              } else {
                setAnchorRect(plusBtnRef.current?.getBoundingClientRect() ?? null);
              }
            }}
            className="hover:opacity-80 transition-opacity"
            style={{ ...S.plusBtn, backgroundColor: anchorRect ? '#0060C0' : '#0073EA' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
            </svg>
          </button>
          {anchorRect && (
            <AddNewMenu
              anchorRect={anchorRect}
              onClose={() => setAnchorRect(null)}
              onNewBoard={() => { setAnchorRect(null); setShowNewBoard(true); }}
            />
          )}
          {showNewBoard && (
            <NewBoardModal onClose={() => setShowNewBoard(false)} onCreate={handleCreateBoard} />
          )}
        </div>

        {/* Board list */}
        <div className="pb-4" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {boards.length === 0 && (
            <p style={{ fontSize: 12, color: '#C5C7D4', padding: '4px 10px' }}>No boards yet</p>
          )}
          {boards.map((board) => {
            const href = `/dashboard/board/${board.id}`;
            const active = pathname === href;
            return (
              <Link key={board.id} href={href}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] transition-colors hover:bg-[#ECEDF5]"
                style={active ? { ...S.navActive, fontWeight: 500 } : { color: '#323338', borderRadius: 6 }}>
                <span style={active ? S.iconActive : S.iconDefault}><BoardIcon /></span>
                {board.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
