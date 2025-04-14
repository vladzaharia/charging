import { useState } from 'react';
import { Modal } from '../modal/Modal';
import { ButtonReact } from '../button/ButtonReact';
import { supabase } from '../../services/supabase';
import type { Provider } from '@supabase/supabase-js';

type AuthMode = 'signin' | 'signup' | 'recover';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Auth = ({ isOpen, onClose }: AuthProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSocialLogin = async (provider: Provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Error:', error.message);
      } else {
        // Set up message listener for OAuth callback
        const handleAuthComplete = (event: MessageEvent) => {
          if (
            event.origin === window.location.origin &&
            event.data?.type === 'SUPABASE_AUTH_COMPLETE'
          ) {
            window.removeEventListener('message', handleAuthComplete);
            onClose();
          }
        };

        window.addEventListener('message', handleAuthComplete);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);

    try {
      let result;

      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      } else if (mode === 'recover') {
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (!result.error) {
          setError('Check your email for the recovery link');
          return;
        }
      }

      if (result?.error) {
        setError(result.error.message);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col md:items-center justify-center md:flex-row relative">
        {/* Left Column */}
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <h1 className="text-4xl font-display text-charge-blue mb-8">
            <img src="/wordmark.svg" alt="Wordmark" />
          </h1>
          <span className="text-slate-400 mb-4">Sign in/up with...</span>
          <div className="flex flex-row gap-4 w-full">
            <ButtonReact
              variant="orange"
              className="flex-1"
              onClick={() => handleSocialLogin('google')}
              type="button"
            >
              Google
            </ButtonReact>
            <ButtonReact
              variant="white"
              className="flex-1"
              onClick={() => handleSocialLogin('apple')}
              type="button"
            >
              Apple
            </ButtonReact>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center">
          <hr className="m-2 border-slate-400/50 w-24 mx-6 md:mx-2 md:w-8" />
          <span className="text-slate-400 font-display">or</span>
          <hr className="m-2 border-slate-400/50 w-24 mx-6 md:mx-2 md:w-8" />
        </div>

        {/* Right Column */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-8 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-display text-charge-blue">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900/10 border-2 border-slate-400/15 rounded-xl p-4 font-display focus:border-charge-green outline-none transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            {mode !== 'recover' && (
              <>
                <label htmlFor="password" className="font-display text-charge-blue">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/10 border-2 border-slate-400/15 rounded-xl p-4 font-display focus:border-charge-green outline-none transition-colors"
                  required
                  minLength={6}
                />
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-sm font-display text-center">{error}</p>}

          <ButtonReact type="submit" variant="primary" className="mt-4" disabled={loading}>
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'recover' && 'Send Recovery Email'}
          </ButtonReact>

          <hr className="m-2 border-slate-400/50" />

          <div className="flex gap-4 mt-2">
            {mode === 'signin' && (
              <>
                <ButtonReact
                  type="button"
                  variant="secondary"
                  className="flex-1 text-sm p-2"
                  onClick={() => {
                    setMode('signup');
                    setError(undefined);
                  }}
                >
                  Sign Up
                </ButtonReact>
                <ButtonReact
                  type="button"
                  variant="secondary"
                  className="flex-1 text-sm p-2"
                  onClick={() => {
                    setMode('recover');
                    setError(undefined);
                  }}
                >
                  Recover
                </ButtonReact>
              </>
            )}
            {mode !== 'signin' && (
              <ButtonReact
                type="button"
                variant="secondary"
                className="flex-1 text-sm p-2"
                onClick={() => {
                  setMode('signin');
                  setError(undefined);
                }}
              >
                Back to Sign In
              </ButtonReact>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
