import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Search,
  GitFork,
  FlaskConical,
  User,
  Terminal,
  Cpu
} from 'lucide-react';
import { PetroPulseLogo } from '../components/PetroPulseLogo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subtle scan-line animation on canvas over the hero panels
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let rafId: number;

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Horizontal scan-line sweep
      const y = (frame * 1.2) % (height + 20) - 10;
      const grad = ctx.createLinearGradient(0, y - 60, 0, y + 60);
      grad.addColorStop(0, 'rgba(240,160,60,0)');
      grad.addColorStop(0.5, 'rgba(240,160,60,0.06)');
      grad.addColorStop(1, 'rgba(240,160,60,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 60, width, 120);

      frame++;
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0A] text-[#F3EFE4] font-sans overflow-x-hidden selection:bg-[#F0AF65] selection:text-[#0A0B0A]">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-12"
        style={{ background: 'rgba(13,13,12,0.82)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <div className="flex items-center justify-center w-6 h-6">
            <PetroPulseLogo size={18} />
          </div>
          <span className="text-sm font-black tracking-widest uppercase text-white font-sans">
            PETROPULSE <span className="text-[#F0AF65]">AI</span>
          </span>
        </button>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-[10px] tracking-widest uppercase font-bold text-[#8A9099]">
          <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors cursor-pointer">COMMAND CENTER</button>
          <button onClick={() => navigate('/assets/leaderboard')} className="hover:text-white transition-colors cursor-pointer">ASSET INTELLIGENCE</button>
          <button onClick={() => navigate('/scenarios/simulation')} className="hover:text-white transition-colors cursor-pointer">SIMULATION</button>
          <button onClick={() => navigate('/system/model-status')} className="hover:text-white transition-colors cursor-pointer">SYSTEM META</button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="font-mono text-[10px] tracking-widest font-bold text-[#DED8CC] uppercase border border-[#3A3D42] px-3 py-1.5 rounded-sm hover:border-[#F0AF65] hover:text-[#F0AF65] transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            AUTH_ACCESS
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-7 h-7 rounded-full border border-[#3A3D42] flex items-center justify-center text-[#8A9099] hover:text-white hover:border-[#F0AF65] transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <User size={13} />
          </button>
        </div>
      </header>

      {/* ── HERO: MOSAIC BACKGROUND + CENTER CONTENT ─────── */}
      <section className="relative pt-12" style={{ minHeight: '100vh' }}>

        {/*
          THE MOSAIC GRID BACKGROUND
          Reference image shows a 3-column x 3-row grid of dark rock/petroleum
          images behind the hero text, with the center cell empty (shows the logo+text)
          and outer cells filled with the rock imagery.
          We replicate this with an absolute-positioned grid.
        */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* 3×3 grid of image panels */}
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
            {/* Row 1 */}
            <div className="relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_1.png" alt="" className="w-full h-full object-cover opacity-55" style={{ filter: 'brightness(0.55) saturate(1.1)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,11,10,0.45) 0%, transparent 60%)' }} />
              {/* Corner label */}
              <div className="absolute top-2 left-3 font-mono text-[9px] text-[#F0AF65]/60 tracking-wider">PETROPULSE AI</div>
              <div className="absolute bottom-2 left-3 font-mono text-[8px] text-[#8A9099]/50 tracking-wider">REF_CAM_01</div>
            </div>
            <div className="relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_2.png" alt="" className="w-full h-full object-cover opacity-50" style={{ filter: 'brightness(0.50) saturate(1.2)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,11,10,0.5) 0%, transparent 50%, rgba(10,11,10,0.2) 100%)' }} />
              <div className="absolute bottom-2 right-3 font-mono text-[8px] text-[#8A9099]/50 tracking-wider">REF_CAM_02</div>
            </div>
            <div className="relative overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_1.png" alt="" className="w-full h-full object-cover opacity-55" style={{ filter: 'brightness(0.50) saturate(1.0) hue-rotate(10deg)', transform: 'scaleX(-1)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(225deg, rgba(10,11,10,0.45) 0%, transparent 60%)' }} />
              <div className="absolute top-2 right-3 font-mono text-[9px] text-[#F0AF65]/60 tracking-wider">PETROPULSE AI</div>
              <div className="absolute bottom-2 right-3 font-mono text-[8px] text-[#8A9099]/50 tracking-wider">REF_CAM_03</div>
            </div>

            {/* Row 2 */}
            <div className="relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_2.png" alt="" className="w-full h-full object-cover opacity-45" style={{ filter: 'brightness(0.48) saturate(1.1) hue-rotate(-5deg)', transform: 'scaleY(-1)' }} />
              <div className="absolute inset-0" style={{ background: 'rgba(10,11,10,0.35)' }} />
              <div className="absolute top-2 left-3 font-mono text-[8px] text-[#8A9099]/50 tracking-wider">STREAM_LIVE</div>
            </div>
            {/* CENTER cell: pure dark — hero content overlays this */}
            <div className="relative" style={{ background: 'rgba(10,11,10,0.15)', borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {/* subtle central glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{ width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,60,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }} />
              </div>
            </div>
            <div className="relative overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_1.png" alt="" className="w-full h-full object-cover opacity-45" style={{ filter: 'brightness(0.48) saturate(1.15)', transform: 'scale(-1,-1)' }} />
              <div className="absolute inset-0" style={{ background: 'rgba(10,11,10,0.35)' }} />
              <div className="absolute top-2 right-3 font-mono text-[8px] text-[#8A9099]/50 tracking-wider">STREAM_LIVE</div>
            </div>

            {/* Row 3 */}
            <div className="relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_1.png" alt="" className="w-full h-full object-cover opacity-50" style={{ filter: 'brightness(0.50) saturate(1.05) hue-rotate(5deg)', transform: 'scaleX(-1) scaleY(-1)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,11,10,0.55) 0%, transparent 60%)' }} />
              <div className="absolute bottom-2 left-3 font-mono text-[9px] text-[#F0AF65]/60 tracking-wider">PETROPULSE AI</div>
            </div>
            <div className="relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <img src="/rock_bg_2.png" alt="" className="w-full h-full object-cover opacity-50" style={{ filter: 'brightness(0.50) saturate(1.1)', transform: 'scaleY(-1)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,11,10,0.5) 0%, transparent 60%)' }} />
            </div>
            <div className="relative overflow-hidden">
              <img src="/rock_bg_2.png" alt="" className="w-full h-full object-cover opacity-50" style={{ filter: 'brightness(0.50) saturate(1.05) hue-rotate(-8deg)', transform: 'scaleX(-1) scaleY(-1)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,11,10,0.55) 0%, transparent 60%)' }} />
              <div className="absolute bottom-2 right-3 font-mono text-[9px] text-[#F0AF65]/60 tracking-wider">PETROPULSE AI</div>
            </div>
          </div>

          {/* Scan-line canvas overlay */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {/* Overall vignette / fade edges */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(10,11,10,0.65) 100%)'
          }} />
        </div>

        {/* Hero Content — sits above the mosaic */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4"
          style={{ minHeight: 'calc(100vh - 3rem)', paddingTop: '2rem', paddingBottom: '3rem' }}>

          {/* Central Logo Badge */}
          <div className="mb-8"
            style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '14px',
              padding: '10px',
              boxShadow: '0 0 30px rgba(240,160,60,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
            <div style={{
              width: 52,
              height: 52,
              background: 'rgba(16,18,16,0.9)',
              borderRadius: '10px',
              border: '1px solid rgba(240,160,60,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(240,160,60,0.2)'
            }}>
              <PetroPulseLogo size={32} />
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-sans font-extrabold text-white uppercase tracking-tight leading-none"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', letterSpacing: '-1px', textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}>
            THE PULSE OF THE{' '}
            <br className="hidden sm:block" />
            <span style={{
              background: 'linear-gradient(90deg, #FF7A1A 0%, #FFAB60 50%, #FF7A1A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(255,122,26,0.4))'
            }}>
              SUBSURFACE
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-[#B8B3A8] leading-relaxed text-center max-w-xl"
            style={{ fontSize: 'clamp(0.82rem, 1.5vw, 1rem)', textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}>
            Transforming raw reservoir telemetry into precision operational intelligence.
            PetroPulse AI bridges the gap between deep industrial data and decisive action.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 group flex items-center gap-2 font-mono font-bold uppercase tracking-widest cursor-pointer transition-all duration-300"
            style={{
              fontSize: '11px',
              padding: '13px 28px',
              background: 'rgba(240,175,101,0.13)',
              border: '1px solid rgba(240,175,101,0.65)',
              borderRadius: '4px',
              color: '#F0AF65',
              boxShadow: '0 0 20px rgba(240,175,101,0.1), inset 0 1px 0 rgba(240,175,101,0.15)',
              letterSpacing: '0.15em'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,175,101,0.25)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 35px rgba(240,175,101,0.25), inset 0 1px 0 rgba(240,175,101,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,175,101,0.13)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(240,175,101,0.1), inset 0 1px 0 rgba(240,175,101,0.15)';
            }}
          >
            <span style={{ opacity: 0.8 }}>➔</span>
            <span>ENTER COMMAND CENTER</span>
          </button>
        </div>
      </section>

      {/* ── CORE SYSTEM MODULES ───────────────────────────── */}
      <section className="relative z-10 py-16 px-6 max-w-6xl mx-auto w-full">

        {/* Divider with label */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #2E3138)' }} />
          <span className="font-mono text-[10px] tracking-widest font-bold text-[#F0AF65] uppercase">
            // CORE_SYSTEM_MODULES
          </span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #2E3138)' }} />
        </div>

        {/* 4 Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {[
            {
              icon: <LayoutGrid size={20} />,
              mod: 'MOD_01',
              title: 'Asset Intelligence',
              desc: 'Real-time health monitoring and anomaly detection across your entire field portfolio.',
              path: '/assets/leaderboard'
            },
            {
              icon: <Search size={20} />,
              mod: 'MOD_02',
              title: 'Predictive Forensics',
              desc: 'AI-driven production forecasting and deviation attribution to eliminate blind spots.',
              path: '/intelligence/forecasting'
            },
            {
              icon: <GitFork size={20} />,
              mod: 'MOD_03',
              title: 'Decision Support',
              desc: 'Strategic intervention prioritization and recovery scenario modeling.',
              path: '/intelligence/priority'
            },
            {
              icon: <FlaskConical size={20} />,
              mod: 'MOD_04',
              title: 'Simulation Sandbox',
              desc: 'A high-fidelity environment for scenario injection and what-if analysis.',
              path: '/scenarios/simulation'
            }
          ].map((card) => (
            <div
              key={card.mod}
              onClick={() => navigate(card.path)}
              className="group cursor-pointer flex flex-col gap-3 p-5 rounded transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                minHeight: 200
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,175,101,0.07)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,175,101,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div className="flex items-start justify-between">
                <div className="text-[#F0AF65] p-2 rounded"
                  style={{ background: 'rgba(240,175,101,0.1)', border: '1px solid rgba(240,175,101,0.2)' }}>
                  {card.icon}
                </div>
                <span className="font-mono text-[9px] tracking-widest text-[#5A606A]">{card.mod}</span>
              </div>
              <h3 className="text-base font-bold text-[#F3EFE4] group-hover:text-[#F0AF65] transition-colors leading-tight mt-1">
                {card.title}
              </h3>
              <p className="text-[11px] text-[#8A9099] leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BUILT FOR ENGINEERS ───────────────────────────── */}
      <section className="relative z-10 py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* LEFT: Dashboard Screenshot Panel — matches reference image exactly */}
          <div
            onClick={() => navigate('/system/provenance')}
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            style={{
              background: '#0D0E0D',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              minHeight: 340
            }}
          >
            {/* Top header bar */}
            <div className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-2 font-mono text-[9px] text-[#F0AF65] font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F0AF65] animate-ping" />
                ● DATA_PROVENANCE_ACTIVE
              </div>
              <span className="font-mono text-[9px] text-[#5A606A]">NODE: MAP_V2.04</span>
            </div>

            {/* Background grid of mini screens */}
            <div className="absolute inset-x-0 bottom-0 top-9 grid grid-cols-3 gap-0 opacity-30 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {i === 4 ? null : (
                    <img
                      src={i % 2 === 0 ? '/rock_bg_1.png' : '/rock_bg_2.png'}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: 'brightness(0.35) saturate(0.8)' }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Center glowing card with dashboard screenshot */}
            <div className="relative z-10 flex flex-col items-center justify-center p-6" style={{ minHeight: 295 }}>
              <div className="relative w-full max-w-[260px] rounded-xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500"
                style={{
                  border: '1px solid rgba(240,175,101,0.35)',
                  boxShadow: '0 0 40px rgba(240,175,101,0.15)',
                  background: '#0D0E0D'
                }}>
                <img
                  src="/dashboard_preview.png"
                  alt="Data Provenance Dashboard"
                  className="w-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
            </div>

            {/* Bottom metadata bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.5)' }}>
              <span className="font-mono text-[9px] text-[#8A9099]">X: 144.20 Y: 89.04</span>
              <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ color: '#C7F700', background: 'rgba(199,247,0,0.1)', border: '1px solid rgba(199,247,0,0.3)' }}>
                INTEGRITY_CHECK_PASS
              </span>
            </div>
          </div>

          {/* RIGHT: Copy + Stat Cards */}
          <div className="flex flex-col justify-center">
            <h2 className="font-sans font-extrabold uppercase leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#F3EFE4', letterSpacing: '-0.5px' }}>
              Built for Engineers,{' '}
              <br />
              <span style={{
                background: 'linear-gradient(90deg, #FF7A1A 0%, #FFAB60 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                by Engineers.
              </span>
            </h2>

            <p className="mt-4 text-[13px] text-[#B8B3A8] leading-relaxed max-w-md">
              We understand that in critical infrastructure, black-box AI is a liability.
              PetroPulse AI is built on radical transparency, ensuring every
              recommendation is traceable to its source data.
            </p>

            {/* 2×2 Stat Cards */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                { value: '98.4%', label: 'DATA HEALTH' },
                { value: '100%', label: 'EXPLAINABLE AI' },
                { value: '< 50ms', label: 'LATENCY' },
                { value: 'Real-World', label: 'PROVENANCE' }
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xl font-extrabold text-white font-mono leading-none">{stat.value}</div>
                  <div className="font-mono text-[9px] tracking-widest text-[#F0AF65] uppercase mt-1.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="relative z-10 mt-8 pt-10 pb-7 px-6 font-mono text-xs text-[#8A9099]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* System Status */}
          <div>
            <div className="text-[#F0AF65] font-bold tracking-wider text-[10px]">
              // SYSTEM_STATUS: OPERATIONAL
            </div>
            <div className="text-white font-bold tracking-widest mt-1 text-[13px]">
              LAT_40.7128 N / LON_74.0060 W
            </div>
            <p className="text-[10px] text-[#8A9099] mt-2 leading-relaxed max-w-xs">
              Integrated neural networks for real-time upstream telemetry
              and structural integrity mapping.
            </p>
          </div>

          {/* Telemetry Hub */}
          <div>
            <div className="text-white font-bold uppercase tracking-wider mb-3 text-[10px]">TELEMETRY HUB</div>
            <ul className="space-y-2 text-[10px]">
              <li className="hover:text-[#F0AF65] cursor-pointer transition-colors" onClick={() => navigate('/system/provenance')}>Data Stream</li>
              <li className="hover:text-[#F0AF65] cursor-pointer transition-colors" onClick={() => navigate('/system/provenance')}>Sensor Logs</li>
            </ul>
          </div>

          {/* Protocols */}
          <div>
            <div className="text-white font-bold uppercase tracking-wider mb-3 text-[10px]">PROTOCOLS</div>
            <ul className="space-y-2 text-[10px]">
              <li className="hover:text-[#F0AF65] cursor-pointer transition-colors" onClick={() => navigate('/system/model-status')}>Safety.V2</li>
              <li className="hover:text-[#F0AF65] cursor-pointer transition-colors" onClick={() => navigate('/system/model-status')}>Encryption</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-5 gap-3 text-[10px]">
          <div>© 2026 PETROPULSE_AI // CORE_INIT_COMPLETE</div>
          <div className="flex items-center gap-4 text-[#5A606A]">
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#F0AF65] transition-colors" title="Command Center"><Terminal size={14} /></button>
            <button onClick={() => navigate('/system/model-status')} className="hover:text-[#F0AF65] transition-colors" title="System Meta"><Cpu size={14} /></button>
          </div>
        </div>
      </footer>

    </div>
  );
};
