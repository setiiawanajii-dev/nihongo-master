import type { PDFMaterial, QuizSource, SourceReference } from '../models';

// Resolve against stored PDF metadata, never trust page bounds supplied by the caller.
export function sourcePredicate(source: QuizSource | undefined, materials: PDFMaterial[] = []): (ref: SourceReference) => boolean {
 if (!source || source.kind === 'all') return () => true;
 if (!['pdf','unit','page'].includes(source.kind) || typeof source.sourcePdfId !== 'string') throw new Error('Pilih sumber quiz yang valid.');
 const pdf = materials.find(m => m.id === source.sourcePdfId);
 if (!pdf) throw new Error('Pilih PDF sumber yang tersedia.');
 let first = 1, last = pdf.totalPages;
 if (source.kind === 'page') first = last = source.page;
 if (source.kind === 'unit') {
  const unit = pdf.units?.find(u => u.id === source.unitId);
  if (!unit) throw new Error('Pilih unit/bab atau tambahkan rentang halamannya.');
  first = unit.startPage; last = unit.endPage;
 }
 if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first || last > pdf.totalPages) throw new Error('Nomor halaman sumber tidak valid.');
 return ref => ref.sourcePdfId === pdf.id && ref.sourcePage >= first && ref.sourcePage <= last;
}

export function sourceLabel(source: QuizSource | undefined, materials: PDFMaterial[]) {
 if (!source || source.kind === 'all') return 'All Materials';
 const pdf = materials.find(m => m.id === source.sourcePdfId)!;
 if (source.kind === 'page') return `${pdf.name} · Page ${source.page}`;
 if (source.kind === 'unit') { const unit = pdf.units!.find(u => u.id === source.unitId)!; return `${pdf.name} · ${unit.name} · Page ${unit.startPage}–${unit.endPage}`; }
 return pdf.name;
}
