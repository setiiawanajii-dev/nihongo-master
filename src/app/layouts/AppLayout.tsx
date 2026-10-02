import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Moon, Sun, Sprout, ArrowUpRight } from 'lucide-react';
import { navigation } from '../navigation';
import { useTheme } from '../theme';
import { Button } from '../../components/ui';

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return <Link to="/dashboard" onClick={onNavigate} className="brand" aria-label="Nihongo Master — Dashboard"><span className="brand-mark">日<span /></span><span><strong>Nihongo Master</strong><small lang="ja">日本語マスター</small></span></Link>;
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Navigasi utama">{['learn', 'library', 'settings'].map(group => <div className="nav-group" key={group}>{group !== 'settings' && <p className="nav-label">{group === 'learn' ? 'RUANG BELAJAR' : 'KOLEKSI SAYA'}</p>}{navigation.filter(item => item.group === group).map(({ path, label, japanese, icon: Icon }) => <NavLink key={path} to={path} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span><small lang="ja">{japanese}</small></NavLink>)}</div>)}</nav>;
}
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return <><Brand onNavigate={onNavigate} /><Navigation onNavigate={onNavigate} /><div className="sidebar-bottom"><div className="journey-note"><Sprout size={23} /><p>Sedikit setiap hari.<br /><strong>Jauh pada akhirnya.</strong></p><span lang="ja">一歩ずつ、前へ。</span></div><p className="sidebar-footer"><span className="status-dot" /> Ruang belajar pribadi <small>v0.13</small></p></div></>;
}

export function AppLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const menuNavigated = useRef(false);
  const current = navigation.find(item => item.path === location.pathname || location.pathname.startsWith(item.path + '/'));
  function closeMenu() { dialogRef.current?.close(); }
  useEffect(() => {
    document.title = `${current?.label ?? 'Halaman tidak ditemukan'} · Nihongo Master`;
    window.scrollTo({ top: 0 });
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [location.pathname, current?.label]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (media.matches) closeMenu(); };
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);
  return <>
    <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
    <aside className="desktop-sidebar"><SidebarContent /></aside>
    <dialog id="mobile-navigation" ref={dialogRef} className="mobile-drawer" aria-label="Menu navigasi" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} onClose={() => { setMenuOpen(false); document.body.style.overflow = ''; if (menuNavigated.current) document.getElementById('page-title')?.focus({ preventScroll: true }); else menuRef.current?.focus(); menuNavigated.current = false; }}>
      <div className="drawer-inner"><Button variant="icon" className="drawer-close" aria-label="Tutup menu" onClick={closeMenu}><X size={21} /></Button><SidebarContent onNavigate={() => { menuNavigated.current = true; closeMenu(); }} /></div>
    </dialog>
    <div className="app-main">
      <header className="app-header"><div className="header-left"><Button variant="icon" className="mobile-menu-button" aria-label="Buka menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={event => { menuRef.current = event.currentTarget; dialogRef.current?.showModal(); setMenuOpen(true); document.body.style.overflow = 'hidden'; }}><Menu size={21} /></Button><span className="breadcrumb">Ruang belajar <span>/</span> <strong>{current?.label ?? '404'}</strong></span></div><div className="header-actions"><span className="local-label"><span className="status-dot" /> Personal workspace</span><Button variant="icon" aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</Button><Link to="/settings" className="avatar" aria-label="Buka pengaturan">私</Link></div></header>
      <main id="main-content" tabIndex={-1} className="page-content"><Outlet /></main>
      <footer className="main-footer"><span>日本語を覚える。使える日本語へ。</span><Link to="/settings">Dibuat untuk perjalananmu <ArrowUpRight size={13} /></Link></footer>
    </div>
  </>;
}
