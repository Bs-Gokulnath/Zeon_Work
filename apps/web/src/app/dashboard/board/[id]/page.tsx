'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Plus, Search, Filter, ArrowUpDown,
  Table2, Loader2, Layers, MoreHorizontal, Trash2, Check,
  MapPin, Eye, Users, Star, FileText, X, Type, Hash,
  Calendar, ToggleLeft, Phone, Mail, AlertCircle, MessageCircle,
  AtSign, Paperclip, Smile, Sparkles, ThumbsUp, Reply, Video, Share2, AlignLeft,
  Settings, Copy, Pencil, Lock, ArrowLeftRight, ChevronsUpDown, LayoutGrid, Info, AlignJustify,
} from 'lucide-react';
import type { Board } from '@/services/boards';
import { boardsApi } from '@/services/boards';
import type { BoardGroup, BoardItem, ItemUpdate } from '@/services/board-groups';
import { groupsApi } from '@/services/board-groups';
import { usersApi } from '@/services/users';
import type { User } from '@/services/users';
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/ui/MapView'), { ssr: false });

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
  { key: 'name',             label: 'Task',               width: 320 },
  { key: 'priority',         label: 'Priority',           width: 150 },
  { key: 'state',            label: 'State',              width: 160 },
  { key: 'city',             label: 'City',               width: 140 },
  { key: 'location',         label: 'Location',           width: 200 },
  { key: 'propertyType',     label: 'Property Type',      width: 280 },
  { key: 'googleRating',     label: 'Google Rating',      width: 135, align: 'center' },
  { key: 'noOfRatings',      label: 'No of Ratings',      width: 135, align: 'center' },
  { key: 'landOwnerContact', label: 'Land Owner Con...',  width: 170 },
  { key: 'phone',            label: 'Phone',              width: 190 },
  { key: 'email',            label: 'Email',              width: 210 },
  { key: 'powerAvailability',label: 'Power Availability', width: 170 },
  { key: '_owner',           label: 'Owner',              width: 90,  align: 'center' },
  { key: 'status',           label: 'Status',             width: 175 },
  { key: 'investment',       label: 'Investment',         width: 200 },
  { key: 'availableParking', label: 'Available Parking',  width: 175 },
  { key: '_files',           label: 'Files',              width: 90,  align: 'center' },
  { key: 'notes',            label: 'Notes',              width: 300 },
  { key: 'reminderDate',     label: 'Reminder Date',      width: 155 },
  { key: 'dueDate',          label: 'Due date',           width: 145 },
  { key: '_timeline',        label: 'Timeline',           width: 185 },
  { key: '_lastUpdated',     label: 'Last updated',       width: 185 },
  { key: '_creationLog',     label: 'Creation log',       width: 175 },
];

// ── Map Popup ──────────────────────────────────────────────────────────────────
function MapPopup({ location, onClose }: { location: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const query = encodeURIComponent(location);
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik&marker=0,0&mlat=0&mlon=0&query=${query}#map=14/${query}`;
  // Use a search URL approach via iframe
  const embedUrl = `https://maps.google.com/maps?q=${query}&output=embed&z=14`;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', zIndex: 9999, top: '100%', left: 0,
        width: 320, background: '#fff', borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden',
        border: '1px solid #e0e0e0', marginTop: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: 12, color: '#323338', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} color="#0073EA" /> {location}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <X size={14} color="#676879" />
        </button>
      </div>
      <iframe
        src={embedUrl}
        width="320"
        height="200"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${query}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', textAlign: 'center', padding: '6px 0', fontSize: 11, color: '#0073EA', textDecoration: 'none', borderTop: '1px solid #f0f0f0' }}
      >
        Open in Google Maps ↗
      </a>
    </div>
  );
}

const COL_TYPE_GROUPS = [
  {
    label: 'Essentials',
    types: [
      { type: 'status',   label: 'Status',   icon: AlignLeft,    bg: '#00C875' },
      { type: 'dropdown', label: 'Dropdown', icon: ChevronDown,  bg: '#037F4C' },
      { type: 'text',     label: 'Text',     icon: Type,         bg: '#FDAB3D' },
      { type: 'date',     label: 'Date',     icon: Calendar,     bg: '#A25DDC' },
      { type: 'people',   label: 'People',   icon: Users,        bg: '#0073EA' },
      { type: 'number',   label: 'Numbers',  icon: Hash,         bg: '#FDAB3D' },
    ],
  },
  {
    label: 'Super useful',
    types: [
      { type: 'file',      label: 'Files',          icon: FileText,    bg: '#FF7575' },
      { type: 'checkbox',  label: 'Checkbox',       icon: Check,       bg: '#FF642E' },
      { type: 'doc',       label: 'monday Doc',     icon: FileText,    bg: '#E2445C' },
      { type: 'formula',   label: 'Formula',        icon: Sparkles,    bg: '#00C875' },
      { type: 'connect',   label: 'Connect boards', icon: Share2,      bg: '#E2445C' },
      { type: 'timeline',  label: 'Timeline',       icon: Calendar,    bg: '#A25DDC' },
      { type: 'phone',     label: 'Phone',          icon: Phone,       bg: '#0073EA' },
      { type: 'email',     label: 'Email',          icon: Mail,        bg: '#037F4C' },
    ],
  },
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
        width: '100%', padding: '9px 6px', border: 'none',
        cursor: onChange ? 'pointer' : 'default',
        backgroundColor: c.bg, color: c.text, fontSize: 14, fontWeight: 500,
        fontFamily: 'inherit', textAlign: 'center',
        opacity: saving ? 0.6 : 1,
      }}>
        {value || '—'}
      </button>
      {open && onChange && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 300, backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.13)', overflow: 'hidden', minWidth: 210 }}
          onMouseLeave={() => setOpen(false)}>
          {opts.filter(o => o !== '').map(opt => {
            const oc = colorMap[opt] ?? colorMap[''];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: oc.bg, flexShrink: 0 }} />
                <span style={{ color: '#323338' }}>{opt}</span>
                {opt === value && <Check size={14} color="#0073EA" style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Updates Panel ──────────────────────────────────────────────────────────────
function UpdatesPanel({ item, boardId, groupId, onClose, onCountChange }: {
  item: BoardItem; boardId: string; groupId: string;
  onClose: () => void; onCountChange: (itemId: string, count: number) => void;
}) {
  const [updates, setUpdates]       = useState<ItemUpdate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab]   = useState<'updates' | 'files' | 'activity'>('updates');
  const [replyTo, setReplyTo]       = useState<string | null>(null);
  const [replyText, setReplyText]   = useState('');
  const [moreOpen, setMoreOpen]     = useState(false);
  const [updateMore, setUpdateMore] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    groupsApi.getUpdates(boardId, groupId, item.id)
      .then(r => setUpdates(r.data))
      .finally(() => setLoading(false));
  }, [boardId, groupId, item.id]);

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const r = await groupsApi.createUpdate(boardId, groupId, item.id, text.trim());
      const next = [r.data, ...updates];
      setUpdates(next);
      onCountChange(item.id, next.length);
      setText('');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(updateId: string) {
    await groupsApi.deleteUpdate(boardId, groupId, item.id, updateId);
    const next = updates.filter(u => u.id !== updateId);
    setUpdates(next);
    onCountChange(item.id, next.length);
    setUpdateMore(null);
  }

  const TABS = [
    { key: 'updates',  label: `Updates${updates.length > 0 ? ` / ${updates.length}` : ''}` },
    { key: 'files',    label: 'Files' },
    { key: 'activity', label: 'Activity Log' },
  ] as const;

  const MORE_MENU = [
    { label: 'Export updates to Excel', icon: FileText },
    { label: 'Move to',                 icon: ChevronRight, arrow: true },
    { label: 'Copy task link',          icon: Share2 },
    null,
    { label: 'Archive',                 icon: FileText },
    { label: 'Delete',                  icon: Trash2, danger: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => { onClose(); setMoreOpen(false); setUpdateMore(null); }}
        style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.15)' }} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, zIndex: 500,
        backgroundColor: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column', fontFamily: 'Roboto, sans-serif' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #E6E9EF', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <X size={18} color="#676879" />
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 16, color: '#323338', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <OwnerAvatar name={item.owner} size={30} />
            {/* More button with dropdown */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMoreOpen(v => !v)}
                style={{ background: moreOpen ? '#E6E9EF' : 'none', border: moreOpen ? '1px solid #D0D4E4' : '1px solid transparent', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 6 }}
                onMouseEnter={e => { if (!moreOpen) e.currentTarget.style.backgroundColor = '#F0F1F7'; }}
                onMouseLeave={e => { if (!moreOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <MoreHorizontal size={18} color="#676879" />
              </button>
              {moreOpen && (
                <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 600, backgroundColor: '#fff',
                  border: '1px solid #D0D4E4', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
                  padding: '6px 0', minWidth: 230, fontFamily: 'inherit' }}
                  onMouseLeave={() => setMoreOpen(false)}>
                  {MORE_MENU.map((m, i) => {
                    if (!m) return <div key={i} style={{ borderTop: '1px solid #E6E9EF', margin: '4px 0' }} />;
                    const Icon = m.icon;
                    return (
                      <button key={m.label}
                        onClick={() => { if (m.label === 'Delete') { /* archive/delete item action */ } setMoreOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px',
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                          color: (m as { danger?: boolean }).danger ? '#E2445C' : '#323338', fontFamily: 'inherit', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <Icon size={16} color={(m as { danger?: boolean }).danger ? '#E2445C' : '#676879'} />
                        <span style={{ flex: 1 }}>{m.label}</span>
                        {(m as { arrow?: boolean }).arrow && <ChevronRight size={14} color="#C5C7D4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ padding: '8px 16px', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? '#0073EA' : '#676879', background: 'none', border: 'none',
                  borderBottom: activeTab === tab.key ? '3px solid #0073EA' : '3px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {tab.label}
              </button>
            ))}
            <button style={{ padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#676879', borderBottom: '3px solid transparent', display: 'flex', alignItems: 'center' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {activeTab !== 'updates' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C5C7D4', fontSize: 15 }}>
            No {activeTab === 'files' ? 'files' : 'activity'} yet
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid #E6E9EF', flexShrink: 0 }}>
              {[{ label: 'Update via email', Icon: Mail }, { label: 'Give feedback', Icon: Smile }].map(({ label, Icon }) => (
                <button key={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
                    border: '1px solid #D0D4E4', background: '#fff', fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                  <Icon size={14} color="#676879" /> {label}
                </button>
              ))}
            </div>

            {/* Write area */}
            <div style={{ margin: '14px 16px', border: '1px solid #D0D4E4', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Write an update and mention others with @"
                rows={3}
                style={{ width: '100%', padding: '12px 14px', border: 'none', outline: 'none', resize: 'none',
                  fontSize: 14, color: '#323338', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
              />
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderTop: '1px solid #E6E9EF', backgroundColor: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {([AtSign, Paperclip, Smile, Sparkles] as React.ElementType[]).map((Icon, i) => (
                    <button key={i}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px 6px', borderRadius: 5 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ECEDF5')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <Icon size={17} color="#676879" />
                    </button>
                  ))}
                  {/* GIF text button */}
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 5, fontSize: 13, fontWeight: 700, color: '#676879', fontFamily: 'inherit', letterSpacing: '0.02em' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ECEDF5')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    GIF
                  </button>
                </div>
                <button onClick={handleSubmit} disabled={!text.trim() || submitting}
                  style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 6, border: 'none',
                    backgroundColor: !text.trim() || submitting ? '#D0D4E4' : '#0073EA',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: !text.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>

            {/* Updates list */}
            <div style={{ flex: 1, padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Loader2 size={22} color="#C5C7D4" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : updates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#C5C7D4', fontSize: 14 }}>
                  No updates yet. Be the first to write one!
                </div>
              ) : updates.map(u => (
                <div key={u.id} style={{ borderRadius: 8, border: '1px solid #E6E9EF', overflow: 'visible' }}>

                  {/* Update header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
                    <OwnerAvatar name={u.author} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#323338' }}>{u.author}</div>
                      <div style={{ fontSize: 12, color: '#676879', marginTop: 1 }}>{formatDate(u.createdAt)}</div>
                    </div>
                    {/* 3 action icons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Edit icon */}
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 5 }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <FileText size={15} color="#676879" />
                      </button>
                      {/* Copy icon */}
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 5 }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        onClick={() => navigator.clipboard?.writeText(u.content)}>
                        <Share2 size={15} color="#676879" />
                      </button>
                      {/* More (...) with delete */}
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setUpdateMore(updateMore === u.id ? null : u.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 5 }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <MoreHorizontal size={15} color="#676879" />
                        </button>
                        {updateMore === u.id && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 600, backgroundColor: '#fff',
                            border: '1px solid #D0D4E4', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.13)',
                            padding: '6px 0', minWidth: 170 }}
                            onMouseLeave={() => setUpdateMore(null)}>
                            <button onClick={() => handleDelete(u.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px',
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#E2445C', fontFamily: 'inherit' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF0F2')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <Trash2 size={15} color="#E2445C" /> Delete update
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Update content */}
                  <div style={{ padding: '0 14px 10px', fontSize: 14, color: '#323338', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {u.content}
                  </div>

                  {/* View count */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#676879' }}>
                      <Eye size={13} color="#676879" /> 1
                    </span>
                  </div>

                  {/* Like / Reply bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 10px', borderTop: '1px solid #F0F1F7' }}>
                    <button
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'none', fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <ThumbsUp size={14} /> Like
                    </button>
                    <button onClick={() => setReplyTo(replyTo === u.id ? null : u.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'none', fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <Reply size={14} /> Reply
                    </button>
                  </div>

                  {/* Reply input with avatar */}
                  {replyTo === u.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 12px', borderTop: '1px solid #F0F1F7' }}>
                      <OwnerAvatar name={item.owner} size={30} />
                      <input value={replyText} onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a reply and mention others with @"
                        autoFocus
                        style={{ flex: 1, padding: '9px 14px', borderRadius: 20, border: '1px solid #D0D4E4', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = '#D0D4E4')}
                        onKeyDown={e => { if (e.key === 'Escape') { setReplyTo(null); setReplyText(''); } }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
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

// ── People cell ────────────────────────────────────────────────────────────────
function PeopleCell() {
  const [assigned, setAssigned] = useState<string[]>([]);
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const [muted, setMuted]       = useState(false);
  const [people, setPeople]     = useState<User[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    usersApi.getAll().then(setPeople).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setAssigned(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  }

  const assignedUsers = assigned.map(id => people.find(p => p.id === id)).filter(Boolean) as User[];

  return (
    <div ref={ref} style={{ position: 'relative', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
      {/* Cell display */}
      <div onClick={() => setOpen(p => !p)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: -4 }}>
        {assignedUsers.length === 0 ? (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0F1F7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #C5C7D4' }}>
            <Users size={13} color="#C5C7D4" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {assignedUsers.slice(0, 3).map((u, i) => (
              <div key={u.id} title={u.name} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: avatarColor(u.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', border: '2px solid #fff', marginLeft: i > 0 ? -8 : 0, zIndex: assignedUsers.length - i }}>
                {initials(u.name)}
              </div>
            ))}
            {assignedUsers.length > 3 && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6E9EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#676879', border: '2px solid #fff', marginLeft: -8 }}>
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #E6E9EF',
          width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #F0F1F7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D0D4E4', borderRadius: 8, padding: '6px 10px' }}>
              <Search size={14} color="#676879" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search names, roles or teams"
                style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, color: '#323338', background: 'transparent' }} />
            </div>
          </div>
          {/* Suggested people */}
          <div style={{ padding: '8px 0', maxHeight: 220, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#676879', padding: '0 12px 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested people</div>
            {filtered.map(p => (
              <div key={p.id} onClick={() => toggle(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', background: assigned.includes(p.id) ? '#F0F7FF' : 'transparent' }}
                onMouseEnter={e => { if (!assigned.includes(p.id)) (e.currentTarget as HTMLElement).style.background = '#F5F6F8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = assigned.includes(p.id) ? '#F0F7FF' : 'transparent'; }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: avatarColor(p.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#323338', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#676879' }}>{p.email}</div>
                </div>
                {assigned.includes(p.id) && <Check size={14} color="#0073EA" />}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: 13, color: '#676879', textAlign: 'center' }}>No results</div>
            )}
          </div>
          {/* Notification banner */}
          {assignedUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#EEF6FF', borderTop: '1px solid #E6E9EF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#323338' }}>
                <AlertCircle size={13} color="#0073EA" /> Assignees will be notified
              </div>
              <button onClick={() => setMuted(m => !m)}
                style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid #D0D4E4', background: muted ? '#E6E9EF' : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          )}
          {/* Auto-assign */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid #F0F1F7', cursor: 'pointer', fontSize: 13, color: '#323338', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Sparkles size={14} color="#0073EA" /> Auto-assign people
          </div>
        </div>
      )}
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
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ type: string; label: string; bg: string } | null>(null);
  const [colName, setColName] = useState('');
  const allTypes = COL_TYPE_GROUPS.flatMap(g => g.types);
  const filtered = search.trim()
    ? allTypes.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  function handleAdd() {
    const name = colName.trim() || selected?.label || 'Column';
    const prefix = selected?.type === 'people' ? '_people_' : '_custom_';
    const width  = selected?.type === 'people' ? 120 : 150;
    onAdd({ key: `${prefix}${Date.now()}`, label: name, width, align: selected?.type === 'people' ? 'center' : undefined });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }} onMouseDown={onClose}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, width: 400, fontFamily: 'Roboto, sans-serif', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }} onMouseDown={e => e.stopPropagation()}>

        {selected ? (
          /* ── Step 2: Name input ── */
          <div style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#676879', padding: 4 }}>
                <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: selected.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => { const t = allTypes.find(x => x.type === selected.type); return t ? <t.icon size={18} color="#fff" /> : null; })()}
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#323338' }}>{selected.label}</span>
            </div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 6 }}>Column name</label>
            <input autoFocus value={colName} onChange={e => setColName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={selected.label}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 20 }}
              onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = '#D0D4E4')} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #D0D4E4', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleAdd} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0073EA', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Create column
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 1: Type picker ── */
          <>
            {/* Search */}
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #0073EA', borderRadius: 8, padding: '8px 12px' }}>
                <Search size={16} color="#676879" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search or describe your column"
                  style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', flex: 1, color: '#323338', background: 'transparent' }} />
              </div>
            </div>
            {/* Type list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {(filtered ? [{ label: 'Results', types: filtered }] : COL_TYPE_GROUPS).map(group => (
                <div key={group.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#676879', fontWeight: 500, marginBottom: 8, padding: '0 4px' }}>{group.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {group.types.map(({ type, label, icon: Icon, bg }) => (
                      <button key={type} onClick={() => { setSelected({ type, label, bg }); setColName(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={17} color="#fff" />
                        </div>
                        <span style={{ fontSize: 14, color: '#323338' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filtered && filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: '#676879', fontSize: 13, padding: '24px 0' }}>No columns found</div>
              )}
            </div>
            {/* More columns */}
            <div style={{ borderTop: '1px solid #E6E9EF', padding: '14px 16px', textAlign: 'center' }}>
              <button style={{ background: 'none', border: 'none', fontSize: 14, color: '#323338', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0073EA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#323338')}>
                More columns
              </button>
            </div>
          </>
        )}
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

// ── Column header with context menu ───────────────────────────────────────────
const COL_QUICK_TYPES = [
  { type: 'status',   label: 'Status',   icon: AlignLeft, bg: '#00C875' },
  { type: 'text',     label: 'Text',     icon: Type,      bg: '#FDAB3D' },
  { type: 'people',   label: 'People',   icon: Users,     bg: '#0073EA' },
  { type: 'timeline', label: 'Timeline', icon: AlignJustify, bg: '#A25DDC' },
  { type: 'date',     label: 'Date',     icon: Calendar,  bg: '#A25DDC' },
  { type: 'number',   label: 'Numbers',  icon: Hash,      bg: '#FDAB3D' },
];

function ColHeaderTh({ col, isCustom, onRename, onDelete, onDuplicate, onAddRight }: {
  col: ColDef;
  isCustom?: boolean;
  onRename?: (newLabel: string) => void;
  onDelete?: () => void;
  onDuplicate?: (withValues: boolean) => void;
  onAddRight?: (afterKey: string, type: string, label: string) => void;
}) {
  const [hovered,       setHovered]       = useState(false);
  const [menuOpen,      setMenuOpen]       = useState(false);
  const [activeSubmenu, setActiveSubmenu]  = useState<string | null>(null);
  const [renaming,      setRenaming]       = useState(false);
  const [renameVal,     setRenameVal]      = useState(col.label);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setRenameVal(col.label); }, [col.label]);

  useEffect(() => {
    if (!menuOpen) return;
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setActiveSubmenu(null);
      }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  const close = () => { setMenuOpen(false); setActiveSubmenu(null); };

  // ── Submenu panels ────────────────────────────────────────────────────────
  const SubItem = ({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean }) => (
    <div onClick={onClick}
      style={{ padding: '10px 16px', fontSize: 14, cursor: disabled ? 'default' : 'pointer', color: disabled ? '#C5C7D4' : danger ? '#E2445C' : '#323338' }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = '#F5F6F8'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      {children}
    </div>
  );

  const submenus: Record<string, React.ReactNode> = {
    settings: (
      <div style={{ minWidth: 270, padding: '6px 0' }}>
        <SubItem><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Info size={15} color="#676879" /><span>Customize <strong>{col.label}</strong> column</span></div></SubItem>
        <SubItem><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AlignJustify size={15} color="#676879" /><span>Add description</span></div></SubItem>
        <div style={{ height: 1, background: '#F0F1F7', margin: '4px 0' }} />
        <SubItem><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Lock size={15} color="#676879" /><span>Restrict column editing</span></div></SubItem>
        <SubItem><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Eye size={15} color="#676879" /><span>Restrict column view</span></div></SubItem>
        <div style={{ height: 1, background: '#F0F1F7', margin: '4px 0' }} />
        <SubItem disabled><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Star size={15} color="#C5C7D4" /><span>Save column as a template</span></div></SubItem>
      </div>
    ),
    sort: (
      <div style={{ minWidth: 230, padding: '6px 0' }}>
        <SubItem><span style={{ fontSize: 14, color: '#323338' }}>Sort column</span></SubItem>
        <SubItem disabled>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Add subsort</span><span style={{ fontSize: 12, color: '#C5C7D4' }}>⌘ Click</span>
          </div>
        </SubItem>
        <SubItem disabled>Save order of items</SubItem>
      </div>
    ),
    duplicate: (
      <div style={{ minWidth: 210, padding: '6px 0' }}>
        <SubItem onClick={() => { onDuplicate?.(false); close(); }}>Column only</SubItem>
        <SubItem onClick={() => { onDuplicate?.(true); close(); }}>Column and cell values</SubItem>
      </div>
    ),
    addRight: (
      <div style={{ minWidth: 200, padding: '6px 0' }}>
        {COL_QUICK_TYPES.map(t => (
          <div key={t.type} onClick={() => { onAddRight?.(String(col.key), t.type, t.label); close(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 14, color: '#323338' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <t.icon size={15} color="#fff" />
            </div>
            {t.label}
          </div>
        ))}
        <div style={{ height: 1, background: '#F0F1F7', margin: '4px 0' }} />
        <SubItem>More columns</SubItem>
      </div>
    ),
    changeType: (
      <div style={{ minWidth: 230, padding: '6px 0' }}>
        <div style={{ padding: '8px 16px 10px', fontSize: 13, color: '#676879' }}>
          Change <strong style={{ color: '#323338' }}>{col.label}</strong> column to:
        </div>
        {COL_QUICK_TYPES.map(t => (
          <div key={t.type} onClick={() => close()}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 14, color: '#323338' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <t.icon size={15} color="#fff" />
            </div>
            {t.label}
          </div>
        ))}
      </div>
    ),
  };

  // ── Menu rows ─────────────────────────────────────────────────────────────
  type MenuRow = { key: string; icon: React.ReactNode; label: string; chevron?: boolean; disabled?: boolean; danger?: boolean; action?: () => void; submenu?: string };
  const sections: MenuRow[][] = [
    [{ key: 'settings', icon: <Settings size={15} />, label: 'Settings', chevron: true, submenu: 'settings' }],
    [
      { key: 'filter',   icon: <Filter size={15} />,          label: 'Filter'   },
      { key: 'sort',     icon: <ArrowUpDown size={15} />,     label: 'Sort',     chevron: true, submenu: 'sort' },
      { key: 'collapse', icon: <ChevronsUpDown size={15} />,  label: 'Collapse' },
      { key: 'groupby',  icon: <LayoutGrid size={15} />,      label: 'Group by' },
    ],
    [
      { key: 'duplicate',   icon: <Copy size={15} />,         label: 'Duplicate column',       chevron: true, submenu: 'duplicate' },
      { key: 'addRight',    icon: <Plus size={15} />,         label: 'Add column to the right', chevron: true, submenu: 'addRight' },
      { key: 'changeType',  icon: <ArrowLeftRight size={15} />, label: 'Change column type',   chevron: true, submenu: 'changeType' },
    ],
    [{ key: 'extensions', icon: <Layers size={15} />, label: 'Column extensions', chevron: true, disabled: true }],
    [
      { key: 'rename', icon: <Pencil size={15} />, label: 'Rename', action: () => { close(); setRenaming(true); } },
      { key: 'delete', icon: <Trash2 size={15} />, label: 'Delete', danger: true, action: () => { onDelete?.(); close(); } },
    ],
  ];

  return (
    <th onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: 0, textAlign: (col.align ?? 'left') as 'left'|'center', fontWeight: 500, color: '#676879', fontSize: 14, backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF', whiteSpace: 'nowrap', userSelect: 'none', position: 'relative' }}>
      {/* Header label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '11px 12px', justifyContent: col.align === 'center' ? 'center' : 'flex-start' }}>
        {renaming ? (
          <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
            onBlur={() => { if (renameVal.trim()) onRename?.(renameVal.trim()); setRenaming(false); }}
            onKeyDown={e => { if (e.key === 'Enter' && renameVal.trim()) { onRename?.(renameVal.trim()); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }}
            style={{ border: 'none', outline: '2px solid #0073EA', borderRadius: 4, padding: '2px 6px', fontSize: 14, fontFamily: 'inherit', color: '#323338', width: Math.max(60, renameVal.length * 9) }} />
        ) : <span>{col.label}</span>}
        {hovered && !renaming && (
          <button onClick={e => { e.stopPropagation(); setMenuOpen(p => !p); if (menuOpen) setActiveSubmenu(null); }}
            style={{ marginLeft: 4, background: menuOpen ? '#E6E9EF' : 'none', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', color: '#676879' }}>
            <MoreHorizontal size={15} />
          </button>
        )}
      </div>

      {/* Main context menu */}
      {menuOpen && (
        <div ref={menuRef} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 3000, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #E6E9EF', minWidth: 260, overflow: 'visible' }} onClick={e => e.stopPropagation()}>
          {sections.filter(s => s.length > 0).map((section, si) => (
            <div key={si}>
              {si > 0 && <div style={{ height: 1, background: '#F0F1F7' }} />}
              {section.map(row => (
                <div key={row.key}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: row.disabled ? 'default' : 'pointer', fontSize: 14, background: activeSubmenu === row.key ? '#F5F6F8' : 'transparent', color: row.disabled ? '#C5C7D4' : row.danger ? '#E2445C' : '#323338' }}
                  onMouseEnter={() => { setActiveSubmenu(row.submenu ?? null); if (!row.submenu && !row.action) setActiveSubmenu(null); }}
                  onClick={() => { if (!row.disabled && row.action) row.action(); }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ opacity: row.disabled ? 0.4 : 1, display: 'flex' }}>{row.icon}</span>
                    {row.label}
                  </span>
                  {row.chevron && <ChevronRight size={14} color={row.disabled ? '#C5C7D4' : '#9aacbb'} />}
                  {/* Submenu panel */}
                  {activeSubmenu === row.key && row.submenu && submenus[row.submenu] && (
                    <div style={{ position: 'absolute', top: 0, right: '100%', marginRight: 4, zIndex: 3001, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #E6E9EF', overflow: 'hidden' }}>
                      {submenus[row.submenu]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </th>
  );
}

// ── Group block ────────────────────────────────────────────────────────────────
interface SortConfig { field: string; dir: 'asc' | 'desc' }
interface FilterConfig { id: string; field: string; condition: string; value: string }

const FILTER_CONDITIONS = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'equals',       label: 'is' },
  { value: 'not_equals',   label: 'is not' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

function applyFilters(items: BoardItem[], filters: FilterConfig[]): BoardItem[] {
  const active = filters.filter(f => f.field);
  if (!active.length) return items;
  return items.filter(item => active.every(f => {
    const raw = (item as unknown as Record<string, unknown>)[f.field];
    const val = raw != null ? String(raw).toLowerCase() : '';
    const fval = f.value.toLowerCase();
    switch (f.condition) {
      case 'contains':     return val.includes(fval);
      case 'not_contains': return !val.includes(fval);
      case 'equals':       return val === fval;
      case 'not_equals':   return val !== fval;
      case 'is_empty':     return val === '';
      case 'is_not_empty': return val !== '';
      default: return true;
    }
  }));
}

function sortItems(items: BoardItem[], sorts: SortConfig[]): BoardItem[] {
  if (!sorts.length) return items;
  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      const an = av == null ? '' : String(av).toLowerCase();
      const bn = bv == null ? '' : String(bv).toLowerCase();
      const num_a = parseFloat(an), num_b = parseFloat(bn);
      const cmp = (!isNaN(num_a) && !isNaN(num_b)) ? num_a - num_b : an.localeCompare(bn);
      if (cmp !== 0) return sort.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function GroupBlock({ group, boardId, onUpdate, onDelete, cols, onError, onOpenUpdates, sortConfigs, filterConfigs, readOnly, onRenameCol, onDeleteCol, onDuplicateCol }: {
  group: BoardGroup; boardId: string;
  onUpdate: (g: BoardGroup) => void;
  onDelete: (id: string) => void;
  cols: ColDef[];
  onError: (msg: string) => void;
  onOpenUpdates: (item: BoardItem, groupId: string) => void;
  sortConfigs?: SortConfig[];
  filterConfigs?: FilterConfig[];
  readOnly?: boolean;
  onRenameCol?: (key: string, newLabel: string) => void;
  onDeleteCol?: (key: string) => void;
  onDuplicateCol?: (col: ColDef, withValues: boolean) => void;
  onAddColRight?: (afterKey: string, type: string, label: string) => void;
}) {
  const [collapsed, setCollapsed]   = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [items, setItems] = useState<BoardItem[]>(group.items);
  const [hoverRow, setHoverRow]         = useState<string | null>(null);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [focusedCell, setFocusedCell]   = useState<{ itemId: string; field: string } | null>(null);
  const [mapPopupItemId, setMapPopupItemId] = useState<string | null>(null);

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

  // ── Save a numeric field on blur ─────────────────────────────────────────────
  async function commitNumericField(itemId: string, field: 'googleRating' | 'noOfRatings', original: number | null | undefined) {
    const draft = drafts[itemId]?.[field];
    if (draft === undefined) return;
    const parsed = field === 'noOfRatings' ? parseInt(draft) : parseFloat(draft);
    const originalStr = original != null ? String(original) : '';
    if (draft.trim() === originalStr || (draft.trim() === '' && original == null)) { clearDraft(itemId, field); return; }
    if (draft.trim() !== '' && isNaN(parsed)) { clearDraft(itemId, field); return; } // invalid number, revert

    const saveKey = `${itemId}_${field}`;
    setSavingFields(p => ({ ...p, [saveKey]: true }));
    try {
      const value = draft.trim() === '' ? undefined : parsed;
      const res = await groupsApi.updateItem(boardId, group.id, itemId, { [field]: value } as Partial<BoardItem>);
      const updated = items.map(it => it.id === itemId ? res.data : it);
      setItems(updated);
      onUpdate({ ...group, items: updated });
      clearDraft(itemId, field);
    } catch {
      onError(`Failed to save "${field}". Please try again.`);
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
    const isSaving  = (field: string) => !!savingFields[`${item.id}_${field}`];
    const isFocused = (field: string) => focusedCell?.itemId === item.id && focusedCell?.field === field;

    // Editable text cell — shows X (clear) + emoji icon when focused
    const editCell = (field: keyof BoardItem, opts: { placeholder?: string; prefix?: React.ReactNode; type?: string; align?: string } = {}) => {
      const rawVal = (item as unknown as Record<string, unknown>)[field];
      const val = getDraft(item.id, field, rawVal != null ? String(rawVal) : '');
      const focused = isFocused(field as string);
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          {opts.prefix && <span style={{ paddingLeft: 12, flexShrink: 0, fontSize: 13 }}>{opts.prefix}</span>}
          <input
            type={opts.type ?? 'text'}
            value={val}
            placeholder={opts.placeholder ?? '—'}
            onChange={e => setDraft(item.id, field, e.target.value)}
            onFocus={() => setFocusedCell({ itemId: item.id, field: field as string })}
            onBlur={() => {
              setFocusedCell(null);
              commitField(item.id, field, rawVal != null ? String(rawVal) : '');
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { clearDraft(item.id, field); (e.target as HTMLInputElement).blur(); } }}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 15, color: '#323338', fontFamily: 'inherit',
              padding: opts.prefix ? '10px 60px 10px 6px' : '10px 60px 10px 12px',
              textAlign: (opts.align as 'left' | 'center') ?? 'left',
              opacity: isSaving(field as string) ? 0.5 : 1,
              minWidth: 0,
            }}
          />
          {focused && (
            <div style={{ position: 'absolute', right: 4, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#fff', borderRadius: 4, padding: '0 2px' }}>
              {val && (
                <button onMouseDown={e => { e.preventDefault(); setDraft(item.id, field, ''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '3px 4px', borderRadius: 4, color: '#676879' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <X size={13} color="#676879" />
                </button>
              )}
              <button onMouseDown={e => e.preventDefault()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '3px 4px', borderRadius: 4, fontSize: 13 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                😊
              </button>
            </div>
          )}
        </div>
      );
    };

    // Numeric editable cell
    const numCell = (field: 'googleRating' | 'noOfRatings') => {
      const rawVal = (item as unknown as Record<string, unknown>)[field] as number | null | undefined;
      const val = getDraft(item.id, field, rawVal != null ? String(rawVal) : '');
      const focused = isFocused(field);
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          <input
            type="text" inputMode="decimal" value={val}
            placeholder="—"
            onChange={e => setDraft(item.id, field, e.target.value)}
            onFocus={() => setFocusedCell({ itemId: item.id, field })}
            onBlur={() => { setFocusedCell(null); commitNumericField(item.id, field, rawVal); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { clearDraft(item.id, field); (e.target as HTMLInputElement).blur(); } }}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 15, color: '#323338', fontFamily: 'inherit',
              padding: '10px 56px 10px 12px', textAlign: 'center',
              opacity: isSaving(field) ? 0.5 : 1, minWidth: 0,
            }}
          />
          {focused && (
            <div style={{ position: 'absolute', right: 4, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#fff', borderRadius: 4 }}>
              {val && (
                <button onMouseDown={e => { e.preventDefault(); setDraft(item.id, field, ''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '3px 4px', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <X size={13} color="#676879" />
                </button>
              )}
              <button onMouseDown={e => e.preventDefault()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '3px 4px', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F1F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                😊
              </button>
            </div>
          )}
        </div>
      );
    };

    if (key === 'name') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {hoverRow === item.id && (
          <>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', color: '#C5C7D4', display: 'flex', flexShrink: 0 }}><Star size={14} /></button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#C5C7D4', display: 'flex', flexShrink: 0 }}><Users size={14} /></button>
          </>
        )}
        {editCell('name', { placeholder: 'Task name...' })}
      </div>
    );

    if (key === 'priority')   return <Pill value={item.priority   || ''} colorMap={PRIORITY_COLORS}  options={Object.keys(PRIORITY_COLORS).filter(k=>k)} onChange={v => saveField(item.id, { priority: v })}   saving={isSaving('priority')} />;
    if (key === 'status')     return <Pill value={item.status     || ''} colorMap={STATUS_COLORS}     options={['Identified','Proposed','Draft Sent','Agreement Sent','Signed Agreement','Commissioned','Onboarded','Franchisee - CPO','Electricity Provision','Not Feasible','Stuck']}   onChange={v => saveField(item.id, { status: v })}     saving={isSaving('status')} />;
    if (key === 'investment') {
      const inv = item.investment?.trim() || '';
      const displayInv = inv === 'Capex -  Franchisee' ? 'Capex - Franchisee' : inv;
      return <Pill value={displayInv} colorMap={INVESTMENT_COLORS} options={['Capex - Franchisee','OPEX - Zeon']} onChange={v => saveField(item.id, { investment: v })} saving={isSaving('investment')} />;
    }

    if (key === 'state')            return editCell('state');
    if (key === 'city')             return editCell('city');
    if (key === 'landOwnerContact') return editCell('landOwnerContact');
    if (key === 'email')            return editCell('email', { placeholder: 'email@example.com' });
    if (key === 'powerAvailability') return editCell('powerAvailability');
    if (key === 'propertyType')     return editCell('propertyType');
    if (key === 'availableParking') return editCell('availableParking', { placeholder: 'e.g. 10 bays' });
    if (key === 'notes')            return editCell('notes', { placeholder: 'Add note...' });

    if (key === 'location') return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
        <span
          style={{ paddingLeft: 12, flexShrink: 0, cursor: item.location ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}
          onClick={e => { e.stopPropagation(); if (item.location) setMapPopupItemId(mapPopupItemId === item.id ? null : item.id); }}
          title={item.location ? 'View on map' : undefined}
        >
          {item.location ? <MapPin size={13} color={mapPopupItemId === item.id ? '#0073EA' : '#676879'} /> : null}
        </span>
        {editCell('location', { placeholder: 'Location...' })}
        {mapPopupItemId === item.id && item.location && (
          <MapPopup location={item.location} onClose={() => setMapPopupItemId(null)} />
        )}
      </div>
    );

    if (key === 'phone') return editCell('phone', { prefix: item.phone ? '🇮🇳' : undefined, placeholder: 'Phone number...' });

    if (key === 'googleRating')  return numCell('googleRating');
    if (key === 'noOfRatings')   return numCell('noOfRatings');

    if (key === '_owner') return (
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'center' }}>
        <OwnerAvatar name={item.owner} size={30} />
      </div>
    );

    if (key === '_files') return (
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'center' }}>
        {item.notes
          ? <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }} title="Has notes/files"><FileText size={22} color="#7B68EE" strokeWidth={1.5} /></button>
          : <span style={{ color: '#C5C7D4', fontSize: 15 }}>—</span>}
      </div>
    );

    if (key === 'reminderDate' || key === 'dueDate') {
      const field = key as 'reminderDate' | 'dueDate';
      return (
        <div style={{ padding: '8px 12px' }}>
          <input type="date" value={item[field] || ''}
            onChange={e => saveField(item.id, { [field]: e.target.value })}
            style={{ border: '1px solid transparent', borderRadius: 4, padding: '4px 8px', fontSize: 14, color: item[field] ? '#323338' : '#C5C7D4', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'transparent', width: '100%', opacity: isSaving(field) ? 0.5 : 1 }}
            onFocus={e => (e.target.style.borderColor = '#0073EA')} onBlur={e => (e.target.style.borderColor = 'transparent')}
          />
        </div>
      );
    }

    if (key === '_timeline') return (
      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6E9EF', borderRadius: 12, padding: '6px 16px', fontSize: 13, color: '#676879', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
          {item.reminderDate && item.dueDate ? `${formatDate(item.reminderDate)} – ${formatDate(item.dueDate)}` : ' – '}
        </div>
      </div>
    );

    if (key === '_lastUpdated') return (
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <OwnerAvatar name={item.owner} size={26} />
        <span style={{ fontSize: 13, color: '#676879', whiteSpace: 'nowrap' }}>{timeAgo(item.updatedAt || item.createdAt)}</span>
      </div>
    );

    if (key === '_creationLog') return (
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <OwnerAvatar name={item.owner} size={26} />
        <span style={{ fontSize: 13, color: '#676879', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</span>
      </div>
    );

    if (key.startsWith('_people_')) return <PeopleCell />;

    if (key.startsWith('_custom_')) return (
      <input placeholder="—"
        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: '#323338', fontFamily: 'inherit', padding: '10px 12px' }} />
    );

    return <div style={{ padding: '10px 12px', color: '#C5C7D4', fontSize: 15 }}>—</div>;
  }

  const TOTAL_COLS = cols.length + 2;
  const googleRatingIdx = cols.findIndex(c => c.key === 'googleRating');
  const noOfRatingsIdx  = cols.findIndex(c => c.key === 'noOfRatings');
  const filesIdx        = cols.findIndex(c => c.key === '_files');

  return (
    <div style={{ marginBottom: 30 }}>
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 10px 0' }}>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronRight size={17} color={group.color} /> : <ChevronDown size={17} color={group.color} />}
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: group.color }}>{group.name}</span>
        <span style={{ fontSize: 14, color: '#AAAAAA' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <button onClick={() => onDelete(group.id)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', opacity: 0, display: 'flex', alignItems: 'center', padding: 4 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')} title="Delete group">
          <Trash2 size={15} color="#E2445C" />
        </button>
      </div>

      {!collapsed && (
        <div style={{ borderLeft: `3px solid ${group.color}` }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 15 }}>
            <colgroup>
              <col style={{ width: 64 }} />
              {cols.map(c => <col key={String(c.key)} style={{ width: c.width }} />)}
              <col style={{ width: 42 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 64, backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }} />
                {cols.map(c => (
                  <ColHeaderTh key={String(c.key)} col={c}
                    isCustom={String(c.key).startsWith('_custom_') || String(c.key).startsWith('_people_')}
                    onRename={lbl => onRenameCol?.(String(c.key), lbl)}
                    onDelete={() => onDeleteCol?.(String(c.key))}
                    onDuplicate={(withValues) => onDuplicateCol?.(c, withValues)}
                    onAddRight={(afterKey, type, label) => onAddColRight?.(afterKey, type, label)}
                  />
                ))}
                <th style={{ backgroundColor: '#fff', borderBottom: '1px solid #E6E9EF' }} />
              </tr>
            </thead>
            <tbody>
              {sortItems(applyFilters(items, filterConfigs ?? []), sortConfigs ?? []).map(item => (
                <tr key={item.id}
                  onMouseEnter={() => setHoverRow(item.id)} onMouseLeave={() => setHoverRow(null)}
                  style={{ backgroundColor: hoverRow === item.id ? '#F5F7FF' : '#fff', transition: 'background 0.1s' }}>
                  <td style={{ padding: '0 8px', textAlign: 'center', borderBottom: '1px solid #F0F1F7', borderRight: '1px solid #F0F1F7', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <input type="checkbox" style={{ accentColor: group.color, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                      <button onClick={() => onOpenUpdates(item, group.id)}
                        title="Updates"
                        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 3, borderRadius: 4, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ECEDF5')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <MessageCircle size={17} color="#676879" />
                        {(item._count?.updates ?? 0) > 0 && (
                          <span style={{ position: 'absolute', top: -4, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#0073EA', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: '0 3px' }}>
                            {item._count!.updates}
                          </span>
                        )}
                      </button>
                    </div>
                  </td>
                  {cols.map(col => (
                    <td key={String(col.key)} style={{ padding: 0, textAlign: (col.align ?? 'left') as 'left' | 'center', borderBottom: '1px solid #F0F1F7', borderRight: '1px solid #F0F1F7', verticalAlign: 'middle', maxWidth: col.width }}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  <td style={{ padding: '0 8px', textAlign: 'center', borderBottom: '1px solid #F0F1F7' }}>
                    {hoverRow === item.id && (
                      <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 3 }}>
                        <Trash2 size={15} color="#E2445C" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Add task row */}
              {addingItem ? (
                <tr>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #F0F1F7' }} />
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #F0F1F7' }} colSpan={cols.length}>
                    <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); if (e.key === 'Escape') { setAddingItem(false); setNewItemName(''); } }}
                      placeholder="Task name... (Enter to save, Esc to cancel)"
                      style={{ width: '100%', border: '1px solid #0073EA', borderRadius: 4, padding: '8px 12px', outline: 'none', fontSize: 15, fontFamily: 'inherit', opacity: addingLoading ? 0.5 : 1 }}
                      disabled={addingLoading}
                    />
                  </td>
                  <td style={{ padding: '6px 6px', borderBottom: '1px solid #F0F1F7' }}>
                    <button onClick={() => { setAddingItem(false); setNewItemName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#676879' }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={TOTAL_COLS} style={{ padding: '8px 14px', borderBottom: '1px solid #F0F1F7' }}>
                    <button onClick={() => setAddingItem(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#676879', fontSize: 15, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.color = group.color)} onMouseLeave={e => (e.currentTarget.style.color = '#676879')}>
                      <Plus size={15} /> + Add task
                    </button>
                  </td>
                </tr>
              )}

              {/* Sum / aggregate row */}
              <tr style={{ backgroundColor: '#FAFBFC' }}>
                {Array.from({ length: TOTAL_COLS }).map((_, i) => {
                  const colIdx = i - 1;
                  if (colIdx === googleRatingIdx) return (
                    <td key={i} style={{ padding: '6px 12px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      {avgRating ? <><div style={{ fontSize: 13, fontWeight: 600, color: '#323338' }}>{avgRating}</div><div style={{ fontSize: 11, color: '#676879' }}>avg</div></> : <><div style={{ fontSize: 13, color: '#676879' }}>0</div><div style={{ fontSize: 11, color: '#676879' }}>sum</div></>}
                    </td>
                  );
                  if (colIdx === noOfRatingsIdx) return (
                    <td key={i} style={{ padding: '6px 12px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#323338' }}>{totalNoOfRatings.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#676879' }}>sum</div>
                    </td>
                  );
                  if (colIdx === filesIdx) return (
                    <td key={i} style={{ padding: '6px 12px', textAlign: 'center', borderTop: '1px solid #E6E9EF', borderRight: '1px solid #E6E9EF' }}>
                      <div style={{ fontSize: 13, color: '#676879' }}>{totalFiles}</div>
                      <div style={{ fontSize: 11, color: '#676879' }}>files</div>
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
  const [extraCols,   setExtraCols]   = useState<ColDef[]>([]);
  const [hiddenCols,  setHiddenCols]  = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [updatesPanel, setUpdatesPanel] = useState<{ item: BoardItem; groupId: string } | null>(null);
  const [sortConfigs,     setSortConfigs]     = useState<SortConfig[]>([]);
  const [groupByField,    setGroupByField]    = useState<string | null>(null);
  const [groupByDir,      setGroupByDir]      = useState<'asc' | 'desc'>('asc');
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  const [showSort,        setShowSort]        = useState(false);
  const [showGroupBy,     setShowGroupBy]     = useState(false);
  const [showFilter,      setShowFilter]      = useState(false);
  const [filterConfigs,   setFilterConfigs]   = useState<FilterConfig[]>([]);

  const allCols = [...BASE_COLS, ...extraCols].filter(c => !hiddenCols.has(String(c.key)));

  function handleRenameCol(key: string, newLabel: string) {
    setExtraCols(prev => prev.map(c => String(c.key) === key ? { ...c, label: newLabel } : c));
  }
  function handleDeleteCol(key: string) {
    // For extra cols: remove entirely; for base cols: hide
    const isBase = BASE_COLS.some(c => String(c.key) === key);
    if (isBase) {
      setHiddenCols(prev => new Set([...prev, key]));
    } else {
      setExtraCols(prev => prev.filter(c => String(c.key) !== key));
    }
  }
  function handleDuplicateCol(col: ColDef, _withValues: boolean) {
    setExtraCols(prev => {
      const allIdx = [...BASE_COLS, ...prev].findIndex(c => String(c.key) === String(col.key));
      const extraIdx = prev.findIndex(c => String(c.key) === String(col.key));
      const prefix = String(col.key).startsWith('_people_') ? '_people_' : '_custom_';
      const copy: ColDef = { ...col, key: `${prefix}${Date.now()}`, label: `${col.label} (copy)` };
      if (extraIdx >= 0) { const next = [...prev]; next.splice(extraIdx + 1, 0, copy); return next; }
      void allIdx;
      return [...prev, copy];
    });
  }
  function handleAddColRight(afterKey: string, type: string, label: string) {
    setExtraCols(prev => {
      const prefix = type === 'people' ? '_people_' : '_custom_';
      const newCol: ColDef = { key: `${prefix}${Date.now()}`, label, width: type === 'people' ? 120 : 150, align: type === 'people' ? 'center' : undefined };
      const extraIdx = prev.findIndex(c => String(c.key) === afterKey);
      if (extraIdx >= 0) { const next = [...prev]; next.splice(extraIdx + 1, 0, newCol); return next; }
      // afterKey is a BASE_COL — insert at beginning of extraCols
      return [newCol, ...prev];
    });
  }

  // Sticky horizontal scrollbar
  const contentRef   = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const syncing      = useRef(false);
  const totalColWidth = 64 + allCols.reduce((s, c) => s + c.width, 0) + 42 + 48;

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

  // ── Close sort popup on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!showSort) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sort-popup]')) setShowSort(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showSort]);

  // ── Close filter popup on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showFilter) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-popup]')) setShowFilter(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showFilter]);

  // ── Close group-by popup on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showGroupBy) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-groupby-popup]')) setShowGroupBy(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showGroupBy]);

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

      {/* Toolbar — only shown on Main table tab */}
      {activeTab === 0 && <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '9px 24px', borderBottom: '1px solid #E6E9EF' }}>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', marginRight: 6 }}>
            <button onClick={() => setShowNewGroup(true)} disabled={groupLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', backgroundColor: '#0073EA', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: groupLoading ? 0.7 : 1 }}>
              <Plus size={14} /> New task
            </button>
            <button style={{ display: 'flex', alignItems: 'center', padding: '7px 7px', backgroundColor: '#0073EA', color: '#fff', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              <ChevronDown size={13} />
            </button>
          </div>
          {/* Search / Person */}
          {[
            { label: 'Search', icon: Search },
            { label: 'Person', icon: Users },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'none', border: 'none', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <Icon size={14} /> {label}
            </button>
          ))}
          {/* Filter button + popup */}
          <div data-filter-popup style={{ position: 'relative' }}>
            <button onClick={() => { setShowFilter(p => { if (!p && filterConfigs.length === 0) setFilterConfigs([{ id: String(Date.now()), field: '', condition: 'contains', value: '' }]); return !p; }); setShowSort(false); setShowGroupBy(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                background: showFilter || filterConfigs.some(f => f.field) ? '#E8F0FE' : 'none', border: 'none', borderRadius: 6, fontSize: 13,
                color: showFilter || filterConfigs.some(f => f.field) ? '#0073EA' : '#676879',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterConfigs.some(f => f.field) ? 600 : 400 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = showFilter || filterConfigs.some(f => f.field) ? '#E8F0FE' : '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = showFilter || filterConfigs.some(f => f.field) ? '#E8F0FE' : 'transparent')}>
              <Filter size={14} /> Filter
              {filterConfigs.some(f => f.field) && <span style={{ background: '#0073EA', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 5px', marginLeft: 2 }}>{filterConfigs.filter(f => f.field).length}</span>}
            </button>
            {showFilter && (() => {
              const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
              const activeItems = filterConfigs.length > 0 ? groups.reduce((s, g) => s + applyFilters(g.items, filterConfigs).length, 0) : totalItems;
              return (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #E6E9EF', width: 680, padding: '16px 20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#323338' }}>Advanced filters</span>
                      <span style={{ fontSize: 13, color: '#676879' }}>Showing {activeItems} of {totalItems} tasks</span>
                      <Info size={13} color="#C5C7D4" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {filterConfigs.some(f => f.field) && (
                        <button onClick={() => setFilterConfigs([{ id: String(Date.now()), field: '', condition: 'contains', value: '' }])}
                          style={{ fontSize: 13, color: '#676879', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          Clear all
                        </button>
                      )}
                      <button style={{ fontSize: 13, color: '#323338', background: 'none', border: '1px solid #D0D4E4', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 12px', borderRadius: 6, fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        Save as new view
                      </button>
                    </div>
                  </div>
                  {/* Filter with AI toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#FAFBFC', borderRadius: 8, border: '1px solid #F0F1F7' }}>
                    <div style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer' }} onClick={() => {}}>
                      <div style={{ width: 40, height: 22, borderRadius: 11, background: '#D0D4E4' }} />
                      <div style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                    </div>
                    <span style={{ fontSize: 14, color: '#323338', fontWeight: 500 }}>Filter with AI</span>
                  </div>
                  {/* Filter rows */}
                  {filterConfigs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {filterConfigs.map((fc, idx) => {
                        const needsValue = !['is_empty','is_not_empty'].includes(fc.condition);
                        return (
                          <div key={fc.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#676879', width: 40, flexShrink: 0 }}>{idx === 0 ? 'Where' : 'And'}</span>
                            {/* Column */}
                            <select value={fc.field} onChange={e => setFilterConfigs(prev => prev.map(f => f.id === fc.id ? { ...f, field: e.target.value } : f))}
                              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', color: '#323338', cursor: 'pointer', background: '#fff', outline: 'none' }}>
                              <option value="">Column</option>
                              {allCols.filter(c => !String(c.key).startsWith('_people_')).map(c => (
                                <option key={String(c.key)} value={String(c.key)}>{String(c.label)}</option>
                              ))}
                            </select>
                            {/* Condition */}
                            <select value={fc.condition} onChange={e => setFilterConfigs(prev => prev.map(f => f.id === fc.id ? { ...f, condition: e.target.value, value: '' } : f))}
                              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', color: '#323338', cursor: 'pointer', background: '#fff', outline: 'none' }}>
                              {FILTER_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            {/* Value */}
                            {needsValue ? (
                              <input value={fc.value} onChange={e => setFilterConfigs(prev => prev.map(f => f.id === fc.id ? { ...f, value: e.target.value } : f))}
                                placeholder="Value"
                                style={{ flex: 2, padding: '7px 10px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', color: '#323338', outline: 'none', background: '#fff' }}
                                onFocus={e => (e.target.style.borderColor = '#0073EA')}
                                onBlur={e => (e.target.style.borderColor = '#D0D4E4')} />
                            ) : (
                              <div style={{ flex: 2 }} />
                            )}
                            {/* Remove */}
                            <button onClick={() => setFilterConfigs(prev => prev.filter(f => f.id !== fc.id))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C5C7D4', display: 'flex', padding: 4, borderRadius: 4, flexShrink: 0 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF0F0'; (e.currentTarget as HTMLElement).style.color = '#E2445C'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#C5C7D4'; }}>
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Bottom actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setFilterConfigs(prev => [...prev, { id: String(Date.now()), field: '', condition: 'contains', value: '' }])}
                        style={{ fontSize: 13, color: '#0073EA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 8px', borderRadius: 6, fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F7FF')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        + New filter
                      </button>
                      <button style={{ fontSize: 13, color: '#676879', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 8px', borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        + New group
                      </button>
                    </div>
                    <button style={{ fontSize: 13, color: '#676879', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 8px', borderRadius: 6 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F6F8')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      Switch to quick filters
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Sort button with floating popup */}
          <div data-sort-popup style={{ position: 'relative' }}>
            <button onClick={() => { setShowSort(p => !p); setShowGroupBy(false); setShowFilter(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                background: showSort || sortConfigs.length > 0 ? '#E8F0FE' : 'none', border: 'none', borderRadius: 6, fontSize: 13,
                color: showSort || sortConfigs.length > 0 ? '#0073EA' : '#676879',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: sortConfigs.length > 0 ? 600 : 400 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = showSort || sortConfigs.length > 0 ? '#E8F0FE' : '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = showSort || sortConfigs.length > 0 ? '#E8F0FE' : 'transparent')}>
              <ArrowUpDown size={14} /> Sort
              {sortConfigs.length > 0 && <span style={{ background: '#0073EA', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 5px', marginLeft: 2 }}>{sortConfigs.length}</span>}
            </button>
            {/* Sort popup */}
            {showSort && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
                background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
                border: '1px solid #E6E9EF', padding: '16px 20px', minWidth: 520, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#323338', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Sort by
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #676879', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#676879', cursor: 'default' }}>?</span>
                  </span>
                  <button style={{ fontSize: 12, color: '#676879', background: '#fff', border: '1px solid #D0D4E4', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>
                    Save as new view
                  </button>
                </div>
                {/* Sort rows */}
                {sortConfigs.map((sc, idx) => {
                  const usedFields = sortConfigs.filter((_, i) => i !== idx).map(s => s.field);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Drag handle */}
                      <span style={{ color: '#C5C7D4', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
                      </span>
                      <select value={sc.field}
                        onChange={e => setSortConfigs(prev => prev.map((s, i) => i === idx ? { ...s, field: e.target.value } : s))}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#323338', cursor: 'pointer' }}>
                        <option value="">Choose column</option>
                        {allCols.filter(c => !c.key.startsWith('_') && (String(c.key) === sc.field || !usedFields.includes(String(c.key)))).map(c => (
                          <option key={String(c.key)} value={String(c.key)}>{c.label}</option>
                        ))}
                      </select>
                      <select value={sc.dir}
                        onChange={e => setSortConfigs(prev => prev.map((s, i) => i === idx ? { ...s, dir: e.target.value as 'asc' | 'desc' } : s))}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#323338', cursor: 'pointer' }}>
                        <option value="asc">↑ Ascending</option>
                        <option value="desc">↓ Descending</option>
                      </select>
                      <button onClick={() => setSortConfigs(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C5C7D4', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#676879')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#C5C7D4')}>
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
                {/* + New sort */}
                {sortConfigs.length < allCols.filter(c => !c.key.startsWith('_')).length && (
                  <button
                    onClick={() => setSortConfigs(prev => {
                      const used = prev.map(s => s.field);
                      const next = allCols.find(c => !c.key.startsWith('_') && !used.includes(String(c.key)));
                      if (!next) return prev;
                      return [...prev, { field: String(next.key), dir: 'asc' }];
                    })}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', background: 'none', border: 'none', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#0073EA')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#676879')}>
                    <Plus size={14} /> New sort
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Hide */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'none', border: 'none', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Eye size={14} /> Hide
          </button>
          {/* Group by button + popup */}
          <div data-groupby-popup style={{ position: 'relative' }}>
            <button onClick={() => { setShowGroupBy(p => !p); setShowSort(false); setShowFilter(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: showGroupBy || !!groupByField ? '#E8F0FE' : 'none', border: 'none', borderRadius: 6, fontSize: 13,
                color: showGroupBy || !!groupByField ? '#0073EA' : '#676879', cursor: 'pointer', fontFamily: 'inherit', fontWeight: groupByField ? 600 : 400 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = showGroupBy || !!groupByField ? '#E8F0FE' : '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = showGroupBy || !!groupByField ? '#E8F0FE' : 'transparent')}>
              <MoreHorizontal size={14} /> Group by
              {groupByField && <span style={{ background: '#0073EA', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 5px', marginLeft: 2 }}>1</span>}
            </button>
            {showGroupBy && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1000,
                background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
                border: '1px solid #E6E9EF', padding: '16px 20px', minWidth: 480, display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#323338', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Group items by
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #676879', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#676879', cursor: 'default' }}>?</span>
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {groupByField && (
                      <button onClick={() => { setGroupByField(null); setGroupByDir('asc'); }}
                        style={{ fontSize: 12, color: '#676879', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F6F8')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        Clear
                      </button>
                    )}
                    <button style={{ fontSize: 12, color: '#676879', background: '#fff', border: '1px solid #D0D4E4', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>
                      Save as new view
                    </button>
                  </div>
                </div>
                {/* Column + direction row */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <select value={groupByField ?? ''}
                    onChange={e => setGroupByField(e.target.value || null)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#323338', cursor: 'pointer' }}>
                    <option value="">Choose column</option>
                    {allCols.filter(c => !c.key.startsWith('_') && !['name','notes','location','email','phone','landOwnerContact'].includes(String(c.key))).map(c => (
                      <option key={String(c.key)} value={String(c.key)}>{c.label}</option>
                    ))}
                  </select>
                  <select value={groupByDir}
                    onChange={e => setGroupByDir(e.target.value as 'asc' | 'desc')}
                    disabled={!groupByField}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#323338', cursor: groupByField ? 'pointer' : 'default', opacity: groupByField ? 1 : 0.5 }}>
                    <option value="asc">↑ A → Z</option>
                    <option value="desc">↓ Z → A</option>
                  </select>
                </div>
                {/* Show empty groups */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#323338' }}>
                  <input type="checkbox" checked={showEmptyGroups} onChange={e => setShowEmptyGroups(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#0073EA', cursor: 'pointer', flexShrink: 0 }} />
                  Show empty groups
                </label>
                {/* Divider + Give feedback */}
                <div style={{ borderTop: '1px solid #E6E9EF', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#676879', fontSize: 12, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0073EA')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#676879')}>
                  <Smile size={14} /> Give feedback
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowAddCol(true)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'none', border: '1px dashed #D0D4E4', borderRadius: 6, fontSize: 13, color: '#676879', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0073EA'; (e.currentTarget as HTMLButtonElement).style.color = '#0073EA'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0D4E4'; (e.currentTarget as HTMLButtonElement).style.color = '#676879'; }}>
            <Plus size={13} /> Add column
          </button>
        </div>

      </div>}

      {/* Main content */}
      {groups.length === 0 ? (
        <EmptyBoard onAddGroup={() => setShowNewGroup(true)} />
      ) : activeTab === 1 ? (
        /* ── Map view ── */
        <MapView groups={groups} />
      ) : (
        <>
          {/* Shared horizontal scroll container */}
          <div ref={contentRef} onScroll={onContentScroll} className="board-content"
            style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '14px 24px 8px' }}>
            <div style={{ minWidth: totalColWidth }}>
              {groupByField ? (
                // ── Dynamic grouping ─────────────────────────────────────────
                (() => {
                  const allItems = applyFilters(groups.flatMap(g => g.items), filterConfigs);
                  const groupMap = new Map<string, BoardItem[]>();
                  allItems.forEach(item => {
                    const val = (item as unknown as Record<string, unknown>)[groupByField];
                    const key = val != null && String(val).trim() ? String(val).trim() : '(Empty)';
                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(item);
                  });
                  const COLORS = ['#0085FF','#00C875','#FDAB3D','#E2445C','#A25DDC','#FF7575','#037F4C','#FF642E'];
                  let entries = Array.from(groupMap.entries());
                  entries.sort(([a], [b]) => {
                    if (a === '(Empty)') return 1;
                    if (b === '(Empty)') return -1;
                    return groupByDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
                  });
                  if (!showEmptyGroups) entries = entries.filter(([, items]) => items.length > 0);
                  return entries.map(([val, items], idx) => {
                    const fakeGroup: BoardGroup = {
                      ...groups[0], id: `gb_${val}`, name: val,
                      color: COLORS[idx % COLORS.length], items,
                    };
                    return (
                      <GroupBlock key={`gb_${val}`} group={fakeGroup} boardId={id}
                        onUpdate={() => {}} onDelete={() => {}}
                        cols={allCols} onError={setError} readOnly
                        sortConfigs={sortConfigs}
                        onRenameCol={handleRenameCol} onDeleteCol={handleDeleteCol} onDuplicateCol={handleDuplicateCol} onAddColRight={handleAddColRight}
                        onOpenUpdates={(item, groupId) => setUpdatesPanel({ item, groupId })} />
                    );
                  });
                })()
              ) : (
                // ── Normal groups from DB ────────────────────────────────────
                groups.map(group => (
                  <GroupBlock key={group.id} group={group} boardId={id}
                    onUpdate={handleUpdateGroup} onDelete={handleDeleteGroup}
                    cols={allCols} onError={setError}
                    sortConfigs={sortConfigs} filterConfigs={filterConfigs}
                    onRenameCol={handleRenameCol} onDeleteCol={handleDeleteCol} onDuplicateCol={handleDuplicateCol}
                    onOpenUpdates={(item, groupId) => setUpdatesPanel({ item, groupId })} />
                ))
              )}
              {!groupByField && (
                <button onClick={() => setShowNewGroup(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'none', border: '1px dashed #D0D4E4', borderRadius: 6, cursor: 'pointer', color: '#676879', fontSize: 13, fontFamily: 'inherit', marginTop: 4, marginBottom: 16 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0073EA'; (e.currentTarget as HTMLButtonElement).style.color = '#0073EA'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0D4E4'; (e.currentTarget as HTMLButtonElement).style.color = '#676879'; }}>
                  <Plus size={14} /> Add new group
                </button>
              )}
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

      {/* Updates panel */}
      {updatesPanel && (
        <UpdatesPanel
          item={updatesPanel.item}
          boardId={id}
          groupId={updatesPanel.groupId}
          onClose={() => setUpdatesPanel(null)}
          onCountChange={(itemId, count) => {
            setGroups(prev => prev.map(g => ({
              ...g,
              items: g.items.map(it => it.id === itemId
                ? { ...it, _count: { updates: count } }
                : it),
            })));
            if (updatesPanel.item.id === itemId) {
              setUpdatesPanel(p => p ? { ...p, item: { ...p.item, _count: { updates: count } } } : null);
            }
          }}
        />
      )}

      {/* Error toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </div>
  );
}
