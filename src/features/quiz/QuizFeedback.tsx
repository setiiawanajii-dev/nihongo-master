import { Link } from 'react-router-dom';
import { useData } from '../../app/data/DataProvider';
import type { QuizQuestion } from '../../domain/models';
import { answerText } from '../../domain/quiz/engine';

export function QuizFeedback({ question: q, answer }: { question: QuizQuestion; answer: string }) {
 const data = useData();
 const contentId = q.contentId ?? q.itemId;
 const exists = data[q.itemType].some(item => item.id === contentId);
 return <div className="quiz-feedback"><h3>❌ Salah</h3><div className="quiz-answer-comparison"><div><span>Jawabanmu</span><p className="danger-text">{answerText(q,answer)}</p></div><div><span>Jawaban benar:</span><p>{answerText(q,q.correctAnswer)}</p></div></div>
 <h4>Penjelasan:</h4><p className="small-note">Pembahasan materi</p><p className="quiz-explanation">{q.explanation}</p>
 
 {exists ? <Link className="button button-secondary" to={`/${q.itemType}/${encodeURIComponent(contentId)}`}>Review Material</Link> : <p className="small-note">Materi terkait sudah dihapus. Pembahasan tersimpan dalam riwayat.</p>}
 </div>;
}
