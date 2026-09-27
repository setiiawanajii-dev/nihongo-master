import { useState, type FormEvent } from 'react';
import type { Category } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Button, Card } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { DataState, ErrorMessage, useOperation } from '../../components/DataState';

export function CategoryManager() {
  const { categories, vocabulary, grammar, mutate } = useData();
  const [edit, setEdit] = useState<Category | 'new' | null>(null);
  const { busy, error, run } = useOperation();
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = { name: String(form.get('name')).trim(), description: String(form.get('description')).trim() };
    void run(() => mutate(() => edit && edit !== 'new' ? database.categories.update(edit.id, values) : database.categories.create({ ...values, isSeed: false })), () => setEdit(null));
  }
  return <Card className="settings-card"><div className="section-heading"><div><h2>Kategori materi</h2><p className="muted text-sm mt-2">Kelompokkan materi sesuai kebutuhanmu.</p></div><Button onClick={() => setEdit('new')}>Tambah kategori</Button></div><DataState><ErrorMessage message={edit ? '' : error} /><div className="category-list">{categories.map(category => <div className="category-row" key={category.id}><div><strong>{category.name}</strong><p className="small-note">{category.description} · {[...vocabulary, ...grammar].filter(item => item.categoryIds.includes(category.id)).length} materi</p></div><div className="entry-actions"><Button variant="secondary" onClick={() => setEdit(category)}>Edit</Button><Button variant="secondary" disabled={busy} onClick={() => { if (window.confirm(`Hapus kategori ${category.name}? Materi tetap disimpan; hanya hubungan kategori yang dilepas.`)) void run(() => mutate(() => database.categories.delete(category.id))); }}>Hapus</Button></div></div>)}</div>{categories.length === 0 && <p className="detail-paragraph">Belum ada kategori. Tambahkan kategori pertamamu.</p>}</DataState>{edit && <Modal title={edit === 'new' ? 'Tambah kategori' : 'Edit kategori'} onClose={() => setEdit(null)} busy={busy}><form className="data-form" onSubmit={save}><label>Nama kategori<input name="name" required defaultValue={edit === 'new' ? '' : edit.name} /></label><label>Deskripsi kategori<textarea aria-label="Deskripsi kategori" name="description" defaultValue={edit === 'new' ? '' : edit.description} /></label><ErrorMessage message={error} /><div className="form-actions"><Button disabled={busy} type="submit">Simpan kategori</Button></div></form></Modal>}</Card>;
}
