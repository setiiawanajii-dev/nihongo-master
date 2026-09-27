import { type FormEvent } from 'react';
import type { ContentKind, Grammar, JLPTLevel, Vocabulary } from '../../domain/models';
import { useData } from '../../app/data/DataProvider';
import { database } from '../../services/database';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { ErrorMessage, useOperation } from '../../components/DataState';

export function ContentEditor({ kind, item, onClose }: { kind: ContentKind; item?: Vocabulary | Grammar; onClose: () => void }) {
  const { categories, grammar, mutate } = useData();
  const { busy, error, run } = useOperation();
  const v = kind === 'vocabulary' ? item as Vocabulary | undefined : undefined;
  const g = kind === 'grammar' ? item as Grammar | undefined : undefined;
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const string = (key: string) => String(form.get(key) ?? '').trim();
    const common = { meaning: string('meaning'), jlptLevel: string('jlptLevel') as JLPTLevel,
      categoryIds: form.getAll('categoryIds').map(String),
      notes: string('notes'), difficulty: Number(form.get('difficulty')) as Vocabulary['difficulty'],
      isSeed: item?.isSeed ?? false };
    void run(() => mutate(async () => {
      if (kind === 'vocabulary') {
        const data = { ...common, kanji: string('kanji'), kana: string('kana'), romaji: string('romaji'), partOfSpeech: string('partOfSpeech') };
        if (item) await database.vocabulary.update(item.id, data); else await database.vocabulary.create(data);
      } else {
        const data = { ...common, pattern: string('pattern'), formation: string('formation'), explanation: string('explanation'), commonMistakes: string('commonMistakes'), comparisonIds: form.getAll('comparisonIds').map(String) };
        if (item) await database.grammar.update(item.id, data); else await database.grammar.create(data);
      }
    }), onClose);
  }
  return <Modal title={`${item ? 'Edit' : 'Tambah'} ${kind}`} onClose={onClose} busy={busy}><form onSubmit={save} className="data-form"><fieldset disabled={busy}>
    {kind === 'vocabulary' ? <><label>Kanji / kata Jepang<input name="kanji" required defaultValue={v?.kanji} /></label><div className="form-columns"><label>Kana<input name="kana" required defaultValue={v?.kana} /></label><label>Romaji<input name="romaji" required={!item?.importedFromFile} defaultValue={v?.romaji} /></label></div><label>Part of speech<input name="partOfSpeech" required={!item?.importedFromFile} defaultValue={v?.partOfSpeech ?? '名詞'} /></label></> : <><label>Grammar pattern<input name="pattern" required defaultValue={g?.pattern} /></label><label>Pola pembentukan<input name="formation" required defaultValue={g?.formation} /></label><label>Penjelasan<textarea aria-label="Penjelasan" name="explanation" required={!item?.importedFromFile} defaultValue={g?.explanation} /></label><label>Kesalahan umum<textarea aria-label="Kesalahan umum" name="commonMistakes" defaultValue={g?.commonMistakes} /></label></>}
    <label>Arti Indonesia<input name="meaning" required defaultValue={item?.meaning} /></label><div className="form-columns"><label>JLPT<select name="jlptLevel" defaultValue={item?.jlptLevel ?? 'N3'}>{['N5', 'N4', 'N3', 'N2'].map(level => <option key={level}>{level}</option>)}</select></label><label>Kesulitan<select name="difficulty" defaultValue={item?.difficulty ?? 3}>{[1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level}</option>)}</select></label></div>
    <fieldset className="category-checkboxes"><legend>Kategori</legend>{categories.map(category => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={item?.categoryIds.includes(category.id)} />{category.name}</label>)}</fieldset>
    {kind === 'grammar' && <fieldset className="category-checkboxes"><legend>Grammar terkait</legend>{grammar.filter(row => row.id !== item?.id).map(row => <label key={row.id}><input name="comparisonIds" type="checkbox" value={row.id} defaultChecked={g?.comparisonIds.includes(row.id)} />{row.pattern}</label>)}</fieldset>}
    <label>Catatan materi<textarea aria-label="Catatan materi" name="notes" defaultValue={item?.notes} /></label>
    </fieldset><ErrorMessage message={error} /><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Batal</Button><Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan materi'}</Button></div></form></Modal>;
}
