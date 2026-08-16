import React, { useState, useEffect } from 'react';
import { Search, User, Bell } from 'lucide-react';

export const SystemStatusBar: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState('00:12:15');

  // Tick the countdown timer for the model training schedule
  useEffect(() => {
    let totalSeconds = 12 * 60 + 15;
    const interval = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds--;
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        setTimeLeft(
          `${hrs.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        totalSeconds = 15 * 60; // reset to 15m
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-dark-border bg-dark-surface px-6 flex items-center justify-between select-none">
      {/* Search Input Bar */}
      <div className="hidden md:flex items-center gap-2 bg-dark-bg border border-dark-border px-3 py-1.5 rounded w-80 focus-within:border-accent-amber transition duration-150">
        <Search size={16} className="text-text-secondary" />
        <input 
          type="text" 
          placeholder="Search telemetry, assets, or reports..." 
          aria-label="Global search"
          className="bg-transparent text-xs text-text-primary placeholder-text-secondary outline-none w-full font-sans"
        />
      </div>

      {/* Center status indicators */}
      <div className="flex items-center gap-4 lg:gap-6 text-xs font-mono">
        <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-3 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-ping"></span>
          <span className="w-2 h-2 rounded-full bg-accent-green absolute"></span>
          <span className="text-text-primary uppercase tracking-wider pl-1">OPERATIONAL</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-text-secondary">
          <span>DATA STREAM:</span>
          <span className="text-accent-lime font-semibold uppercase tracking-wider">ACTIVE (SIM)</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-text-secondary">
          <span>MODEL RETRAIN IN:</span>
          <span className="text-accent-amber font-semibold">{timeLeft}</span>
        </div>
      </div>

      {/* Profile & Notifications */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="text-text-secondary hover:text-text-primary relative p-1.5 bg-dark-bg border border-dark-border rounded hover:border-accent-amber transition"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-dark-border">
          <div className="hidden md:block text-right">
            <div className="text-xs font-semibold text-text-primary">Lead Engineer</div>
            <div className="text-[10px] font-mono text-text-secondary uppercase">FIELD OPS #042</div>
          </div>
          <div className="w-9 h-9 rounded bg-accent-amber bg-opacity-15 border border-accent-amber border-opacity-35 flex items-center justify-center text-accent-amber hover:bg-opacity-25 transition cursor-pointer">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};
