'use client';

import { useAuth } from '@/hooks/useAuth';
import ZeonLogo from '@/components/ui/ZeonLogo';

function avatarColor(name: string) {
  const colors = ['#0073EA', '#E2445C', '#00C875', '#FDAB3D', '#A25DDC', '#037F4C', '#0086C0'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfilePage() {
  const { user, loading, signout } = useAuth(true);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'Roboto, sans-serif', color: '#676879' }}>
      Loading...
    </div>
  );

  if (!user) return null;

  const color = avatarColor(user.name);

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif', maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#323338', margin: 0 }}>My Profile</h1>
        <p style={{ fontSize: 13, color: '#676879', marginTop: 4 }}>Manage your account information</p>
      </div>

      {/* Profile card */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

        {/* Cover */}
        <div style={{ height: 100, backgroundColor: color, opacity: 0.15 }} />

        {/* Avatar + info */}
        <div style={{ padding: '0 32px 28px', marginTop: -40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: color, border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 28, flexShrink: 0 }}>
              {initials(user.name)}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#323338', margin: 0 }}>{user.name}</h2>
              <p style={{ fontSize: 13, color: '#676879', margin: '2px 0 0' }}>{user.email}</p>
            </div>
            <span style={{ marginLeft: 'auto', paddingBottom: 8, fontSize: 12, fontWeight: 600, color: '#0073EA', backgroundColor: '#DCE9FC', padding: '4px 10px', borderRadius: 20, alignSelf: 'flex-end' }}>
              {user.role}
            </span>
          </div>

          {/* Info fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <InfoField label="Full name" value={user.name} />
            <InfoField label="Email address" value={user.email} />
            <InfoField label="Role" value={user.role} />
            <InfoField label="Member since" value={new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          </div>
        </div>
      </div>

      {/* Sessions card */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #D0D4E4', borderRadius: 10, padding: '24px 32px', marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323338', margin: '0 0 16px' }}>Session</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F5F6F8', borderRadius: 8, border: '1px solid #E6E9EF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="#0073EA" strokeWidth="1.6" style={{ width: 20, height: 20 }}>
              <rect x="2" y="4" width="16" height="12" rx="2" />
              <path d="M2 8h16" />
            </svg>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#323338', margin: 0 }}>Current session</p>
              <p style={{ fontSize: 12, color: '#676879', margin: '2px 0 0' }}>Active now — this device</p>
            </div>
          </div>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00C875', display: 'block' }} />
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #F5C0C0', borderRadius: 10, padding: '24px 32px', marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323338', margin: '0 0 6px' }}>Sign out</h3>
        <p style={{ fontSize: 13, color: '#676879', margin: '0 0 16px' }}>
          You will be signed out of your account on this device.
        </p>
        <button onClick={signout}
          style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #E2445C', backgroundColor: '#fff', color: '#E2445C', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2445C'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#E2445C'; }}
        >
          Sign out
        </button>
      </div>

    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderBottom: '1px solid #E6E9EF', paddingBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#676879', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, color: '#323338', margin: 0 }}>{value}</p>
    </div>
  );
}
