import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 60 seconds - prevents refetch on every page navigation
      staleTime: 60 * 1000,
      // Keep cached data for 5 minutes even when unused
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus (reduces unnecessary API calls)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
