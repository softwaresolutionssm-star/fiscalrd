'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

export interface ExchangeRateData {
  rate: number;       // DOP per 1 USD
  fetchedAt: string;
  source: string;
}

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // Refresh every 15 minutes

export function useExchangeRate() {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/exchange-rate');
      setData(res.data.data ?? res.data);
      setError(null);
    } catch {
      setError('No se pudo obtener la tasa de cambio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetch]);

  const forceRefresh = async () => {
    setLoading(true);
    try {
      const res = await api.post('/exchange-rate/refresh');
      setData(res.data.data ?? res.data);
      setError(null);
    } catch {
      setError('Error al actualizar tasa');
    } finally {
      setLoading(false);
    }
  };

  return { rate: data?.rate ?? null, loading, error, fetchedAt: data?.fetchedAt ?? null, forceRefresh };
}
