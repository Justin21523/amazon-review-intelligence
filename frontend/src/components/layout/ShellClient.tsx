'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { GuidedTourProvider } from '@/components/tour/GuidedTourContext';
import FloatingTourAssistant from '@/components/tour/FloatingTourAssistant';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function ShellClient({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <GuidedTourProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="app-main">
              <TopBar />
              <FloatingTourAssistant />
              <main className="app-content">{children}</main>
            </div>
          </div>
        </GuidedTourProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
