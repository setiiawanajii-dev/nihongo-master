import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '../../components/ui';

export function NotFoundPage() {
  return <><PageHeading eyebrow="404 / ページが見つかりません" title="Sepertinya kamu salah jalan." description="Halaman ini tidak ditemukan. Ruang belajarmu tetap ada di sini." /><Link className="button button-primary" to="/dashboard"><ArrowLeft size={17} /> Kembali ke dashboard</Link></>;
}
