import { SmartDashboard } from './SmartDashboard';
import { useData } from '../../app/data/DataProvider';
import { DataState } from '../../components/DataState';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Languages, Flame, Target } from 'lucide-react';
import { Card, PageHeading, SectionHeading } from '../../components/ui';

import { useProgressAnalytics } from '../progress/useProgressAnalytics';
import { LevelProgress } from '../progress/ProgressCharts';
import { duration, percent } from '../../domain/analytics/progress';

export function DashboardPage() {
  const { vocabulary, grammar, progress } = useData();
  const analytics = useProgressAnalytics();
  const date = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return <>
    <PageHeading eyebrow="ホーム / DASHBOARD" title="Langkah kecil, kemampuan besar." description="Selamat datang di ruang belajar Bahasa Jepang-mu."><span className="date-label">{date}</span></PageHeading>
    <DataState><SmartDashboard /><div className="info-banner">Database aktif · {vocabulary.length} vocabulary · {grammar.length} grammar · {progress.length} catatan progres</div><div className="stats-grid">{[
      { icon: BookOpen, value: String(analytics.vocabulary.assessed), unit: 'kata', label: 'Vocabulary dipelajari', detail: 'Perjalananmu dimulai di sini', style: 'green' },
      { icon: Languages, value: String(analytics.grammar.counts.MASTERED), unit: 'pola', label: 'Grammar mastered', detail: 'Pahami, lalu gunakan', style: 'purple' },
      { icon: Target, value: percent(analytics.quiz.accuracy), unit: '', label: 'Akurasi quiz', detail: `${analytics.quiz.total} quiz selesai`, style: 'orange' },
      { icon: Flame, value: String(analytics.study.current), unit: 'hari', label: 'Study streak', detail: `Terpanjang ${analytics.study.longest} hari`, style: 'rose' },
    ].map(({ icon: Icon, value, unit, label, detail, style }) => <Card className="stat-card" key={label}><div className="stat-top"><span className={`icon-tile ${style}`}><Icon size={20} /></span><span className="stat-label">{label}</span></div><p className="stat-value">{value} <span>{unit}</span></p><p className="stat-detail">{detail}</p></Card>)}</div>
    <div className="dashboard-columns"><div className="dashboard-left"><Card className="analytics-panel"><SectionHeading title="Aktivitas hari ini" subtitle="Dari sesi belajar yang tersimpan." to="/progress" action="Lihat progress" /><dl className="analytics-metrics"><div><dt>Sesi belajar</dt><dd>{analytics.study.today.sessions}</dd></div><div><dt>Waktu aktif</dt><dd>{duration(analytics.study.today.seconds)}</dd></div></dl><p className="small-note">Total {analytics.study.total} sesi · {duration(analytics.study.seconds)} waktu belajar.</p><Link to="/review" className="text-link">Lanjutkan review <ArrowRight size={16} /></Link></Card>
    </div>
    <div className="dashboard-right"><Card className="journey-card"><SectionHeading title="Perjalanan JLPT" to="/progress" action="Detail" /><LevelProgress levels={analytics.levels} /><p className="small-note">Cakupan mastery materi tersimpan dan hasil quiz. Lihat detail untuk rumus perhitungan.</p></Card></div></div>
  </DataState></>;
}
