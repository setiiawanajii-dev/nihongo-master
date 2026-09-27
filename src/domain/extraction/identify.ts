import type { DraftKind, ExtractionDraft, ExtractionFields, PDFPage } from '../models';
export const emptyFields = (): ExtractionFields => ({kanji:'',kana:'',meaning:'',pattern:'',formation:'',explanation:'',example:'',translation:'',romaji:'',partOfSpeech:''});
export const normalizeEvidence = (text: string) => text.normalize('NFKC').replace(/\s+/g, '');
export const hasEvidence = (text: string, value: string) => !value.trim() || normalizeEvidence(text).includes(normalizeEvidence(value));
const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const kana = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u;
export function missingFields(draft: Pick<ExtractionDraft, 'kind'|'fields'>) {
  const keys = draft.kind === 'vocabulary' ? ['kanji','kana','meaning'] : draft.kind === 'grammar' ? ['pattern','meaning','formation','explanation'] : ['example'];
  return keys.filter(k => !draft.fields[k as keyof ExtractionFields].trim());
}
// Deliberately conservative: labels/columns are evidence, never a bilingual dictionary or a language model.
function fingerprint(value: string) {
  let a=2166136261,b=5381;
  for(const char of value){a=Math.imul(a^char.charCodeAt(0),16777619);b=Math.imul(b,33)^char.charCodeAt(0);}
  return `${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`;
}
export function identifyPage(page: PDFPage): ExtractionDraft[] {
  const candidates: {kind: DraftKind; fields: ExtractionFields; lines: string[]}[] = [];
  let current: typeof candidates[number] | undefined;
  const flush = () => { if(current) candidates.push(current); current = undefined; };
  const start = (kind: DraftKind, line: string) => { flush(); current = {kind,fields:emptyFields(),lines:[line]}; };
  const labels: Record<string,keyof ExtractionFields> = {kanji:'kanji','漢字':'kanji',kana:'kana','読み方':'kana','読み':'kana',meaning:'meaning',arti:'meaning','意味':'meaning','pattern':'pattern','pola':'pattern','文型':'pattern','pattern structure':'formation',structure:'formation',formation:'formation','接続':'formation','pola pembentukan':'formation',explanation:'explanation','penjelasan':'explanation','説明':'explanation',example:'example','contoh':'example','例文':'example',translation:'translation','terjemahan':'translation','訳':'translation',romaji:'romaji','part of speech':'partOfSpeech','品詞':'partOfSpeech'};
  for (const raw of page.text.split('\n')) {
    const line=raw.trim(); if(!line) { flush(); continue; }
    const header=line.match(/^(Vocabulary|Kosakata|単語|語彙|Grammar|文法)\s*[:：]\s*(.*)$/i);
    if(header) { const kind=/^(grammar|文法)$/i.test(header[1])?'grammar':'vocabulary';start(kind,line);current!.fields[kind==='grammar'?'pattern':'kanji']=header[2].trim();continue; }
    const label=line.match(/^([^:：]+)[:：]\s*(.*)$/);
    const field=label && labels[label[1].trim().toLowerCase()];
    if(field && label) {
      if(field==='kanji' && current?.fields.kanji || field==='pattern' && current?.fields.pattern) flush();
      if(!current) start(field==='pattern'||field==='formation'||field==='explanation'?'grammar':field==='example'||field==='translation'?'example':'vocabulary',line); else current.lines.push(line);
      if(current!.fields[field]) { flush(); start(field==='example'?'example':'vocabulary',line); }
      current!.fields[field]=label[2].trim();continue;
    }
    flush();
    const columns=line.split(/\t+|\s*\|\s*|\s{2,}/).map(s=>s.trim()).filter(Boolean);
    if(columns.length>=2 && japanese.test(columns[0]) && kana.test(columns[1]) && !/[。！？]/.test(columns[0])) {
      const fields=emptyFields();fields.kanji=columns[0];fields.kana=columns[1];fields.meaning=columns[2]??'';
      candidates.push({kind:'vocabulary',fields,lines:[line]});continue;
    }
    const brackets=line.match(/^(.+?)[（(]([\p{Script=Hiragana}\p{Script=Katakana}ー・]+)[）)]\s*(.*)$/u);
    if(brackets && japanese.test(brackets[1])) {const fields=emptyFields();fields.kanji=brackets[1].trim();fields.kana=brackets[2];fields.meaning=brackets[3].trim();candidates.push({kind:'vocabulary',fields,lines:[line]});continue;}
    if(japanese.test(line)) {
      const fields=emptyFields();
      if(/[。！？]$/.test(line)) {fields.example=line;candidates.push({kind:'example',fields,lines:[line]});}
      else if(line.length<=35 && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー〜～…・\s]+$/u.test(line)) {
        const kind=/[〜～…]/.test(line)?'grammar':'vocabulary';fields[kind==='grammar'?'pattern':'kanji']=line;candidates.push({kind,fields,lines:[line]});
      }
    }
  }
  flush();
  const seen = new Set<string>();
  return candidates.filter(c => (c.fields.kanji || c.fields.pattern || c.fields.example) && !Object.values(c.fields).some(v=>!hasEvidence(page.text,v))).flatMap(c => {
    const signature=JSON.stringify([c.kind,c.fields]);if(seen.has(signature))return [];seen.add(signature);
    const draft: ExtractionDraft = {id:`${page.id}:draft:${fingerprint(signature)}`,sourcePdfId:page.materialId,sourcePage:page.pageNumber,kind:c.kind,fields:c.fields,sourceText:c.lines.join('\n'),reasons:['Identifikasi berbasis tata letak/label; periksa konteks dan arti pada PDF.'],status:'PENDING',revision:0,jlptLevel:null,targetId:'',targetType:'vocabulary',approvedItemId:null,createdAt:page.createdAt,updatedAt:page.updatedAt};
    const missing=missingFields(draft);if(missing.length)draft.reasons.push(`Tidak ditemukan: ${missing.join(', ')}.`);
    return [draft];
  });
}
