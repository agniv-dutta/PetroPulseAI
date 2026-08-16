import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const CRUMB_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/assets/leaderboard': 'Asset Leaderboard',
  '/assets/detail': 'Asset Detail',
  '/intelligence/forecasting': 'Production Forecasting',
  '/intelligence/forecast-details': 'Forecast Details',
  '/intelligence/anomaly-detection': 'Anomaly Detection',
  '/intelligence/deviation-attribution': 'Deviation Attribution',
  '/intelligence/root-cause': 'Root Cause Analysis',
  '/intelligence/priority': 'Intervention Priority',
  '/scenarios/recovery-what-if': 'Recovery What-If',
  '/scenarios/simulation': 'Real-Time Simulation',
  '/scenarios/injection': 'Scenario Injection',
  '/system/model-status': 'AI Model Status',
  '/system/provenance': 'Data Provenance',
  '/data-provenance': 'Data Provenance',
  '/system/help': 'Help & Glossary',
};

const CATEGORY_LABELS: Record<string, string> = {
  assets: 'Assets',
  intelligence: 'Intelligence',
  scenarios: 'Scenarios',
  system: 'System',
};

interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC = () => {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0 || pathname === '/') return null;

  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];

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
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-text-secondary">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={12} className="text-dark-border shrink-0" />}
            {crumb.to && !isLast ? (
              <Link to={crumb.to} className="hover:text-accent-amber transition">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-text-primary font-medium' : ''}>{crumb.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
