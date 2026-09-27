import { Link } from 'react-router-dom';
import { useData } from '../../app/data/DataProvider';
import type { SourceReference } from '../../domain/models';
export function SourceLink({ source, filename }: { source: SourceReference; filename?: string }) {
  const { materials } = useData(); const m = materials.find(m => m.id === source.sourcePdfId);
  return <span className="pdf-source-reference">Sumber: {filename ?? m?.filename ?? source.sourcePdfId} · Halaman {source.sourcePage}{m?.file ? <Link className="text-link" to={`/materials/${encodeURIComponent(m.id)}?page=${source.sourcePage}`}>Buka halaman sumber</Link> : <span className="small-note">{m?.isDummy ? 'Referensi dummy; bukan PDF asli.' : 'Berkas sumber tidak tersedia.'}</span>}</span>;
}
