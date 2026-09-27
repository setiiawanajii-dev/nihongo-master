import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useData } from '../app/data/DataProvider';
import { Button } from './ui';

export function DataState({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useData();
  if (loading) return <p role="status" className="info-banner">Membuka database pembelajaran…</p>;
  if (error) return <div className="info-banner" role="alert"><div><p>{error}</p><Button variant="secondary" onClick={() => { void refresh().catch(() => undefined); }}>Coba lagi</Button></div></div>;
  return <>{children}</>;
}
export function useOperation() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(operation: () => Promise<unknown>, success?: () => void) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError('');
    try { await operation(); success?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Perubahan gagal disimpan. Coba lagi.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return { busy, error, run };
}
export function ErrorMessage({ message }: { message: string }) { return message ? <p className="form-error" role="alert">{message}</p> : null; }
