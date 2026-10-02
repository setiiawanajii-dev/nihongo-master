import { Button, Card } from './ui';

export function RouteErrorPage() {
  return <main className="route-error"><Card><h1>Halaman belum dapat dibuka.</h1><p role="alert">Terjadi masalah saat membuka halaman. Coba muat ulang untuk melanjutkan. Memuat ulang tidak menghapus data yang sudah tersimpan.</p><div className="entry-actions"><Button onClick={() => window.location.reload()}>Muat ulang halaman</Button><a className="button button-secondary" href="/dashboard">Kembali ke dashboard</a></div></Card></main>;
}
