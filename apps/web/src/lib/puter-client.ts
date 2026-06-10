'use client';

import { useEffect, useState } from 'react';

export const puterClient = {
  isLoaded(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.puter !== 'undefined'
    );
  },

  isSignedIn(): boolean {
    return this.isLoaded() && window.puter!.auth.isSignedIn();
  },

  async signIn(): Promise<void> {
    if (!this.isLoaded()) {
      throw new Error('Puter.js is not loaded yet');
    }
    await window.puter!.auth.signIn();
  },

  async signOut(): Promise<void> {
    if (!this.isLoaded()) {
      throw new Error('Puter.js is not loaded yet');
    }
    await window.puter!.auth.signOut();
  },

  async getUser(): Promise<{ username: string } | null> {
    if (!this.isLoaded() || !this.isSignedIn()) {
      return null;
    }
    return window.puter!.auth.getUser();
  },

  async *streamChat(
    messages: PuterAIMessage[],
    model = 'gpt-5.4-nano',
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isLoaded()) {
      throw new Error('Puter.js is not loaded');
    }
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Puter');
    }

    const response = await window.puter!.ai.chat(messages, {
      model,
      stream: true,
    });

    for await (const part of response as AsyncIterable<PuterAIStreamChunk>) {
      const text = part.text ?? '';
      if (text) {
        yield text;
      }
    }
  },
};

interface PuterAuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  username: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function usePuterAuth(): PuterAuthState {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    const syncAuthState = async (): Promise<void> => {
      if (!isMounted) {
        return;
      }

      const loaded = puterClient.isLoaded();
      const signedIn = loaded && puterClient.isSignedIn();
      setIsLoaded(loaded);
      setIsSignedIn(signedIn);

      if (!signedIn) {
        setUsername(null);
        return;
      }

      const user = await puterClient.getUser();
      if (isMounted) {
        setUsername(user?.username ?? null);
      }
    };

    if (puterClient.isLoaded()) {
      void syncAuthState();
      return () => {
        isMounted = false;
      };
    }

    const interval = window.setInterval(() => {
      attempts += 1;
      if (puterClient.isLoaded() || attempts >= 30) {
        window.clearInterval(interval);
        if (puterClient.isLoaded()) {
          void syncAuthState();
        }
      }
    }, 500);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const signIn = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await puterClient.signIn();
      const user = await puterClient.getUser();
      setIsSignedIn(true);
      setUsername(user?.username ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.warn(`[Puter] Sign in was not completed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await puterClient.signOut();
      setIsSignedIn(false);
      setUsername(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.warn(`[Puter] Sign out failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoaded,
    isSignedIn,
    username,
    isLoading,
    signIn,
    signOut,
  };
}
