import { useState } from 'react';
import type { QuizSource } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { Button } from '../../components/ui';
import { ErrorMessage, useOperation } from '../../components/DataState';
import { database } from '../../services/database';

export function QuizSourcePicker({ value, onChange }: { value: QuizSource; onChange: (source: QuizSource) => void }) {
 const { materials, mutate } = useData();
 const pdfId = value.kind === 'all' ? '' : value.sourcePdfId;
 const pdf = materials.find(m => m.id === pdfId);
 const [editing, setEditing] = useState(false), [unitId, setUnitId] = useState<string | undefined>();
 const [name, setName] = useState(''), [first, setFirst] = useState('1'), [last, setLast] = useState('1');
 const { busy, error, run } = useOperation();
 function change(kind: QuizSource['kind'], id = pdfId) {
  setEditing(false);
  onChange(kind === 'all' ? { kind } : kind === 'page' ? { kind, sourcePdfId: id, page: 1 } : kind === 'unit' ? { kind, sourcePdfId: id, unitId: materials.find(m => m.id === id)?.units?.[0]?.id ?? '' } : { kind, sourcePdfId: id });
 }
 return <fieldset disabled={busy} className="quiz-source-picker"><legend>Sumber latihan</legend>
  <label>Cakupan sumber<select aria-label="Cakupan sumber" value={value.kind} onChange={e => change(e.target.value as QuizSource['kind'])}>
   <option value="all">All Materials</option><option value="pdf">Specific PDF</option><option value="unit">Specific Unit/Chapter</option><option value="page">Specific Page</option>
  </select></label>
  {value.kind !== 'all' && <>
   <label>PDF sumber quiz<select aria-label="PDF sumber quiz" value={pdfId} onChange={e => change(value.kind, e.target.value)}><option value="">Pilih PDF</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name}{m.isDummy ? ' · referensi demo' : ''}</option>)}</select></label>
   {pdf && <p className="small-note">{pdf.filename} · {pdf.totalPages} halaman. Hanya materi di database yang digunakan; draf yang belum disetujui tidak masuk quiz.</p>}
   {value.kind === 'page' && pdf && <label>Halaman PDF<input aria-label="Halaman PDF" type="number" min={1} max={pdf.totalPages} value={value.page || ''} onChange={e => onChange({ ...value, page: Number(e.target.value) })} /></label>}
   {value.kind === 'unit' && pdf && <>
    <label>Unit / Chapter<select aria-label="Unit / Chapter" value={value.unitId} onChange={e => onChange({ ...value, unitId: e.target.value })}><option value="">Pilih unit/bab</option>{pdf.units?.map(u => <option value={u.id} key={u.id}>{u.name} · Page {u.startPage}–{u.endPage}</option>)}</select></label>
    <div className="entry-actions"><Button type="button" variant="secondary" onClick={() => { setUnitId(undefined); setName(''); setFirst('1'); setLast('1'); setEditing(true); }}>Tambah unit/bab</Button>{value.unitId && <Button type="button" variant="secondary" onClick={() => { const unit = pdf.units?.find(u => u.id === value.unitId); if(unit) { setUnitId(unit.id); setName(unit.name); setFirst(String(unit.startPage)); setLast(String(unit.endPage)); setEditing(true); } }}>Edit unit/bab</Button>}</div>
    {editing && <div className="quiz-unit-editor"><p className="small-note">Tentukan rentang halaman sesuai PDF. Nama bab tidak ditebak dari isi buku. Gunakan nomor halaman reader, bukan nomor cetak.</p>
     <label>Nama unit/bab<input aria-label="Nama unit/bab" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
     <div className="form-columns"><label>Halaman awal<input aria-label="Halaman awal" type="number" min={1} max={pdf.totalPages} value={first} onChange={e => setFirst(e.target.value)} /></label><label>Halaman akhir<input aria-label="Halaman akhir" type="number" min={1} max={pdf.totalPages} value={last} onChange={e => setLast(e.target.value)} /></label></div>
     <div className="entry-actions"><Button type="button" onClick={() => void run(async () => { let saved = ''; await mutate(async () => { saved = await database.pdf.saveUnit(pdf.id, { id: unitId, name, startPage: Number(first), endPage: Number(last) }); }); onChange({ kind: 'unit', sourcePdfId: pdf.id, unitId: saved }); setEditing(false); })}>{busy ? 'Menyimpan…' : 'Simpan unit'}</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Batal</Button></div>
    </div>}
   </>}
   <p className="small-note">Filter level, kategori, dan jenis soal tetap berlaku pada sumber terpilih.</p>
  </>}
  <ErrorMessage message={error} />
 </fieldset>;
}
