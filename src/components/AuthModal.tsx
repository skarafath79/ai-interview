import React, { useState } from 'react';
import { Compass, Loader2, Mail, Lock, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

interface AuthModalProps {
  initialMode?: 'login' | 'signup' | 'reset';
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogle = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      showToast('Signed in with Google.', 'success');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
        showToast('Welcome back!', 'success');
        onSuccess();
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          setBusy(false);
          return;
        }
        await signupWithEmail(name.trim(), email.trim(), password);
        showToast('Account created successfully.', 'success');
        onSuccess();
      } else {
        await resetPassword(email.trim());
        showToast('Password reset email sent. Check your inbox.', 'success');
        setMode('login');
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('auth/operation-not-allowed')) {
        msg =
          'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication → Sign-in method). Please use Continue with Google or enable Email/Password in Firebase Console.';
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password. Please check your credentials.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Try signing in instead.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.';
      }
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 sm:p-7 shadow-xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label="Close sign in dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </span>
          <span className="text-lg font-bold text-slate-900">CareerPilot AI</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {mode === 'login'
            ? 'Sign in to your workspace'
            : mode === 'signup'
              ? 'Create your CareerPilot account'
              : 'Reset your password'}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {mode === 'reset'
            ? 'Enter your email address and we will send a reset link.'
            : 'Save your resumes, ATS analyses, and adaptive interview reports.'}
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">or with email</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Sharma"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('reset');
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Email'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          {mode === 'login' ? (
            <>
              New to CareerPilot AI?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('signup');
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('login');
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
