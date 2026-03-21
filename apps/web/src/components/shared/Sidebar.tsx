'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, CheckSquare, MoreHorizontal, Sparkles, ChevronRight,
  LayoutGrid, FileText, BarChart2, Wand2, Heart, FileEdit,
  GitBranch, PenLine, Folder, AppWindow, Download, Star,
  Search, Plus, Table2, Layers, Copy, Users,
} from 'lucide-react';
import ZeonLogo from '@/components/ui/ZeonLogo';
import type { BoardType } from '@/services/boards';

const BOARD_SUBMENU = [
  { label: 'New Board',             type: 'NORMAL' as BoardType,      icon: Table2 },
  { label: 'New multi-level board', type: 'MULTI_LEVEL' as BoardType, icon: Layers },
  { label: 'Start with template',   type: 'TEMPLATE',                  icon: Copy },
];

const TEMPLATES = [
  { name: 'Project Tracker',     type: 'NORMAL' as BoardType,      desc: 'Track tasks, owners and due dates' },
  { name: 'Sprint Planning',     type: 'NORMAL' as BoardType,      desc: 'Plan and manage your sprints' },
  { name: 'CRM Pipeline',        type: 'MULTI_LEVEL' as BoardType, desc: 'Manage leads with sub-items' },
  { name: 'Bug Tracker',         type: 'NORMAL' as BoardType,      desc: 'Log and prioritize bugs' },
  { name: 'Roadmap',             type: 'MULTI_LEVEL' as BoardType, desc: 'Plan features with milestones' },
  { name: 'Employee Onboarding', type: 'NORMAL' as BoardType,      desc: 'Onboarding checklist per person' },
];

const ADD_MENU_ITEMS = [
  { label: 'Project',           icon: FileText,   arrow: false },
  { label: 'Portfolio',         icon: LayoutGrid, arrow: false },
  null,
  { label: 'Board',             icon: Table2,     arrow: true  },
  { label: 'Doc',               icon: FileEdit,   arrow: true  },
  { label: 'Dashboard',         icon: BarChart2,  arrow: false },
  { label: 'Magic AI solution', icon: Wand2,      arrow: false, color: '#A259FF' },
  { label: 'Vibe app',          icon: Heart,      arrow: false, color: '#FF4593' },
  { label: 'Form',              icon: PenLine,    arrow: true  },
  { label: 'Workflow',          icon: GitBranch,  arrow: false },
  { label: 'Canvas',            icon: Star,       arrow: false },
  { label: 'Folder',            icon: Folder,     arrow: false },
  null,
  { label: 'Installed apps',    icon: AppWindow,  arrow: true  },
  { label: 'Import data',       icon: Download,   arrow: true  },
  { label: 'Template center',   icon: Copy,       arrow: false },
];

function AddNewMenu({ anchorRect, onClose, onSelect }: {
  anchorRect: DOMRect;
  onClose: () => void;
  onSelect: (action: 'NORMAL' | 'MULTI_LEVEL' | 'TEMPLATE') => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [boardHovered, setBoardHovered] = useState(false);
  const [submenuRect, setSubmenuRect] = useState<DOMRect | null>(null);
  const boardRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuTop = Math.max(8, Math.min(anchorRect.top, window.innerHeight - 60));

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', top: menuTop, left: anchorRect.right + 6, zIndex: 9999 }}>
      <div style={{
        backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: '8px 0', width: 270,
        fontFamily: 'Roboto, sans-serif',
        maxHeight: `calc(100vh - ${menuTop}px - 16px)`, overflowY: 'auto',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#676879', padding: '6px 18px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Add new
        </p>
        {ADD_MENU_ITEMS.map((item, i) => {
          if (!item) return <div key={i} style={{ borderTop: '1px solid #E6E9EF', margin: '4px 0' }} />;
          const isBoard = item.label === 'Board';
          const Icon = item.icon;
          return (
            <button key={item.label}
              ref={isBoard ? boardRowRef : undefined}
              onMouseEnter={() => {
                if (isBoard) { setBoardHovered(true); setSubmenuRect(boardRowRef.current?.getBoundingClientRect() ?? null); }
                else setBoardHovered(false);
              }}
              onMouseLeave={() => { if (isBoard) setBoardHovered(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 18px', background: isBoard && boardHovered ? '#F5F6F8' : 'none',
                border: 'none', cursor: 'pointer', fontSize: 15, color: '#323338',
                textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <Icon size={20} color={item.color || '#676879'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.arrow && <ChevronRight size={17} color="#C5C7D4" />}
            </button>
          );
        })}
      </div>

      {boardHovered && submenuRect && (
        <div
          onMouseEnter={() => setBoardHovered(true)}
          onMouseLeave={() => setBoardHovered(false)}
          style={{
            position: 'fixed', top: submenuRect.top, left: submenuRect.right + 4, zIndex: 10000,
            backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: '8px 0', width: 240,
            fontFamily: 'Roboto, sans-serif',
          }}
        >
          {BOARD_SUBMENU.map((sub) => {
            const Icon = sub.icon;
            return (
              <button key={sub.label}
                onClick={() => { onSelect(sub.type as 'NORMAL' | 'MULTI_LEVEL' | 'TEMPLATE'); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#323338', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Icon size={20} color="#676879" />
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
}

function NewBoardModal({ boardType, onClose, onCreate }: {
  boardType: BoardType;
  onClose: () => void;
  onCreate: (name: string, type: BoardType) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const isMulti = boardType === 'MULTI_LEVEL';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), boardType);
    setLoading(false);
    onClose();
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: '32px 36px', width: 460, fontFamily: 'Roboto, sans-serif' }}
        onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ backgroundColor: isMulti ? '#A259FF' : '#0073EA', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isMulti ? <Layers size={22} color="#fff" /> : <Table2 size={22} color="#fff" />}
          </div>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 600, color: '#323338', margin: 0 }}>
              {isMulti ? 'New multi-level board' : 'New board'}
            </h3>
            <p style={{ fontSize: 14, color: '#676879', margin: 0 }}>
              {isMulti ? 'Board with sub-items for nested tracking' : 'Simple board to track your work'}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 500, color: '#323338', marginBottom: 8 }}>Board name</label>
          <input
            autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder={isMulti ? 'e.g. Product Roadmap' : 'e.g. Project Tracker'}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 16, color: '#323338', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = '#0073EA')}
            onBlur={e => (e.target.style.borderColor = '#D0D4E4')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #D0D4E4', background: '#fff', fontSize: 15, color: '#323338', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              style={{ padding: '10px 22px', borderRadius: 8, border: 'none', backgroundColor: !name.trim() || loading ? '#8DC8F8' : (isMulti ? '#A259FF' : '#0073EA'), color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Creating...' : 'Create board'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function TemplatePicker({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, type: BoardType) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function pick(tpl: typeof TEMPLATES[0]) {
    setLoading(tpl.name);
    await onCreate(tpl.name, tpl.type);
    setLoading(null);
    onClose();
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: '32px 36px', width: 560, fontFamily: 'Roboto, sans-serif' }}
        onMouseDown={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 19, fontWeight: 600, color: '#323338', margin: '0 0 6px' }}>Start with a template</h3>
        <p style={{ fontSize: 14, color: '#676879', margin: '0 0 22px' }}>Choose a template to get started quickly</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.name} onClick={() => pick(tpl)} disabled={!!loading}
              style={{ padding: '16px 18px', borderRadius: 10, border: '1px solid #D0D4E4', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#0073EA')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#D0D4E4')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ backgroundColor: tpl.type === 'MULTI_LEVEL' ? '#A259FF' : '#0073EA', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {tpl.type === 'MULTI_LEVEL' ? <Layers size={16} color="#fff" /> : <Table2 size={16} color="#fff" />}
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#323338' }}>
                  {loading === tpl.name ? 'Creating...' : tpl.name}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#676879', margin: 0 }}>{tpl.desc}</p>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={onClose}
            style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #D0D4E4', background: '#fff', fontSize: 15, color: '#323338', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const NAV_ITEMS = [
  { label: 'Home',    icon: Home,           href: '/dashboard' },
  { label: 'My work', icon: CheckSquare,    href: '/dashboard/my-work' },
  { label: 'Users',   icon: Users,          href: '/dashboard/users' },
  { label: 'More',    icon: MoreHorizontal, href: '/dashboard/more' },
];

const S = {
  sidebar:      { backgroundColor: '#F5F6F8', borderRight: '1px solid #D0D4E4' },
  logoWrap:     { borderBottom: '1px solid #D0D4E4' },
  navActive:    { backgroundColor: '#DCE9FC', color: '#0073EA', borderRadius: 6 },
  navDefault:   { color: '#323338', borderRadius: 6 },
  divider:      { borderTop: '1px solid #D0D4E4', margin: '4px 12px' },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: '#676879', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  wsBox:        { backgroundColor: '#ffffff', border: '1px solid #D0D4E4', borderRadius: 6 },
  wsAvatar:     { backgroundColor: '#0073EA', borderRadius: 4, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  plusBtn:      { backgroundColor: '#0073EA', borderRadius: 6, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, border: 'none', cursor: 'pointer' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [favOpen, setFavOpen] = useState(true);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [boards, setBoards] = useState<{ id: string; name: string; type: BoardType }[]>([]);
  const [modal, setModal] = useState<null | 'NORMAL' | 'MULTI_LEVEL' | 'TEMPLATE'>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    import('@/services/boards').then(({ boardsApi }) => {
      boardsApi.getAll().then(res => setBoards(res.data)).catch(() => {});
    });
  }, []);

  async function handleCreateBoard(name: string, type: BoardType) {
    const { boardsApi } = await import('@/services/boards');
    const res = await boardsApi.create(name, type);
    setBoards(prev => [...prev, res.data]);
    router.push(`/dashboard/board/${res.data.id}`);
  }

  return (
    <aside className="flex flex-col overflow-y-auto select-none" style={{ width: 260, minWidth: 260, height: '100vh', ...S.sidebar }}>

      {/* Logo */}
      <div style={{ ...S.logoWrap, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px' }}>
        <ZeonLogo size={38} showText={true} />
      </div>

      {/* Main nav */}
      <nav className="px-2 pt-3 pb-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link key={label} href={href}
              className="flex items-center gap-3 px-3 py-2.5 text-[16px] font-medium transition-colors hover:bg-[#ECEDF5]"
              style={active ? S.navActive : S.navDefault}>
              <Icon size={20} color={active ? '#0073EA' : '#676879'} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={S.divider} />

      {/* Zeon AI */}
      <div className="px-2 py-1">
        <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md hover:bg-[#ECEDF5] transition-colors"
          style={{ fontSize: 15, fontWeight: 500, color: '#676879', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Sparkles size={18} color="#0073EA" />
          Zeon AI
          <ChevronRight size={16} color="#676879" />
        </button>
      </div>

      {/* Favorites */}
      <div className="px-2 py-1">
        <button onClick={() => setFavOpen(v => !v)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-[#ECEDF5] transition-colors"
          style={{ ...S.sectionLabel, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={15} color="#676879" style={{ transform: favOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
          Favorites
        </button>
      </div>

      {/* Workspaces */}
      <div className="px-2 mt-1">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span style={S.sectionLabel}>Workspaces</span>
          <div className="flex items-center gap-2">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <MoreHorizontal size={18} color="#676879" />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <Search size={18} color="#676879" />
            </button>
          </div>
        </div>

        {/* Workspace selector */}
        <div className="flex items-center gap-2 mt-1 mb-2 px-1">
          <button className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 hover:bg-[#ECEDF5] transition-colors"
            style={{ ...S.wsBox, fontSize: 14, fontWeight: 500, color: '#323338', border: 'none', cursor: 'pointer' }}>
            <span style={S.wsAvatar}>M</span>
            <span className="truncate">Main workspac...</span>
            <ChevronRight size={15} color="#676879" style={{ marginLeft: 'auto', transform: 'rotate(90deg)' }} />
          </button>
          <button
            ref={plusBtnRef}
            onClick={() => anchorRect ? setAnchorRect(null) : setAnchorRect(plusBtnRef.current?.getBoundingClientRect() ?? null)}
            style={{ ...S.plusBtn, backgroundColor: anchorRect ? '#0060C0' : '#0073EA' }}
          >
            <Plus size={18} color="#fff" />
          </button>
        </div>

        {anchorRect && (
          <AddNewMenu anchorRect={anchorRect} onClose={() => setAnchorRect(null)}
            onSelect={(action) => { setAnchorRect(null); setModal(action); }} />
        )}
        {(modal === 'NORMAL' || modal === 'MULTI_LEVEL') && (
          <NewBoardModal boardType={modal} onClose={() => setModal(null)} onCreate={handleCreateBoard} />
        )}
        {modal === 'TEMPLATE' && (
          <TemplatePicker onClose={() => setModal(null)} onCreate={handleCreateBoard} />
        )}

        {/* Board list */}
        <div className="pb-4" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {boards.length === 0 && (
            <p style={{ fontSize: 14, color: '#C5C7D4', padding: '6px 12px' }}>No boards yet</p>
          )}
          {boards.map((board) => {
            const href = `/dashboard/board/${board.id}`;
            const active = pathname === href;
            const Icon = board.type === 'MULTI_LEVEL' ? Layers : Table2;
            return (
              <Link key={board.id} href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[15px] transition-colors hover:bg-[#ECEDF5]"
                style={active ? { ...S.navActive, fontWeight: 500 } : { color: '#323338', borderRadius: 6 }}>
                <Icon size={18} color={active ? '#0073EA' : '#676879'} />
                {board.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
