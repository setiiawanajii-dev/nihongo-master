import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export function loadPdf(data: Uint8Array) {
  return getDocument({ data, cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true, standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`, wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/` });
}
export function pdfError(error: unknown): string {
  if (error instanceof Error && error.name === 'PasswordException') return 'PDF terkunci dengan kata sandi. Unggah salinan tanpa kata sandi.';
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'Penyimpanan browser penuh. Hapus PDF yang tidak digunakan, lalu coba lagi.';
  return error instanceof Error ? error.message : 'PDF tidak dapat dibuka. Periksa berkas lalu coba lagi.';
}
export async function inspectPdf(file: File) {
  if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Pilih berkas PDF dengan ekstensi .pdf.');
  if (file.size === 0 || file.size > MAX_PDF_BYTES) throw new Error('Ukuran PDF harus lebih dari 0 dan maksimal 50 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('Berkas ini bukan PDF yang valid.');
  const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const task = loadPdf(bytes);
  try { const pdf = await task.promise; if (!pdf.numPages || pdf.numPages > 5000) throw new Error('PDF harus memiliki 1–5000 halaman.'); await pdf.getPage(1); return { totalPages: pdf.numPages, checksum }; }
  catch (error) { throw new Error(pdfError(error)); }
  finally { await task.destroy(); }
}
