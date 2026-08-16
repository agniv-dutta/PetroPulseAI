import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
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
  Binary
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const menuItems = [
    {
      category: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ]
    },
    {
      category: 'ASSETS',
      items: [
        { name: 'Asset Leaderboard', path: '/assets/leaderboard', icon: Database },
        { name: 'Asset Detail', path: '/assets/detail/MH-07', icon: FileText },
      ]
    },
    {
      category: 'INTELLIGENCE',
      items: [
        { name: 'Production Forecasting', path: '/intelligence/forecasting', icon: TrendingUp },
        { name: 'Forecast Details', path: '/intelligence/forecast-details', icon: Activity },
        { name: 'Anomaly Detection', path: '/intelligence/anomaly-detection', icon: AlertTriangle },
        { name: 'Deviation Attribution', path: '/intelligence/deviation-attribution', icon: PieChart },
        { name: 'Root Cause Analysis', path: '/intelligence/root-cause', icon: Binary },
        { name: 'Intervention Priority', path: '/intelligence/priority', icon: Gauge },
      ]
    },
    {
      category: 'SCENARIOS',
      items: [
        { name: 'Recovery What-If', path: '/scenarios/recovery-what-if', icon: Cpu },
        { name: 'Real-Time Simulation', path: '/scenarios/simulation', icon: PlaySquare },
        { name: 'Scenario Injection', path: '/scenarios/injection', icon: Activity },
      ]
    },
    {
      category: 'SYSTEM',
      items: [
        { name: 'AI Model Status', path: '/system/model-status', icon: ShieldCheck },
        { name: 'Data Provenance', path: '/system/provenance', icon: Database },
        { name: 'Help & Glossary', path: '/system/help', icon: HelpCircle },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Menu Button overlay */}
      <button 
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-accent-amber text-dark-bg rounded-full shadow-lg hover:bg-opacity-95"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-dark-surface border-r border-dark-border transition-transform lg:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-dark-border bg-dark-bg select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-6 bg-accent-amber rounded-sm block animate-pulse"></span>
            <span className="text-xl font-bold text-text-primary tracking-wide">
              Petro<span className="text-accent-amber">Pulse AI</span>
            </span>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 select-none scrollbar-thin">
          {menuItems.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <h3 className="px-2 text-xs font-semibold text-text-secondary tracking-widest uppercase">
                {sec.category}
              </h3>
              <ul className="space-y-1">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  
                  return (
                    <li key={iIdx}>
                      <NavLink
                        to={item.path}
                        className={() => `
                          flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-all duration-150 group
                          ${isActive
                            ? 'bg-accent-amber text-dark-bg font-semibold' 
                            : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                          }
                        `}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon 
                          size={18} 
                          className={isActive ? 'text-dark-bg' : 'text-text-secondary group-hover:text-accent-amber'} 
                        />
                        <span>{item.name}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 bg-dark-bg rounded-full"></span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom Banner */}
        <div className="p-4 border-t border-dark-border bg-dark-bg text-center">
          <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
            VERSION 1.4.2-PROD
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-65 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};
