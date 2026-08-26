import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const CRUMB_LABELS: Record<string, string> = {
  '/dashboard': 'Command Center',
  '/assets/leaderboard': 'Leaderboard',
  '/assets/detail': 'Asset Detail',
  '/intelligence/forecasting': 'Forecasting',
  '/intelligence/forecast-details': 'Forecast Details',
  '/intelligence/anomaly-detection': 'Anomaly Detection',
  '/intelligence/deviation-attribution': 'Deviation Attribution',
  '/intelligence/root-cause': 'Root Cause',
  '/intelligence/priority': 'Intervention',
  '/scenarios/recovery-what-if': 'Recovery What-If',
  '/scenarios/simulation': 'Simulation',
  '/scenarios/injection': 'Scenario Injection',
  '/system/model-status': 'Model Status',
  '/system/provenance': 'Provenance',
  '/data-provenance': 'Provenance',
  '/system/help': 'Glossary',
};

const CATEGORY_LABELS: Record<string, string> = {
  assets: 'ASSETS',
  intelligence: 'INTEL',
  scenarios: 'SCENARIOS',
  system: 'SYSTEM',
};

interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC = () => {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0 || pathname === '/') return null;

  const crumbs: Crumb[] = [{ label: 'HOME', to: '/' }];

  const isAssetDetail = parts[0] === 'assets' && parts[1] === 'detail' && parts.length >= 3;

  if (isAssetDetail) {
    crumbs.push({ label: CATEGORY_LABELS[parts[0]] ?? parts[0], to: '/assets/leaderboard' });
    crumbs.push({ label: CRUMB_LABELS['/assets/detail'], to: '/assets/leaderboard' });
    crumbs.push({ label: parts[2] });
  } else {
    const pageKey = `/${parts.join('/')}`;
    if (parts.length >= 2) {
      const category = CATEGORY_LABELS[parts[0]];
      if (category) crumbs.push({ label: category });
    }
    const pageLabel = CRUMB_LABELS[pageKey];
    if (pageLabel) crumbs.push({ label: pageLabel });
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[10px] font-mono text-text-dim tracking-wider">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={10} className="text-dark-border shrink-0" />}
            {crumb.to && !isLast ? (
              <Link to={crumb.to} className="hover:text-accent-amber transition uppercase">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-text-secondary font-semibold uppercase' : 'uppercase'}>{crumb.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
