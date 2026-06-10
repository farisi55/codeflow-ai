'use client';

import {
  CheckCircle,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';

import { usePuterAuth } from '@/lib/puter-client';

interface PuterAuthBannerProps {
  alwaysShow?: boolean;
}

export function PuterAuthBanner({
  alwaysShow = false,
}: PuterAuthBannerProps) {
  const {
    isLoaded,
    isSignedIn,
    username,
    isLoading,
    signIn,
    signOut,
  } = usePuterAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    if (!alwaysShow) {
      return null;
    }

    return (
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-[rgba(63,185,80,0.06)] px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="text-success" size={11} />
          <span className="text-success">Puter AI direct</span>
          {username ? (
            <span className="text-muted">@{username}</span>
          ) : null}
        </div>
        <button
          className="flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void signOut()}
          title="Sign out from Puter"
          type="button"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={10} />
          ) : (
            <LogOut size={10} />
          )}
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[rgba(47,129,247,0.06)] px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium text-foreground">
          Puter AI direct - no developer API key
        </span>
        <span className="text-[10px] text-muted">
          Sign in with Puter. Usage is charged to your Puter account.
        </span>
      </div>
      <button
        className="flex shrink-0 items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading}
        onClick={() => void signIn()}
        type="button"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={11} />
        ) : (
          <LogIn size={11} />
        )}
        {isLoading ? 'Opening...' : 'Login with Puter'}
      </button>
    </div>
  );
}
