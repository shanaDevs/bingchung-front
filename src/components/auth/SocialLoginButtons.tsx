'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { User } from '@/types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
}

export function SocialLoginButtons({ onSuccess }: SocialLoginButtonsProps) {
  const { login } = useAuthStore();
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [loading, setLoading] = useState<'google' | 'facebook' | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const completeLogin = useCallback(
    (token: string, user: User, provider: string) => {
      login(token, user);
      toast.success(`Signed in with ${provider}! 🧋`);
      onSuccess?.();
    },
    [login, onSuccess]
  );

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setLoading('google');
      try {
        const res = await api.post<{ token: string; user: User }>('/auth/google', { idToken: credential });
        completeLogin(res.token, res.user, 'Google');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        toast.error(message);
      } finally {
        setLoading(null);
      }
    },
    [completeLogin]
  );

  const initGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) void handleGoogleCredential(response.credential);
      },
    });

    if (googleBtnRef.current) {
      googleBtnRef.current.innerHTML = '';
      const parentW = googleBtnRef.current.parentElement?.clientWidth ?? 320;
      const width = Math.min(400, Math.max(240, parentW));
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width,
        text: 'continue_with',
        shape: 'rectangular',
      });
    }
    setGoogleReady(true);
  }, [handleGoogleCredential]);

  const initFacebook = useCallback(() => {
    if (!FACEBOOK_APP_ID || !window.FB) return;
    window.FB.init({
      appId: FACEBOOK_APP_ID,
      cookie: true,
      xfbml: false,
      version: 'v21.0',
    });
    setFacebookReady(true);
  }, []);

  useEffect(() => {
    if (googleReady && GOOGLE_CLIENT_ID) initGoogle();
  }, [googleReady, initGoogle]);

  useEffect(() => {
    window.fbAsyncInit = () => initFacebook();
    if (window.FB && FACEBOOK_APP_ID) initFacebook();
  }, [initFacebook]);

  function handleFacebookClick() {
    if (!FACEBOOK_APP_ID) {
      toast.error('Facebook login is not configured. Add NEXT_PUBLIC_FACEBOOK_APP_ID.');
      return;
    }
    if (!window.FB) {
      toast.error('Facebook SDK is still loading. Try again in a moment.');
      return;
    }

    setLoading('facebook');
    window.FB.login(
      (response) => {
        if (response.status !== 'connected' || !response.authResponse?.accessToken) {
          setLoading(null);
          if (response.status !== 'unknown') toast.error('Facebook sign-in was cancelled');
          return;
        }

        void (async () => {
          try {
            const res = await api.post<{ token: string; user: User }>('/auth/facebook', {
              accessToken: response.authResponse!.accessToken,
            });
            completeLogin(res.token, res.user, 'Facebook');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Facebook sign-in failed';
            toast.error(message);
          } finally {
            setLoading(null);
          }
        })();
      },
      { scope: 'public_profile,email' }
    );
  }

  function handleGoogleFallback() {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google login is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    if (!window.google?.accounts?.id) {
      toast.error('Google sign-in is still loading. Try again in a moment.');
      return;
    }
    window.google.accounts.id.prompt();
  }

  const googleConfigured = !!GOOGLE_CLIENT_ID;
  const facebookConfigured = !!FACEBOOK_APP_ID;

  return (
    <>
      {googleConfigured && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleReady(true)}
        />
      )}
      {facebookConfigured && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={() => {
            if (window.fbAsyncInit) window.fbAsyncInit();
            else initFacebook();
          }}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-navy-border" />
          <span className="text-xs text-muted uppercase tracking-wide">or continue with</span>
          <div className="flex-1 h-px bg-navy-border" />
        </div>

        {googleConfigured ? (
          <div ref={googleBtnRef} className="flex justify-center min-h-[44px] w-full max-w-full overflow-hidden" />
        ) : (
          <button
            type="button"
            onClick={handleGoogleFallback}
            disabled
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-navy-border bg-navy-light/50 text-white text-sm font-medium opacity-50 cursor-not-allowed"
            title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID in .env"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        )}

        <button
          type="button"
          onClick={handleFacebookClick}
          disabled={!facebookConfigured || loading === 'facebook'}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-navy-border bg-[#1877F2]/20 text-white text-sm font-medium hover:border-[#1877F2] transition-colors disabled:opacity-50"
          title={
            facebookConfigured
              ? undefined
              : 'Set NEXT_PUBLIC_FACEBOOK_APP_ID and FACEBOOK_APP_ID in .env'
          }
        >
          <FacebookIcon />
          {loading === 'facebook' ? 'Signing in...' : 'Continue with Facebook'}
        </button>

        {(!googleConfigured || !facebookConfigured) && (
          <p className="text-xs text-center text-muted leading-relaxed">
            Social login requires OAuth app credentials in your <code className="text-brand">.env</code> files.
            See project <code className="text-brand">.env.example</code>.
          </p>
        )}
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
