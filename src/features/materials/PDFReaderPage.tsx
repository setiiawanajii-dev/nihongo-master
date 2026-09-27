import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { ArrowLeft, Bookmark, Check, ChevronLeft, ChevronRight, Files } from 'lucide-react';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Button, Card, EmptyState, PageHeading, ProgressBar } from '../../components/ui';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';
import type { PDFReadingProgress } from '../../domain/models';

export function PDFReaderPage() {
  const { id = '' } = useParams(); const data = useData(); const [params, setParams] = useSearchParams();
  const m = data.materials.find(m => m.id === id); const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [reading, setReading] = useState<PDFReadingProgress>(); const [loadError, setLoadError] = useState(''); const [renderError, setRenderError] = useState(''); const [renderedPage, setRenderedPage] = useState(0); const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1); const [width, setWidth] = useState(600); const host = useRef<HTMLDivElement>(null); const viewport = useRef<HTMLDivElement>(null);
  const { busy, error, run } = useOperation(); const raw = params.get('page'); const parsed = Number(raw); const page = raw === null ? reading?.lastPage ?? 1 : Math.min(m?.totalPages ?? 1, Math.max(1, Number.isSafeInteger(parsed) ? parsed : 1));
  const [pageInput, setPageInput] = useState(String(page));
  useEffect(() => setPageInput(String(page)), [page]);
  useEffect(() => { let active = true; void database.pdf.reading(id).then(p => { if (active) setReading(p); }).catch(e => { if (active) setLoadError(String(e)); }); return () => { active = false; }; }, [id, data.materials]);
  useEffect(() => {
    let active = true; let task: ReturnType<typeof import('../../infrastructure/pdf/document')['loadPdf']> | undefined;
    setPdf(null); setLoadError(''); setRenderedPage(0);
    if (m?.file) void (async () => {
      try { const { loadPdf } = await import('../../infrastructure/pdf/document'); const blob = await database.pdf.getFile(m.file!); if (!blob) throw new Error('Berkas PDF tidak ditemukan. Kembali ke koleksi dan unggah kembali.'); const bytes = new Uint8Array(await blob.arrayBuffer()); if (!active) return; task = loadPdf(bytes); const doc = await task.promise; if (active) setPdf(doc); }
      catch (e) { if (active) setLoadError(e instanceof Error && e.name === 'PasswordException' ? 'PDF terkunci dengan kata sandi.' : e instanceof Error ? e.message : 'PDF tidak dapat dibuka.'); }
    })();
    return () => { active = false; if (task) void task.destroy(); };
  }, [id, m?.file, retry]);
  useEffect(() => { if (!viewport.current) return; const observer = new ResizeObserver(entries => setWidth(Math.max(160, entries[0].contentRect.width - 24))); observer.observe(viewport.current); return () => observer.disconnect(); }, [pdf]);
  useEffect(() => {
    if (!pdf || !host.current) return;
    let active = true; let render: RenderTask | undefined; const container = host.current; setRenderedPage(0); setRenderError('');
    const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `PDF halaman ${page}`); container.replaceChildren(canvas);
    void (async () => { try {
      const p = await pdf.getPage(page); if (!active) return;
      const base = p.getViewport({ scale: 1 }); const scale = Math.min(width / base.width, 1.5) * zoom; const v = p.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(16_000_000 / (v.width * v.height)));
      canvas.width = Math.floor(v.width * ratio); canvas.height = Math.floor(v.height * ratio); canvas.style.width = `${v.width}px`; canvas.style.height = `${v.height}px`;
      render = p.render({ canvas, viewport: v, transform: [ratio, 0, 0, ratio, 0, 0] }); await render.promise;
      if (active) { setRenderedPage(page); await database.pdf.visit(id, page); }
    } catch (e) { if (active) setRenderError(e instanceof Error ? e.message : 'Halaman gagal ditampilkan.'); } })();
    return () => { active = false; render?.cancel(); canvas.remove(); };
  }, [pdf, page, zoom, width, id]);
  const completed = reading?.completedPageNumbers.includes(page) ?? false;
  const bookmarks = data.favorites.filter(f => f.target.type === 'pdf-page' && f.target.materialId === id).sort((a,b) => (a.target.type === 'pdf-page' ? a.target.pageNumber : 0) - (b.target.type === 'pdf-page' ? b.target.pageNumber : 0));
  const bookmarked = bookmarks.some(f => f.target.type === 'pdf-page' && f.target.pageNumber === page);
  const ready = renderedPage === page && !!pdf && !renderError;
  const go = (next: number) => { const n = Math.max(1, Math.min(m?.totalPages ?? 1, next)); setParams({ page: String(n) }, { replace: true }); };
  return <><Link className="text-link detail-back" to="/materials"><ArrowLeft size={16} />Kembali ke materi PDF</Link><PageHeading eyebrow="PDF READER / 読書" title={m?.name ?? 'PDF tidak ditemukan'} description={m ? `${m.filename} · ${m.totalPages} halaman · ${m.source || 'Berkas pribadi'}` : 'Pilih PDF dari koleksi untuk mulai membaca.'} /><DataState>{!m?.file ? <EmptyState icon={Files} title={m?.isDummy ? 'Referensi dummy tanpa berkas' : 'PDF tidak tersedia'} description={m?.isDummy ? 'Sumber seed hanya metadata. Unggah PDF asli dari halaman materi untuk membacanya.' : 'PDF mungkin sudah dihapus. Materi lainnya tetap tersedia.'} to="/materials" action="Buka koleksi PDF" /> : <div className="pdf-reader"><Link className="button button-secondary" to={`/material-check?pdf=${id}`}>Extract text / Material Review</Link>
    <Card className="pdf-toolbar"><div className="pdf-page-controls"><Button variant="secondary" aria-label="Previous page" disabled={!pdf || page === 1} onClick={() => go(page - 1)}><ChevronLeft size={18} /></Button><form onSubmit={e => { e.preventDefault(); const n = Number(pageInput); if (Number.isInteger(n)) go(n); }}><label>Halaman<input aria-label="Page number" type="number" min={1} max={m.totalPages} value={pageInput} onChange={e => setPageInput(e.target.value)} /></label><span>/ {m.totalPages}</span><Button variant="secondary" type="submit" disabled={!pdf}>Buka</Button></form><Button variant="secondary" aria-label="Next page" disabled={!pdf || page === m.totalPages} onClick={() => go(page + 1)}><ChevronRight size={18} /></Button></div><label className="pdf-zoom">Zoom<select aria-label="Zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[0.5,0.75,1,1.25,1.5,2,3].map(z => <option key={z} value={z}>{z === 1 ? 'Pas lebar' : `${z * 100}%`}</option>)}</select></label></Card>
    <ErrorMessage message={loadError || renderError || error} />{(loadError || renderError) && <Button variant="secondary" onClick={() => setRetry(v => v + 1)}>Coba muat PDF lagi</Button>}
    <div className="pdf-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Halaman PDF, gunakan tombol panah untuk menggeser saat diperbesar" aria-busy={!ready && !loadError && !renderError}>{!ready && !loadError && !renderError && <p role="status">Memuat halaman PDF…</p>}<div ref={host} className="pdf-canvas-host" /></div>
    <Card className="pdf-tracking"><p role="status">Halaman {page} / {m.totalPages}{completed ? ' · Selesai' : ''}</p><div className="entry-actions"><Button variant="secondary" disabled={!ready || busy} aria-pressed={bookmarked} onClick={() => void run(() => data.mutate(() => database.pdf.bookmark(id, page, !bookmarked)))}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} />{bookmarked ? 'Hapus bookmark' : 'Bookmark halaman'}</Button><Button disabled={!ready || busy} aria-pressed={completed} onClick={() => void run(async () => { await data.mutate(() => database.pdf.complete(id, page, !completed)); setReading(await database.pdf.reading(id)); })}><Check size={17} />{completed ? 'Batalkan halaman selesai' : 'Tandai halaman selesai'}</Button></div><p className="small-note">{m.completedPages} dari {m.totalPages} halaman selesai · {Math.round(m.completedPages / m.totalPages * 100)}%</p><ProgressBar label="Progres membaca PDF" value={m.completedPages} max={m.totalPages} /><p className="small-note">Progres bacaan terpisah dari mastery. Ekstraksi tersedia melalui Material Review; persetujuan tetap diperlukan.</p></Card>
    <Card className="pdf-tracking"><h2>Bookmark</h2><div className="entry-actions">{bookmarks.map(f => f.target.type === 'pdf-page' && <Button key={f.id} variant="secondary" onClick={() => go(f.target.type === 'pdf-page' ? f.target.pageNumber : 1)}>Halaman {f.target.pageNumber}</Button>)}</div>{!bookmarks.length && <p className="muted">Belum ada bookmark pada PDF ini.</p>}<Link className="text-link" to="/favorites">Lihat semua favorit</Link></Card>
  </div>}</DataState></>;
}
