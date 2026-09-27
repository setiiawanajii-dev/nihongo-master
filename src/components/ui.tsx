import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'icon' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'orange' | 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={safeMax}><span style={{ width: `${safeValue / safeMax * 100}%` }} /></div>;
}
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1 ref={heading} tabIndex={-1} id="page-title">{title}</h1><p className="muted page-description">{description}</p></div>{children}</div>;
}
export function SectionHeading({ title, subtitle, to, action }: { title: string; subtitle?: string; to?: string; action?: string }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p className="muted text-sm mt-1">{subtitle}</p>}</div>{to && <Link className="text-link" to={to}>{action ?? 'Lihat semua'} <ArrowUpRight size={15} /></Link>}</div>;
}
export function EmptyState({ icon: Icon, title, description, to, action }: { icon: LucideIcon; title: string; description: string; to?: string; action?: string }) {
  return <Card className="empty-state"><span className="empty-icon"><Icon size={28} strokeWidth={1.5} /></span><h2>{title}</h2><p className="muted">{description}</p>{to && <Link className="button button-secondary" to={to}>{action} <ArrowUpRight size={16} /></Link>}</Card>;
}
