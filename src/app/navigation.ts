import { LayoutDashboard, BookOpen, Languages, ListChecks, RotateCcw, ChartNoAxesCombined, Files, Heart, Settings, MessageSquare } from 'lucide-react';

export const navigation = [
  { path: '/dashboard', label: 'Dashboard', japanese: 'ホーム', icon: LayoutDashboard, group: 'learn' },
  { path: '/vocabulary', label: 'Vocabulary', japanese: '単語', icon: BookOpen, group: 'learn' },
  { path: '/grammar', label: 'Grammar', japanese: '文法', icon: Languages, group: 'learn' },
  { path: '/quiz', label: 'Quiz', japanese: 'クイズ', icon: ListChecks, group: 'learn' },
  { path: '/review', label: 'Ulangi pelajaran', japanese: '復習', icon: RotateCcw, group: 'learn' },
  { path: '/progress', label: 'Progress', japanese: '学習進捗', icon: ChartNoAxesCombined, group: 'library' },
  { path: '/favorites', label: 'Favorit', japanese: 'お気に入り', icon: Heart, group: 'library' },
  { path: '/data-transfer', label: 'Import / Export', japanese: 'データ', icon: Files, group: 'library' },
  { path: '/guide', label: 'Panduan', japanese: '使い方', icon: BookOpen, group: 'settings' },
  { path: '/feedback', label: 'Saran & Bug', japanese: 'ご意見', icon: MessageSquare, group: 'settings' },
  { path: '/settings', label: 'Pengaturan', japanese: '設定', icon: Settings, group: 'settings' },
];
