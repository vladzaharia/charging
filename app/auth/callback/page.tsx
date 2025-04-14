'use client';

import Backdrop from '@/components/background/Backdrop';
import { supabase } from '@/services/supabase';
import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;

        // Close the window if it was opened by OAuth
        if (window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_COMPLETE' }, window.location.origin);
          window.close();
        } else {
          // If opened directly, redirect to home
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
      }
    };

    handleCallback();
  }, []);

  return (
    <Backdrop className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-display text-charge-blue mb-4">Signing you in...</h1>
        <p className="text-slate-400">You can close this window once you&apos;re signed in.</p>
      </div>
    </Backdrop>
  );
}
