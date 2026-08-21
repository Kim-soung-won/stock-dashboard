import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/shared/lib';
import { ErrorBoundary } from '@/shared/ui';
import { router } from './router';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root 를 찾을 수 없습니다');

createRoot(container).render(
  <StrictMode>
    {/* 최후의 그물. 여기까지 올라온 예외는 흰 화면 대신 원인을 보여준다. */}
    <ErrorBoundary context="app">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
