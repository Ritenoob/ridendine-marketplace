'use client';

import { useState, useEffect } from 'react';

export type EtaResult = {
  minMinutes: number;
  maxMinutes: number;
  prepTime: number;
  driveTime: number;
};

type EtaState = {
  eta: EtaResult | null;
  loading: boolean;
};

const FALLBACK: EtaResult = { minMinutes: 30, maxMinutes: 45, prepTime: 20, driveTime: 0 };

export function useEta(storefrontId: string | null, addressId: string | null): EtaState {
  const [state, setState] = useState<EtaState>({ eta: null, loading: false });

  useEffect(() => {
    if (!storefrontId || !addressId) {
      setState({ eta: null, loading: false });
      return;
    }

    setState({ eta: null, loading: true });

    const controller = new AbortController();

    fetch(`/api/eta?storefrontId=${storefrontId}&addressId=${encodeURIComponent(addressId)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: EtaResult) => {
        setState({ eta: data, loading: false });
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setState({ eta: FALLBACK, loading: false });
      });

    return () => controller.abort();
  }, [storefrontId, addressId]);

  return state;
}
