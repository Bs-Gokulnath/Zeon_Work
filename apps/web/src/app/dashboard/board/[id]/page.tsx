'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Plus, Search, Filter, ArrowUpDown,
  Table2, Loader2, Layers, MoreHorizontal, Trash2, Check,
  MapPin, Eye, Users, Star, FileText, X, Type, Hash,
  Calendar, ToggleLeft, Phone, Mail, AlertCircle,
} from 'lucide-react';
import type { Board } from '@/services/boards';
import { boardsApi } from '@/services/boards';
import type { BoardGroup, BoardItem } from '@/services/board-groups';
import { groupsApi } from '@/services/board-groups';

// ── Helpers ────────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const palette = ['#E2445C','#FDAB3D','#00C875','#0073EA','#A25DDC','#FF7575','#037F4C','#FF642E','#FF158A','#0086C0'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (months >= 12) return `${Math.floor(months / 12)}y ago`;
  if (months >= 1)  return `${months}mo ago`;
  if (days >= 1)    return `${days}d ago`;
  if (hours >= 1)   return `${hours}h ago`;
  if (mins >= 1)    return `${mins}m ago`;
  return 'just now';
}
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

// ── Color maps ─────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Critical':              { bg: '#E2445C', text: '#fff' },
  'Critical ⚠️️':          { bg: '#E2445C', text: '#fff' },
  'CIP HOT':               { bg: '#FF158A', text: '#fff' },
  'High':                  { bg: '#FDAB3D', text: '#fff' },
  'Medium':                { bg: '#1B6778', text: '#fff' },
  'Low':                   { bg: '#9ECFE8', text: '#323338' },
  'Work initiated Ongoing':{ bg: '#0073EA', text: '#fff' },
  '':                      { bg: '#E6E9EF', text: '#676879' },
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Identified':           { bg: '#C4C4C4', text: '#323338' },
  'Proposed':             { bg: '#FF7575', text: '#fff' },
  'Draft Sent':           { bg: '#FDAB3D', text: '#fff' },
  'Agreement Sent':       { bg: '#FF642E', text: '#fff' },
  'Signed Agreement':     { bg: '#037F4C', text: '#fff' },
  'Commissioned':         { bg: '#00C875', text: '#fff' },
  'Onboarded':            { bg: '#0073EA', text: '#fff' },
  'Franchisee - CPO':     { bg: '#A25DDC', text: '#fff' },
  'Electricity Provision':{ bg: '#0086C0', text: '#fff' },
  'Not Feasible':         { bg: '#E2445C', text: '#fff' },
  'Stuck':                { bg: '#E2445C', text: '#fff' },
  'Done':                 { bg: '#00C875', text: '#fff' },
  'Working on it':        { bg: '#FDAB3D', text: '#fff' },
  '':                     { bg: '#E6E9EF', text: '#676879' },
};
const INVESTMENT_COLORS: Record<string, { bg: string; text: string }> = {
  'Capex - Franchisee': { bg: '#00C875', text: '#fff' },
  'Capex -  Franchisee': { bg: '#00C875', text: '#fff' },
  'OPEX - Zeon':         { bg: '#E2445C', text: '#fff' },
  '':                    { bg: '#E6E9EF', text: '#676879' },
};
const GROUP_COLORS = ['#0073EA','#00C875','#FDAB3D','#E2445C','#A25DDC','#037F4C','#FF7575','#0086C0'];

// ── Column definitions ─────────────────────────────────────────────────────────
type ColKey = keyof BoardItem | '_owner' | '_files' | '_timeline' | '_lastUpdated' | '_creationLog' | string;
interface ColDef { key: ColKey; label: string; width: number; align?: string }

const BASE_COLS: ColDef[] = [
  { key: 'name',             label: 'Task',               width: 250 },
  { key: 'priority',         label: 'Priority',           width: 120 },
  { key: 'state',            label: 'State',              width: 130 },
  { key: 'city',             label: 'City',               width: 110 },
  { key: 'location',         label: 'Location',           width: 160 },
  { key: 'propertyType',     label: 'Property Type',      width: 220 },
  { key: 'googleRating',     label: 'Google Rating',      width: 110, align: 'center' },
  { key: 'noOfRatings',      label: 'No of Ratings',      width: 110, align: 'center' },
  { key: 'landOwnerContact', label: 'Land Owner Con...',  width: 140 },
  { key: 'phone',            label: 'Phone',              width: 150 },
  { key: 'email',            label: 'Email',              width: 170 },
  { key: 'powerAvailability',label: 'Power Availability', width: 140 },
  { key: '_owner',           label: 'Owner',              width: 80,  align: 'center' },
  { key: 'status',           label: 'Status',             width: 140 },
  { key: 'investment',       label: 'Investment',         width: 165 },
  { key: 'availableParking', label: 'Available Parking',  width: 150 },
  { key: '_files',           label: 'Files',              width: 80,  align: 'center' },
  { key: 'notes',            label: 'Notes',              width: 250 },
  { key: 'reminderDate',     label: 'Reminder Date',      width: 130 },
  { key: 'dueDate',          label: 'Due date',           width: 120 },
  { key: '_timeline',        label: 'Timeline',           width: 150 },
  { key: '_lastUpdated',     label: 'Last updated',       width: 155 },
  { key: '_creationLog',     label: 'Creation log',       width: 145 },
];

const CUSTOM_COL_TYPES = [
  { type: 'text',   label: 'Text',   icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date',   label: 'Date',   icon: Calendar },
  { type: 'status', label: 'Status', icon: ToggleLeft },
  { type: 'phone',  label: 'Phone',  icon: Phone },
  { type: 'email',  label: 'Email',  icon: Mail },
  { type: 'file',   label: 'Files',  icon: FileText },
];

// ── Pill dropdown ──────────────────────────────────────────────────────────────
function Pill({ value, colorMap, options, onChange, saving }: {
  value: string;
  colorMap: Record<string, { bg: string; text: string }>;
  options?: string[];
  onChange?: (v: string) => void;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const c = colorMap[value] ?? colorMap[''];
  const opts = options ?? Object.keys(colorMap);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => onChange && setOpen(v => !v)} style={{
        width: '100%', padding: '6px 4px', border: 'none',
        cursor: onChange ? 'pointer' : 'default',
        backgroundColor: c.bg, color: c.text, fontSize: 12, fontWeight: 500,
        fontFamily: 'inherit', textAlign: 'center',
        opacity: saving ? 0.6 : 1,
      }}>
        {value || '—'}
      </button>
      {open && onChange && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 300, backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.13)', overflow: 'hidden', minWidth: 190 }}
          onMouseLeave={() => setOpen(false)}>
          {opts.filter(o => o !== '').map(opt => {
            const oc = colorMap[opt] ?? colorMap[''];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: oc.bg, flexShrink: 0 }} />
                <span style={{ color: '#323338' }}>{opt}</span>
                {opt === value && <Check size={13} color="#0073EA" style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Owner avatar ───────────────────────────────────────────────────────────────
function OwnerAvatar({ name, size = 26 }: { name?: string; size?: number }) {
  if (!name) return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#E6E9EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Users size={size * 0.5} color="#C5C7D4" />
    </div>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', letterSpacing: 0.3, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

// ── Error toast ────────────────────────────────────────────────────────────────
function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#323338', color: '#fff', padding: '12px 18px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: 13, maxWidth: 380 }}>
      <AlertCircle size={16} color="#E2445C" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C5C7D4', display: 'flex', padding: 0 }}><X size={14} /></button>
    </div>
  );
}

// ── Add Column Modal ───────────────────────────────────────────────────────────
function AddColumnModal({ onClose, onAdd }: { onClose: () => void; onAdd: (col: ColDef) => void }) {
  const [colName, setColName] = useState('');
  const [colType, setColType] = useState('text');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }} onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '24px 28px', width: 380, fontFamily: 'Roboto, sans-serif', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323338', margin: 0 }}>Add column</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={18} color="#676879" /></button>
        </div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 6 }}>Column name</label>
        <input autoFocus value={colName} onChange={e => setColName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && colName.trim()) { onAdd({ key: `_custom_${Date.now()}`, label: colName.trim(), width: 140 }); onClose(); } }}
          placeholder="e.g. Contact name, Region..."
          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #D0D4E4', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 14 }}
          onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = '#D0D4E4')}
        />
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 8 }}>Column type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {CUSTOM_COL_TYPES.map(({ type, label, icon: Icon }) => (
            <button key={type} onClick={() => setColType(type)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, border: `1px solid ${colType === type ? '#0073EA' : '#D0D4E4'}`, backgroundColor: colType === type ? '#E5F0FF' : '#fff', cursor: 'pointer', fontSize: 13, color: colType === type ? '#0073EA' : '#323338', fontFamily: 'inherit', fontWeight: colType === type ? 600 : 400 }}>
              <Icon size={15} color={colType === type ? '#0073EA' : '#676879'} />{label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #D0D4E4', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => { if (colName.trim()) { onAdd({ key: `_custom_${Date.now()}`, label: colName.trim(), width: 140 }); onClose(); } }}
            disabled={!colName.trim()}
            style={{ padding: '8px 18px', borderRadius: 6, border: 'none', backgroundColor: !colName.trim() ? '#D0D4E4' : '#0073EA', color: '#fff', fontSize: 13, fontWeight: 600, cursor: !colName.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Add column
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Group Modal ────────────────────────────────────────────────────────────
function NewGroupModal({ colorIndex, onClose, onCreate }: {
  colorIndex: number; onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const color = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), color);
    setLoading(false);
    onClose();
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }} onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '28px 32px', width: 400, fontFamily: 'Roboto, sans-serif', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }} onMouseDown={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#323338', margin: '0 0 18px' }}>New group</h3>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#323338', marginBottom: 7 }}>Group name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. To-Do, In Progress, Done"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #D0D4E4', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = color)} onBlur={e => (e.target.style.borderColor = '#D0D4E4')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #D0D4E4', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={!name.trim() || loading}
              style={{ padding: '9px 20px', borderRadius: 6, border: 'none', backgroundColor: !name.trim() || loading ? '#D0D4E4' : color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Empty board state ──────────────────────────────────────────────────────────
function EmptyBoard({ onAddGroup }: { onAddGroup: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 40 }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: '#E5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Table2 size={36} color="#0073EA" strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#323338' }}>No groups yet</p>
        <p style={{ margin: 0, fontSize: 14, color: '#676879' }}>Create your first group to start adding tasks</p>
      </div>
      <button onClick={onAddGroup}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', backgroundColor: '#0073EA', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={16} /> Add new group
      </button>
    </div>
  );
}

// ── Group block ────────────────────────────────────────────────────────────────
function GroupBlock({ group, boardId, onUpdate, onDelete, cols, onError }: {
  group: BoardGroup; boardId: string;
  onUpdate: (g: BoardGroup) => void;
  onDelete: (id: string) => void;
  cols: ColDef[];
  onError: (msg: string) => void;
}) {
  const [collapsed, setCollapsed]   = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [items, setItems] = useState<BoardItem[]>(group.items);
  const [hoverRow, setHoverRow]     = useState<string | null>(null);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});

  // Local draft state: { [itemId]: { [field]: draftValue } }
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

  // Sync items when group prop changes (e.g. on reload)
  useEffect(() => { setItems(group.items); }, [group.items]);

  function getDraft(itemId: string, field: string, fallback: string) {
    return drafts[itemId]?.[field] ?? fallback;
  }
  function setDraft(itemId: string, field: string, value: string) {
    setDrafts(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } }));
  }
  function clearDraft(itemId: string, field: string) {
    setDrafts(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        const f = { ...next[itemId] };
        delete f[field];
        if (Object.keys(f).length === 0) delete next[itemId];
        else next[itemId] = f;
      }
      return next;
    });
  }

  // ── Save a single field on blur ──────────────────────────────────────────────
  async function commitField(itemId: string, field: string, original: string) {
    const draft = drafts[itemId]?.[field];
    if (draft === undefined) return;           // no change
    if (draft.trim() === original?.trim()) { clearDraft(itemId, field); return; }

    const saveKey = `${itemId}_${field}`;
    setSavingFields(p => ({ ...p, [saveKey]: true }));
    try {
      const res = await groupsApi.updateItem(boardId, group.id, itemId, { [field]: draft.trim() });
      const updated = items.map(it => it.id === itemId ? res.data : it);
      setItems(updated);
      onUpdate({ ...group, items: updated });
      clearDraft(itemId, field);
    } catch {
      onError(`Failed to save "${field}" for item. Please try again.`);
    } finally {
      setSavingFields(p => { const n = { ...p }; delete n[saveKey]; return n; });
    }
  }

  // ── Save a pill/dropdown value immediately ───────────────────────────────────
  async function saveField(itemId: string, data: Partial<BoardItem>) {
    const field = Object.keys(data)[0];
    const saveKey = `${itemId}_${field}`;
    setSavingFields(p => ({ ...p, [saveKey]: true }));
    try {
      const res = await groupsApi.updateItem(boardId, group.id, itemId, data);
      const updated = items.map(it => it.id === itemId ? res.data : it);
      setItems(updated);
      onUpdate({ ...group, items: updated });
    } catch {
      onError(`Failed to update item. Please try again.`);
    } finally {
      setSavingFields(p => { const n = { ...p }; delete n[saveKey]; return n; });
    }
  }

  // ── Add item ─────────────────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!newItemName.trim() || addingLoading) return;
    setAddingLoading(true);
    try {
      const res = await groupsApi.createItem(boardId, group.id, newItemName.trim());
      const updated = [...items, res.data];
      setItems(updated);
      onUpdate({ ...group, items: updated });
      setNewItemName('');
      setAddingItem(false);
    } catch {
      onError('Failed to add task. Please try again.');
    } finally {
      setAddingLoading(false);
    }
  }

  // ── Delete item ───────────────────────────────────────────────────────────────
  async function handleDeleteItem(itemId: string) {
    try {
      await groupsApi.deleteItem(boardId, group.id, itemId);
      const updated = items.filter(it => it.id !== itemId);
      setItems(updated);
      onUpdate({ ...group, items: updated });
    } catch {
      onError('Failed to delete task. Please try again.');
    }
  }

  // ── Aggregates ───────────────────────────────────────────────────────────────
  const ratingItems = items.filter(it => it.googleRating != null);
  const avgRating   = ratingItems.length > 0
    ? (ratingItems.reduce((s, it) => s + (it.googleRating ?? 0), 0) / ratingItems.length).toFixed(1)
    : null;
  const totalNoOfRatings = items.reduce((s, it) => s + (it.noOfRatings ?? 0), 0);
  const totalFiles = items.filter(it => it.notes).length;

  // ── Cell renderer ────────────────────────────────────────────────────────────
  function renderCell(item: BoardItem, col: ColDef) {
    const key = col.key as string;
    const isSaving = (field: string) => !!savingFields[`${item.id}_${field}`];

    // Text input (save on blur)
    const textInput = (field: keyof BoardItem, placeholder = '—') => {
      const val = getDraft(item.id, field, String((item as Record<string, unknown>)[field] ?? ''));
      return (
        <input
          value={val}
          placeholder={placeholder}
          onChange={e => setDraft(item.id, field, e.target.value)}
          onBlur={() => commitField(item.id, field, String((item as Record<string, unknown>)[field] ?? ''))}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={{
            width: '100%', border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: '#323338', fontFamily: 'inherit', padding: '8px 10px',
            opacity: isSaving(field) ? 0.5 : 1,
          }}
        />
      );
    };

    if (key === 'name') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {hoverRow === item.id && (
          <>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', color: '#C5C7D4', display: 'flex', flexShrink: 0 }}><Star size={12} /></button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#C5C7D4', display: 'flex', flexShrink: 0 }}><Users size={12} /></button>
          </>
        )}
        {textInput('name', 'Task name...')}
      </div>
    );

    if (key === 'priority')   return <Pill value={item.priority   || ''} colorMap={PRIORITY_COLORS}  options={Object.keys(PRIORITY_COLORS).filter(k=>k)} onChange={v => saveField(item.id, { priority: v })}   saving={isSaving('priority')} />;
    if (key === 'status')     return <Pill value={item.status     || ''} colorMap={STATUS_COLORS}     options={['Identified','Proposed','Draft Sent','Agreement Sent','Signed Agreement','Commissioned','Onboarded','Franchisee - CPO','Electricity Provision','Not Feasible','Stuck']}   onChange={v => saveField(item.id, { status: v })}     saving={isSaving('status')} />;
    if (key === 'investment') {
      const inv = item.investment?.trim() || '';
      const displayInv = inv === 'Capex -  Franchisee' ? 'Capex - Franchisee' : inv;
      return <Pill value={displayInv} colorMap={INVESTMENT_COLORS} options={['Capex - Franchisee','OPEX - Zeon']} onChange={v => saveField(item.id, { investment: v })} saving={isSaving('investment')} />;
    }

    if (key === 'state' || key === 'city' || key === 'landOwnerContact' || key === 'email' || key === 'powerAvailability')
      return textInput(key as keyof BoardItem);

    if (key === 'location') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px' }}>
        {item.location && <MapPin size={11} color="#676879" style={{ flexShrink: 0 }} />}
        {textInput('location')}
      </div>
    );

    if (key === 'propertyType') {
      const val = item.propertyType || '';
      return (
        <div style={{ padding: '6px 10px' }}>
          {val
            ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, backgroundColor: '#E8F4FF', color: '#0073EA', fontSize: 11.5, fontWeight: 500, border: '1px solid #C5DEFA', whiteSpace: 'nowrap' }}>{val}</span>
            : <span style={{ color: '#C5C7D4', fontSize: 13 }}>—</span>}
        </div>
      );
    }

    if (key === 'googleRating')  return <div style={{ padding: '8px 10px', textAlign: 'center', color: item.googleRating  != null ? '#323338' : '#C5C7D4', fontSize: 13 }}>{item.googleRating  != null ? item.googleRating  : '—'}</div>;
    if (key === 'noOfRatings')   return <div style={{ padding: '8px 10px', textAlign: 'center', color: item.noOfRatings   != null ? '#323338' : '#C5C7D4', fontSize: 13 }}>{item.noOfRatings   != null ? item.noOfRatings.toLocaleString()   : '—'}</div>;

    if (key === 'phone') return (
      <div style={{ padding: '8px 10px', fontSize: 13, whiteSpace: 'nowrap' }}>
        {item.phone ? <span style={{ color: '#0073EA' }}>🇮🇳 {item.phone}</span> : <span style={{ color: '#C5C7D4' }}>—</span>}
      </div>
    );

    if (key === '_owner') return (
      <div style={{ padding: '4px 10px', display: 'flex', justifyContent: 'center' }}>
        <OwnerAvatar name={item.owner} />
      </div>
    );

    if (key === 'availableParking') return (
      <div style={{ padding: '6px 10px' }}>
        {item.availableParking
          ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, backgroundColor: '#DCE9FC', color: '#0073EA', fontSize: 12, fontWeight: 500 }}>{item.availableParking}</span>
          : <span style={{ color: '#C5C7D4', fontSize: 13 }}>—</span>}
      </div>
    );

    if (key === '_files') return (
      <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'center' }}>
        {item.notes
          ? <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }} title="Has notes/files"><FileText size={18} color="#7B68EE" strokeWidth={1.5} /></button>
          : <span style={{ color: '#C5C7D4', fontSize: 12 }}>—</span>}
      </div>
    );

    if (key === 'notes') return (
      <div style={{ padding: '0 10px' }}>
        {textInput('notes', 'Add note...')}
      </div>
    );

    if (key === 'reminderDate' || key === 'dueDate') {
      const field = key as 'reminderDate' | 'dueDate';
      return (
        <div style={{ padding: '6px 10px' }}>
          <input type="date" value={item[field] || ''}
            onChange={e => saveField(item.id, { [field]: e.target.value })}
            style={{ border: '1px solid transparent', borderRadius: 4, padding: '3px 6px', fontSize: 12, color: item[field] ? '#323338' : '#C5C7D4', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'transparent', width: '100%', opacity: isSaving(field) ? 0.5 : 1 }}
            onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = 'transparent')}
          />
        </div>
      );
    }

    if (key === '_timeline') return (
      <div style={{ padding: '6px 10px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6E9EF', borderRadius: 12, padding: '4px 14px', fontSize: 12, color: '#676879', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
          {item.reminderDate && item.dueDate ? `${formatDate(item.reminderDate)} – ${formatDate(item.dueDate)}` : ' – '}
        </div>
      </div>
    );

    if (key === '_lastUpdated') return (
      <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <OwnerAvatar name={item.owner} size={22} />
        <span style={{ fontSize: 12, color: '#676879', whiteSpace: 'nowrap' }}>{timeAgo(item.updatedAt || item.createdAt)}</span>
      </div>
    );

    if (key === '_creationLog') return (
      <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <OwnerAvatar name={item.owner} size={22} />
        <span style={{ fontSize: 12, color: '#676879', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</span>
      </div>
    );

    if (key.startsWith('_custom_')) return (
      <input placeholder="—"
        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#323338', fontFamily: 'inherit', padding: '8px 10px' }} />
    );

    return <div style={{ padding: '8px 10px', color: '#C5C7D4', fontSize: 13 }}>—</div>;
  }

  const TOTAL_COLS = cols.length + 2;
  const googleRatingIdx = cols.findIndex(c => c.key === 'googleRating');
  const noOfRatingsIdx  = cols.findIndex(c => c.key === 'noOfRatings');
  const filesIdx        = cols.findIndex(c => c.key === '_files');

  return (
    <div style={{ marginBottom: 30 }}>
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0 8px 0' }}>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronRight size={15} color={group.color} /> : <ChevronDown size={15} color={group.color} />}
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.name}</span>
        <span style={{ fontSize: 12, color: '#AAAAAA' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <button onClick={() => onDelete(group.id)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', opacity: 0, display: 'flex', alignItems: 'center', padding: 4 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')} title="Delete group">
          <Trash2 size={13} color="#E2445C" />
        </button>
      </div>

      {!collapsed && (
        <div style={{ borderLeft: `3px solid ${group.color}` }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <colgroup>
              <col style={{ width: 42 }} />
              {cols.map(c => <col key={String(c.key)} style={{ width: c.width }} />)}
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 42, backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }} />
                {cols.map(c => (
                  <th key={String(c.key)} style={{ padding: '9px 10px', textAlign: (c.align ?? 'left') as 'left' | 'center', fontWeight: 500, color: '#676879', fontSize: 12.5, backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF' }} />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}
                  onMouseEnter={() => setHoverRow(item.id)} onMouseLeave={() => setHoverRow(null)}
                  style={{ backgroundColor: hoverRow === item.id ? '#F5F7FF' : '#fff', transition: 'background 0.1s' }}>
                  <td style={{ padding: '0 10px', textAlign: 'center', borderBottom: '1px solid #F0F1F7', borderRight: '1px solid #F0F1F7' }}>
                    <input type="checkbox" style={{ accentColor: group.color, width: 14, height: 14, cursor: 'pointer' }} />
                  </td>
                  {cols.map(col => (
                    <td key={String(col.key)} style={{ padding: 0, textAlign: (col.align ?? 'left') as 'left' | 'center', borderBottom: '1px solid #F0F1F7', borderRight: '1px solid #F0F1F7', verticalAlign: 'middle', maxWidth: col.width }}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  <td style={{ padding: '0 6px', textAlign: 'center', borderBottom: '1px solid #F0F1F7' }}>
                    {hoverRow === item.id && (
                      <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                        <Trash2 size={13} color="#E2445C" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Add task row */}
              {addingItem ? (
                <tr>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F1F7' }} />
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F1F7' }} colSpan={cols.length}>
                    <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); if (e.key === 'Escape') { setAddingItem(false); setNewItemName(''); } }}
                      placeholder="Task name... (Enter to save, Esc to cancel)"
                      style={{ width: '100%', border: '1px solid #0073EA', borderRadius: 4, padding: '6px 10px', outline: 'none', fontSize: 13, fontFamily: 'inherit', opacity: addingLoading ? 0.5 : 1 }}
                      disabled={addingLoading}
                    />
                  </td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #F0F1F7' }}>
                    <button onClick={() => { setAddingItem(false); setNewItemName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#676879' }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={TOTAL_COLS} style={{ padding: '6px 12px', borderBottom: '1px solid #F0F1F7' }}>
                    <button onClick={() => setAddingItem(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#676879', fontSize: 13, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.color = group.color)} onMouseLeave={e => (e.currentTarget.style.color = '#676879')}>
                      <Plus size={13} /> + Add task
                    </button>
                  </td>
                </tr>
              )}

              {/* Sum / aggregate row */}
              <tr style={{ backgroundColor: '#FAFBFC' }}>
                {Array.from({ length: TOTAL_COLS }).map((_, i) => {
                  const colIdx = i - 1;
                  if (colIdx === googleRatingIdx) return (
                    <td key={i} style={{ padding: '5px 10px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      {avgRating ? <><div style={{ fontSize: 12, fontWeight: 600, color: '#323338' }}>{avgRating}</div><div style={{ fontSize: 10, color: '#676879' }}>avg</div></> : <><div style={{ fontSize: 12, color: '#676879' }}>0</div><div style={{ fontSize: 10, color: '#676879' }}>sum</div></>}
                    </td>
                  );
                  if (colIdx === noOfRatingsIdx) return (
                    <td key={i} style={{ padding: '5px 10px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#323338' }}>{totalNoOfRatings.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: '#676879' }}>sum</div>
                    </td>
                  );
                  if (colIdx === filesIdx) return (
                    <td key={i} style={{ padding: '5px 10px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      <div style={{ fontSize: 12, color: '#676879' }}>{totalFiles}</div>
                      <div style={{ fontSize: 10, color: '#676879' }}>files</div>
                    </td>
                  );
                  return <td key={i} style={{ borderTop: '1px solid #E6E9EF', borderRight: i < TOTAL_COLS - 1 ? '1px solid #E6E9EF' : 'none' }} />;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Board Page ─────────────────────────────────────────────────────────────────
const VIEW_TABS = ['Main table', 'Map view', 'File gallery', 'Priority', 'Table'];

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board,  setBoard]  = useState<Board | null>(null);
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddCol,   setShowAddCol]   = useState(false);
  const [extraCols, setExtraCols] = useState<ColDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  const allCols = [...BASE_COLS, ...extraCols];

  // Sticky horizontal scrollbar
  const contentRef   = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const syncing      = useRef(false);
  const totalColWidth = 42 + allCols.reduce((s, c) => s + c.width, 0) + 36 + 48;

  const onContentScroll = useCallback(() => {
    if (syncing.current || !contentRef.current || !stickyBarRef.current) return;
    syncing.current = true;
    stickyBarRef.current.scrollLeft = contentRef.current.scrollLeft;
    syncing.current = false;
  }, []);
  const onStickyScroll = useCallback(() => {
    if (syncing.current || !contentRef.current || !stickyBarRef.current) return;
    syncing.current = true;
    contentRef.current.scrollLeft = stickyBarRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  // ── Load board + groups from DB ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([boardsApi.getOne(id), groupsApi.getAll(id)])
      .then(([boardRes, groupsRes]) => {
        setBoard(boardRes.data);
        setGroups(groupsRes.data);
      })
      .catch(() => setError('Failed to load board. Please refresh.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Create group → save to DB ────────────────────────────────────────────────
  async function handleCreateGroup(name: string, color: string) {
    setGroupLoading(true);
    try {
      const res = await groupsApi.create(id, name, color);
      setGroups(prev => [...prev, res.data]);
    } catch {
      setError('Failed to create group. Please try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  // ── Delete group → remove from DB ───────────────────────────────────────────
  async function handleDeleteGroup(groupId: string) {
    if (!window.confirm('Delete this group and all its tasks?')) return;
    try {
      await groupsApi.delete(id, groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch {
      setError('Failed to delete group. Please try again.');
    }
  }

  function handleUpdateGroup(updated: BoardGroup) {
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#676879', fontFamily: 'Roboto, sans-serif', gap: 12, fontSize: 15 }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading board...
    </div>
  );
  if (!board) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#676879', fontFamily: 'Roboto, sans-serif', fontSize: 15 }}>Board not found.</div>
  );

  const isMulti = board.type === 'MULTI_LEVEL';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Roboto, sans-serif', backgroundColor: '#fff' }}>

      {/* Board Header */}
      <div style={{ padding: '16px 24px 0', borderBottom: '1px solid #E6E9EF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ backgroundColor: isMulti ? '#A259FF' : '#0073EA', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isMulti ? <Layers size={17} color="#fff" /> : <Table2 size={17} color="#fff" />}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: 0 }}>{board.name}</h1>
          <ChevronDown size={16} color="#676879" />
        </div>
        <div style={{ display: 'flex' }}>
          {VIEW_TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} style={{ padding: '7px 13px', fontSize: 13, fontWeight: activeTab === i ? 600 : 400, color: activeTab === i ? '#0073EA' : '#676879', background: 'none', border: 'none', borderBottom: activeTab === i ? '3px solid #0073EA' : '3px solid transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              {tab}{i === 0 && <MoreHorizontal size={12} color="#C5C7D4" />}
            </button>
          ))}
          <button style={{ padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#676879', borderBottom: '3px solid transparent' }}><Plus size={13} /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '9px 24px', borderBottom: '1px solid #E6E9EF', flexShrink: 0 }}>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', marginRight: 6 }}>
          <button onClick={() => setShowNewGroup(true)} disabled={groupLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', backgroundColor: '#0073EA', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: groupLoading ? 0.7 : 1 }}>
            <Plus size={14} /> New task
          </button>
          <button style={{ display: 'flex', alignItems: 'center', padding: '7px 7px', backgroundColor: '#0073EA', color: '#fff', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <ChevronDown size={13} />
          </button>
        </div>
        {[
          { label: 'Search', icon: Search }, { label: 'Person', icon: Users },
          { label: 'Filter', icon: Filter }, { label: 'Sort',   icon: ArrowUpDown },
          { label: 'Hide',   icon: Eye },   { label: 'Group by', icon: MoreHorizontal },
        ].map(({ label, icon: Icon }) => (
          <button key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'none', border: 'none', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Icon size={14} /> {label}
          </button>
        ))}
        <button onClick={() => setShowAddCol(true)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'none', border: '1px dashed #D0D4E4', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0073EA'; (e.currentTarget as HTMLButtonElement).style.color = '#0073EA'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0D4E4'; (e.currentTarget as HTMLButtonElement).style.color = '#676879'; }}>
          <Plus size={13} /> Add column
        </button>
      </div>

      {/* Main content */}
      {groups.length === 0 ? (
        <EmptyBoard onAddGroup={() => setShowNewGroup(true)} />
      ) : (
        <>
          {/* Shared horizontal scroll container */}
          <div ref={contentRef} onScroll={onContentScroll} className="board-content"
            style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '14px 24px 8px' }}>
            <div style={{ minWidth: totalColWidth }}>
              {groups.map(group => (
                <GroupBlock key={group.id} group={group} boardId={id}
                  onUpdate={handleUpdateGroup} onDelete={handleDeleteGroup}
                  cols={allCols} onError={setError} />
              ))}
              <button onClick={() => setShowNewGroup(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'none', border: '1px dashed #D0D4E4', borderRadius: 6, cursor: 'pointer', color: '#676879', fontSize: 13, fontFamily: 'inherit', marginTop: 4, marginBottom: 16 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0073EA'; (e.currentTarget as HTMLButtonElement).style.color = '#0073EA'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0D4E4'; (e.currentTarget as HTMLButtonElement).style.color = '#676879'; }}>
                <Plus size={14} /> Add new group
              </button>
            </div>
          </div>

          {/* Sticky horizontal scrollbar */}
          <div ref={stickyBarRef} onScroll={onStickyScroll}
            style={{ overflowX: 'auto', overflowY: 'hidden', height: 14, flexShrink: 0, borderTop: '1px solid #E6E9EF', backgroundColor: '#fff' }}>
            <div style={{ width: totalColWidth, height: 1 }} />
          </div>
        </>
      )}

      {/* Modals */}
      {showNewGroup && <NewGroupModal colorIndex={groups.length} onClose={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />}
      {showAddCol   && <AddColumnModal onClose={() => setShowAddCol(false)} onAdd={col => setExtraCols(prev => [...prev, col])} />}

      {/* Error toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </div>
  );
}
