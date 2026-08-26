import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Database,
  Activity,
  Cpu,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  FileText,
  Menu,
  X,
  Gauge,
  PlaySquare,
  Binary,
} from 'lucide-react';
import { SignalIndicator } from './ui/Industrial';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const menuItems = [
  {
    category: 'OPS',
    items: [
      { name: 'Command Center', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    category: 'ASSETS',
    items: [
      { name: 'Leaderboard', path: '/assets/leaderboard', icon: Database },
      { name: 'Asset Detail', path: '/assets/detail/MH-07', icon: FileText },
    ],
  },
  {
    category: 'INTEL',
    items: [
      { name: 'Forecasting', path: '/intelligence/forecasting', icon: TrendingUp },
      { name: 'Forecast Details', path: '/intelligence/forecast-details', icon: Activity },
      { name: 'Anomaly Detect', path: '/intelligence/anomaly-detection', icon: AlertTriangle },
      { name: 'Deviation SHAP', path: '/intelligence/deviation-attribution', icon: PieChart },
      { name: 'Root Cause', path: '/intelligence/root-cause', icon: Binary },
      { name: 'Intervention', path: '/intelligence/priority', icon: Gauge },
    ],
  },
  {
    category: 'SCENARIOS',
    items: [
      { name: 'Recovery What-If', path: '/scenarios/recovery-what-if', icon: Cpu },
      { name: 'Simulation', path: '/scenarios/simulation', icon: PlaySquare },
      { name: 'Inject Scenario', path: '/scenarios/injection', icon: Activity },
    ],
  },
  {
    category: 'SYSTEM',
    items: [
      { name: 'Model Status', path: '/system/model-status', icon: ShieldCheck },
      { name: 'Provenance', path: '/system/provenance', icon: Database },
      { name: 'Glossary', path: '/system/help', icon: HelpCircle },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 p-2.5 bg-accent-amber text-dark-bg rounded-sm shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isOpen}
        aria-controls="app-sidebar"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar panel */}
      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={`fixed top-0 left-0 z-40 h-screen w-56 bg-dark-surface border-r border-dark-border transition-transform lg:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-10 flex items-center px-4 border-b border-dark-border bg-dark-bg select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent-amber rounded-[1px] block" />
            <span className="text-sm font-extrabold text-text-primary tracking-wide font-sans">
              Petro<span className="text-accent-amber">Pulse</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 select-none">
          {menuItems.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              <div className="section-divider px-1 mb-1">
                <span>{sec.category}</span>
              </div>
              <ul className="space-y-px">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <li key={iIdx}>
                      <NavLink
                        to={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-sm transition-all duration-100 group ${
                          isActive
                            ? 'bg-accent-amber text-dark-bg font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon
                          size={14}
                          className={isActive ? 'text-dark-bg' : 'text-text-dim group-hover:text-accent-amber'}
                        />
                        <span className="truncate">{item.name}</span>
                        {isActive && (
                          <span className="ml-auto w-1 h-1 bg-dark-bg rounded-full shrink-0" />
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-dark-border bg-dark-bg shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-text-dim tracking-wider">v1.4.2-PROD</span>
            <SignalIndicator status="online" size="sm" />
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
