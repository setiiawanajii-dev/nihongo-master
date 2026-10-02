import './styles/transfer.css';
import './styles/dashboard.css';
import './styles/quiz.css';
import { StrictMode } from 'react';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ThemeProvider } from './app/theme';
import './styles/index.css';
import './styles/review.css';
import './styles/progress.css';
import './styles/polish.css';
import { DataProvider } from './app/data/DataProvider';

// Count page visits without including search/filter values in analytics URLs.
function analyticsPageView(event: BeforeSendEvent) {
  const url = new URL(event.url);
  url.search = '';
  url.hash = '';
  return { ...event, url: url.toString() };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><ThemeProvider><DataProvider><RouterProvider router={router} />{import.meta.env.PROD && <Analytics mode="production" debug={false} beforeSend={analyticsPageView} />}</DataProvider></ThemeProvider></StrictMode>,
);
