import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  AlertTriangle,
  FileText,
  Trophy,
  Zap,
  Activity,
  ShieldAlert,
  DollarSign,
  Users,
  Download,
  Code,
  Settings,
  Flame
} from 'lucide-react';
import { PetroPulseLogo } from './PetroPulseLogo';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Asset Map', path: '/asset-map', icon: MapPin },
    { label: 'Production Metrics', path: '/metrics', icon: TrendingUp },
    { label: 'Anomaly Detection', path: '/anomalies', icon: AlertTriangle, badge: '3' },
    { label: 'Field Reports', path: '/reports', icon: FileText },
    { label: 'Asset Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Recovery Potential', path: '/recovery', icon: Zap },
    { label: 'Equipment Health', path: '/equipment', icon: Activity },
    { label: 'ESG Tracking', path: '/esg', icon: ShieldAlert },
    { label: 'Predictive Maintenance', path: '/maintenance', icon: Flame },
    { label: 'Cost Analysis', path: '/cost', icon: DollarSign },
    { label: 'Team Collaboration', path: '/team', icon: Users },
    { label: 'Data Exports', path: '/exports', icon: Download },
    { label: 'API Access', path: '/api', icon: Code },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#111313',
      borderRight: '1px solid #2A2D30',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0
    }}>
      {/* Brand Header with New Logo */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid #1A1D1F'
      }}>
        <PetroPulseLogo size={34} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#F3EFE4', letterSpacing: '-0.5px' }}>
            PETROPULSE <span style={{ color: '#FF9000' }}>AI</span>
          </span>
          <span style={{ fontSize: '10px', color: '#B8B3A8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ENERGY INTELLIGENCE
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? '#080909' : '#B8B3A8',
                backgroundColor: isActive ? '#FF9000' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? '#080909' : (item.path === '/anomalies' ? '#FF3B3B' : '#B8B3A8')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  backgroundColor: isActive ? '#080909' : '#FF3B3B',
                  color: isActive ? '#FF9000' : '#F3EFE4',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer / System Status */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1A1D1F',
        backgroundColor: '#080909',
        fontSize: '11px',
        color: '#B8B3A8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00D966', display: 'inline-block' }}></span>
          <span style={{ fontWeight: 600, color: '#F3EFE4' }}>Telemetry Engine Active</span>
        </div>
        <span style={{ fontSize: '10px', color: '#666' }}>v2.4.0-prod | Basin: India</span>
      </div>
    </aside>
  );
};
