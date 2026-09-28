import type { GrammarQuizTemplate } from '../models';
const normalized = (s: string) => s.normalize('NFKC').replace(/\s+/gu, '').replace(/[。.!！?？、,]/gu, '').toLowerCase();
export function validateGrammarTemplate(value: unknown): GrammarQuizTemplate {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Template quiz grammar tidak valid.');
 const x = value as Record<string, unknown>;
 const text = (key: string, required = true) => {
  const v = x[key];
  if (typeof v !== 'string' || v.length > 4000 || (required && !v.trim())) throw new Error(`Template quiz: ${key} wajib berupa teks yang sesuai (maksimal 4.000 karakter).`);
  return v.trim();
 };
 const sentence = text('sentence'), translation = text('translation'), blankAnswer = text('blankAnswer'), explanation = text('explanation');
 if (!sentence.includes(blankAnswer) || sentence.split(blankAnswer).length !== 2) throw new Error('Jawaban isian harus muncul tepat satu kali dalam kalimat benar.');
 if (x.validated !== true) throw new Error('Periksa kebenaran template dan centang konfirmasi sebelum menyimpan.');
 if (!Array.isArray(x.wrongSentences) || ![0,3].includes(x.wrongSentences.length) || x.wrongSentences.some(v => typeof v !== 'string' || !v.trim() || v.length > 4000)) throw new Error('Isi tiga kalimat pengecoh, atau kosongkan semuanya untuk latihan isian saja.');
 const wrongSentences = (x.wrongSentences as string[]).map(s => s.trim());
 if (new Set([sentence,...wrongSentences].map(normalized)).size !== wrongSentences.length + 1) throw new Error('Kalimat benar dan pengecoh harus berbeda satu sama lain.');
 return { sentence, translation, blankAnswer, wrongSentences, explanation, validated: true };
}
export function usableGrammarTemplate(value: unknown) {
 try { return validateGrammarTemplate(value); } catch { return null; }
}
