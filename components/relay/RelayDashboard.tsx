'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  FolderKanban,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelayLogo } from './RelayLogo';

type RelayView = 'live' | 'cases' | 'analytics';

type RelayDashboardProps = {
  liveView: ReactNode;
  casesView: ReactNode;
  analyticsView: ReactNode;
  /** Live session count badge shown on the Live Call nav item. */
  isSessionActive: boolean;
};

const NAV: { id: RelayView; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: 'Live Call', icon: Radio },
  { id: 'cases', label: 'Cases', icon: FolderKanban },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function RelayDashboard({
  liveView,
  casesView,
  analyticsView,
  isSessionActive,
}: RelayDashboardProps) {
  const [view, setView] = useState<RelayView>('live');
  const previousControlsRef = useRef<number>(0);

  // Keep local running count for the nav badge while a session is active.
  void previousControlsRef;

  return (
    <div className="relative flex h-dvh min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-16 shrink-0 flex-col border-r border-border/80 bg-card/20 py-4 md:flex">
          <div className="mb-4 flex justify-center px-2">
            <RelayLogo hideWordmark markClassName="h-8 w-8" />
          </div>
          <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Relay AI navigation">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
                    active
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                      : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
                  )}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                  {item.id === 'live' && isSessionActive && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mobile top brand bar */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 md:hidden">
            <RelayLogo markClassName="h-8 w-8" />
            <div className="flex items-center gap-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-current={view === item.id ? 'page' : undefined}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border',
                      view === item.id
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                        : 'border-transparent text-muted-foreground',
                    )}
                    title={item.label}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {view === 'live' ? liveView : null}
            {view === 'cases' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
                <WelcomeBanner
                  icon={<FolderKanban className="h-4 w-4 text-cyan-400" />}
                  title="Cases"
                  subtitle="Recorded conversations from real Agora sessions"
                />
                <div className="mt-4 flex-1">{casesView}</div>
              </div>
            ) : null}
            {view === 'analytics' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
                <WelcomeBanner
                  icon={<BarChart3 className="h-4 w-4 text-cyan-400" />}
                  title="Analytics"
                  subtitle="Conversation intelligence aggregated from real sessions"
                />
                <div className="mt-4 flex-1">{analyticsView}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/40">
        {icon}
      </div>
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}