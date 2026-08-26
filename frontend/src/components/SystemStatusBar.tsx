import React, { useState, useEffect } from 'react';
import { Search, User, Bell, Radio } from 'lucide-react';
import { SignalIndicator } from './ui/Industrial';

export const SystemStatusBar: React.FC = () => {
  const [clock, setClock] = useState('');
  const [retrainCountdown, setRetrainCountdown] = useState('00:12:15');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let totalSeconds = 12 * 60 + 15;
    const interval = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds--;
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        setRetrainCountdown(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        totalSeconds = 15 * 60;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-10 border-b border-dark-border bg-dark-surface px-4 flex items-center justify-between select-none shrink-0">
      {/* Left cluster: brand + status */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold text-text-dim tracking-[0.15em]">PPLS</span>
        <span className="w-px h-3 bg-dark-border" />
        <SignalIndicator status="online" size="sm" label="SYS OK" />
        <span className="w-px h-3 bg-dark-border" />
        <div className="hidden md:flex items-center gap-1.5 text-text-dim">
          <Radio size={10} className="text-accent-lime" />
          <span className="font-mono text-[10px] tracking-wider uppercase">
            STREAM: <span className="text-accent-lime font-semibold">LIVE</span>
          </span>
        </div>
      </div>

      {/* Center: live clock */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-text-primary tabular-nums tracking-wider">
          {clock}
        </span>
        <span className="w-px h-3 bg-dark-border" />
        <span className="font-mono text-[10px] text-text-dim tracking-wider">
          UTC+5:30
        </span>
      </div>

      {/* Right cluster: search + retrain + alerts + profile */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden lg:flex items-center gap-1.5 bg-dark-bg border border-dark-border px-2 py-0.5 w-52 focus-within:border-accent-amber/50 transition">
          <Search size={12} className="text-text-dim" />
          <input
            type="text"
            placeholder="Search..."
            aria-label="Global search"
            className="bg-transparent text-[11px] text-text-primary placeholder-text-dim outline-none w-full font-mono"
          />
        </div>

        {/* Retrain countdown */}
        <div className="hidden sm:flex items-center gap-1.5 text-text-dim">
          <span className="font-mono text-[9px] tracking-wider uppercase">RETRAIN</span>
          <span className="font-mono text-[11px] font-bold text-accent-amber tabular-nums">{retrainCountdown}</span>
        </div>

        <span className="w-px h-3 bg-dark-border hidden sm:block" />

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="text-text-dim hover:text-accent-amber relative p-1 transition"
        >
          <Bell size={14} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-accent-red rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-dark-border">
          <div className="hidden md:block text-right">
            <div className="text-[11px] font-semibold text-text-primary leading-none">Ops Lead</div>
            <div className="text-[9px] font-mono text-text-dim uppercase">#042</div>
          </div>
          <div className="w-7 h-7 rounded-sm bg-accent-amber/10 border border-accent-amber/25 flex items-center justify-center text-accent-amber">
            <User size={14} />
          </div>
        </div>
      </div>
    </header>
  );
};
