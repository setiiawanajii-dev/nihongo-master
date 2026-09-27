import { Link } from 'react-router-dom';
import { useData } from '../../app/data/DataProvider';
import { Badge, Card, PageHeading } from '../../components/ui';
import { DataState } from '../../components/DataState';
import { duration, percent } from '../../domain/analytics/progress';
import { ActivityChart, LevelProgress, MasteryChart, QuizChart } from './ProgressCharts';
import { useProgressAnalytics } from './useProgressAnalytics';

export function ProgressPage() {
  const { vocabulary, grammar, progress } = useData();
  const a = useProgressAnalytics();
  return <><PageHeading eyebrow="学習進捗 / PROGRESS" title="Lihat seberapa jauh kamu tumbuh." description="Kemajuan nyata dari latihan, quiz, dan waktu belajar yang tersimpan." /><DataState><div className="analytics-page">
    <div className="study-grid">{(['vocabulary', 'grammar'] as const).map(kind => <Card className="analytics-panel" key={kind} data-testid={`${kind}-metrics`}><h2>{kind === 'vocabulary' ? 'Vocabulary' : 'Grammar'}</h2><dl className="analytics-metrics">{[['Total', a[kind].total], ['Learning', a[kind].learning], ['Weak', a[kind].counts.WEAK], ['Mastered', a[kind].counts.MASTERED]].map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}</dl><p className="small-note">Learning mencakup LEARNING + REVIEW. New: {a[kind].counts.NEW} materi.</p></Card>)}</div>
    <Card className="analytics-panel" data-testid="quiz-metrics"><h2>Quiz</h2><dl className="analytics-metrics">{[['Total quizzes', a.quiz.total], ['Average score', percent(a.quiz.score)], ['Average accuracy', percent(a.quiz.accuracy)]].map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}</dl><p className="small-note">Rata-rata per quiz yang selesai. Quiz yang masih berjalan belum dihitung.</p></Card>
    <Card className="analytics-panel" data-testid="study-metrics"><h2>Study</h2><dl className="analytics-metrics">{[['Total study sessions', a.study.total], ['Total study time', duration(a.study.seconds)], ['Current streak', `${a.study.current} hari`], ['Longest streak', `${a.study.longest} hari`]].map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}</dl><p className="small-note">Waktu aktif tersimpan, termasuk review yang sudah dijawab dalam sesi berjalan. Sesi kosong dan waktu idle tidak dihitung. Streak tetap aktif bila terakhir belajar kemarin.</p></Card>
    <div className="study-grid"><QuizChart quizzes={a.quizzes} /><ActivityChart activity={a.study.activity} /><MasteryChart title="Vocabulary" data={a.vocabulary} /><MasteryChart title="Grammar" data={a.grammar} /></div>
    <h2>Perjalanan JLPT</h2><LevelProgress levels={a.levels} />
    <details className="analytics-method"><summary>Cara menghitung progres dan streak</summary><p>Vocabulary dan grammar: jumlah skor mastery dibagi seluruh materi tersimpan pada level tersebut. Materi belum diuji menyumbang 0 pada cakupan progres, bukan berarti kemampuanmu bernilai 0. Skor dapat memuat penilaian diri.</p><p>Quiz per level: persentase jawaban benar berdasarkan level tiap soal, termasuk quiz campuran. Overall: rata-rata cakupan vocabulary, grammar, dan akurasi quiz; quiz yang belum dikerjakan menyumbang 0. Jenis materi tanpa konten dikeluarkan dari rata-rata. Tanda — berarti belum ada data.</p><p>Streak dan aktivitas memakai tanggal lokal yang dicatat oleh sesi. Sesi yang melintasi tengah malam ditempatkan pada tanggal sesi tersimpan; quiz memakai tanggal selesai. Durasi setiap sesi dihitung sekali. Hari mendatang tidak dihitung. Ini progres materi database, bukan seluruh silabus JLPT.</p></details>
    <Card className="history-card"><h2>Catatan progres pribadi</h2><p className="muted">Buka detail materi untuk mengelola catatan. Membaca detail tidak mengubah mastery.</p><div className="category-list">{progress.map(row => {
      const item = (row.itemType === 'vocabulary' ? vocabulary : grammar).find(i => i.id === row.itemId);
      if (!item) return null;
      return <div className="category-row" key={row.id}><div><Link className="text-link" to={`/${row.itemType}/${encodeURIComponent(row.itemId)}`}>{'kanji' in item ? item.kanji : item.pattern}</Link><p className="detail-paragraph">{row.notes || 'Tanpa catatan'}</p></div><Badge tone="neutral">{row.status} · {row.masteryScore == null ? 'Belum diuji' : percent(row.masteryScore)}</Badge></div>;
    })}{progress.length === 0 && <p className="detail-paragraph">Belum ada catatan progres.</p>}</div></Card>
  </div></DataState></>;
}
