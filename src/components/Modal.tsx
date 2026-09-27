import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui';

export function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.showModal();
    return () => { ref.current?.close(); document.body.style.overflow = overflow; previouslyFocused?.focus(); };
  }, []);
  return <dialog className="data-modal" ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (!busy && event.target === event.currentTarget) { const r = ref.current!.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}><div className="modal-header"><h2 id={titleId}>{title}</h2><Button variant="icon" aria-label="Tutup dialog" disabled={busy} onClick={onClose}><X size={20} /></Button></div><div className="modal-body">{children}</div></dialog>;
}
