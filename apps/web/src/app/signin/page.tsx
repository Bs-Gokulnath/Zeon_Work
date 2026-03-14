'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendOtp, verifyOtp } from '@/services/auth';
import ZeonLogo from '@/components/ui/ZeonLogo';

type Step = 'email' | 'otp';

export default function SigninPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendOtp(email);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(email, otp);
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F8', fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 14 }}>
            <ZeonLogo size={52} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#323338', margin: 0 }}>Sign in to Zeon Charging</h1>
          <p style={{ fontSize: 13, color: '#676879', marginTop: 6 }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#0073EA', fontWeight: 500, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D0D4E4', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '28px 32px' }}>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 6 }}>
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@company.com"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D0D4E4', fontSize: 13, color: '#323338', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#0073EA'}
                onBlur={e => e.target.style.borderColor = '#D0D4E4'}
              />

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>

          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#323338', margin: 0 }}>Code sent to</p>
                  <p style={{ fontSize: 13, color: '#0073EA', fontWeight: 600, margin: '2px 0 0' }}>{email}</p>
                </div>
                <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ fontSize: 12, color: '#676879', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Change
                </button>
              </div>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 6 }}>
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="_ _ _ _ _ _"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #D0D4E4', fontSize: 22, fontWeight: 700, color: '#323338', letterSpacing: 12, textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#0073EA'}
                onBlur={e => e.target.style.borderColor = '#D0D4E4'}
              />

              <p style={{ fontSize: 12, color: '#676879', marginTop: 8, marginBottom: 0 }}>
                Didn&apos;t receive it?{' '}
                <button type="button" onClick={() => sendOtp(email)}
                  style={{ color: '#0073EA', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Resend OTP
                </button>
              </p>

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading || otp.length < 6} style={btnStyle(loading || otp.length < 6)}>
                {loading ? 'Verifying...' : 'Verify & Sign in'}
              </button>
            </form>
          )}
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#676879' }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#0073EA', cursor: 'pointer' }}>Terms</span>
          {' '}and{' '}
          <span style={{ color: '#0073EA', cursor: 'pointer' }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 6, backgroundColor: '#FFEAEA', border: '1px solid #F5C0C0', marginTop: 12 }}>
      <svg style={{ width: 16, height: 16, color: '#D83A52', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
      <p style={{ fontSize: 12, color: '#D83A52', margin: 0 }}>{message}</p>
    </div>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '9px 16px', borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: disabled ? '#8DC8F8' : '#0073EA', color: '#fff', fontSize: 14, fontWeight: 600,
    marginTop: 16, fontFamily: 'inherit', transition: 'background-color 0.15s',
  };
}
