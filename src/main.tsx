import './styles/transfer.css';
import './styles/dashboard.css';
import './styles/quiz.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ThemeProvider } from './app/theme';
import './styles/index.css';
import './styles/review.css';
import './styles/progress.css';
import './styles/materials.css';
import './styles/extraction.css';
import './styles/polish.css';
import { DataProvider } from './app/data/DataProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ThemeProvider><DataProvider><RouterProvider router={router} /></DataProvider></ThemeProvider></StrictMode>,
);
