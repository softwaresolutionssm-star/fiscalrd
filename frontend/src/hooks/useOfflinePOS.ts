'use client';
import { useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

const DB_NAME = 'fiscalrd_pos';
const DB_VERSION = 1;
const STORE_SALES = 'pending_sales';

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_SALES, { keyPath: 'localId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingSale(sale: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    tx.objectStore(STORE_SALES).put({ ...sale, localId: sale.localId ?? crypto.randomUUID() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSales(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const req = tx.objectStore(STORE_SALES).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncedSales(localIds: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    localIds.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── NCF Pool (localStorage) ────────────────────────────────────────────────────

const NCF_POOL_KEY = 'pos_ncf_pool';

export function getNcfPool(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(NCF_POOL_KEY) ?? '{}'); }
  catch { return {}; }
}

export function saveNcfPool(pool: Record<string, string[]>): void {
  localStorage.setItem(NCF_POOL_KEY, JSON.stringify(pool));
}

export function consumeNcf(ncfType: string): string | null {
  const pool = getNcfPool();
  const list = pool[ncfType] ?? [];
  if (list.length === 0) return null;
  const ncf = list.shift()!;
  pool[ncfType] = list;
  saveNcfPool(pool);
  return ncf;
}

export function ncfPoolCount(ncfType: string): number {
  return (getNcfPool()[ncfType] ?? []).length;
}

// ── Products Cache (localStorage) ─────────────────────────────────────────────

const PRODUCTS_CACHE_KEY = 'pos_products_cache';
const CUSTOMERS_CACHE_KEY = 'pos_customers_cache';

export function getCachedProducts(): any[] {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

export function setCachedProducts(products: any[]): void {
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
}

export function getCachedCustomers(): any[] {
  try { return JSON.parse(localStorage.getItem(CUSTOMERS_CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

export function setCachedCustomers(customers: any[]): void {
  localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
}

// ── Sync Hook ──────────────────────────────────────────────────────────────────

export function useOfflineSync(onSynced?: (count: number) => void) {
  const syncing = useRef(false);

  const syncPending = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    const pending = await getPendingSales();
    if (pending.length === 0) return;

    syncing.current = true;
    try {
      const res = await api.post('/sales/sync-offline', { sales: pending });
      const { synced } = res.data?.data ?? res.data;
      if (synced > 0) {
        await clearSyncedSales(pending.map((s: any) => s.localId));
        onSynced?.(synced);
      }
    } catch { /* retry on next online event */ }
    finally { syncing.current = false; }
  }, [onSynced]);

  useEffect(() => {
    window.addEventListener('online', syncPending);
    // Also try on mount (in case we were offline and came back)
    syncPending();
    return () => window.removeEventListener('online', syncPending);
  }, [syncPending]);

  return { syncPending };
}
