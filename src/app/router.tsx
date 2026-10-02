import { GuidePage } from '../features/guide/GuidePage';
import { FeedbackPage } from '../features/feedback/FeedbackPage';
import { RouteErrorPage } from '../components/RouteErrorPage';
import { lazy, Suspense } from 'react';
const TransferPage = lazy(() => import('../features/transfer/TransferPage').then(m => ({default:m.TransferPage})));
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GrammarPage } from '../features/grammar/GrammarPage';
import { GrammarDetailPage } from '../features/grammar/GrammarDetailPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { NotFoundPage } from '../features/learning/LearningPages';
import { FavoritesPage } from '../features/favorites/FavoritesPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { VocabularyPage } from '../features/vocabulary/VocabularyPage';
import { VocabularyDetailPage } from '../features/vocabulary/VocabularyDetailPage';
import { FlashcardPage } from '../features/vocabulary/FlashcardPage';
import { QuizPage } from '../features/quiz/QuizPage';
import { QuizResultPage } from '../features/quiz/QuizResultPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const router = createBrowserRouter([
  { element: <AppLayout />, errorElement: <RouteErrorPage />, children: [
    { index: true, element: <Navigate to="/dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'vocabulary', element: <VocabularyPage /> },
    { path: 'vocabulary/flashcards', element: <FlashcardPage /> },
    { path: 'vocabulary/:id', element: <VocabularyDetailPage /> },
    { path: 'grammar', element: <GrammarPage /> },
    { path: 'grammar/:id', element: <GrammarDetailPage /> },
    { path: 'quiz', element: <QuizPage /> },
    { path: 'quiz/result', element: <QuizResultPage /> },
    { path: 'review', element: <ReviewPage /> },
    { path: 'progress', element: <ProgressPage /> },
    { path: 'material-check', element: <Navigate to="/data-transfer" replace /> },
    { path: 'materials', element: <Navigate to="/data-transfer" replace /> },
    { path: 'materials/:id', element: <Navigate to="/data-transfer" replace /> },
    { path: 'favorites', element: <FavoritesPage /> },
    { path: 'data-transfer', element: <Suspense fallback={<p role="status">Membuka import/export…</p>}><TransferPage /></Suspense> },
    { path: 'feedback', element: <FeedbackPage /> },
    { path: 'guide', element: <GuidePage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: '*', element: <NotFoundPage /> },
  ] },
]);
