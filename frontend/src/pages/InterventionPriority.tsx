import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Play
} from 'lucide-react';

export const InterventionPriority: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const assetId = id || 'MH-07';

  const [activeStep, setActiveStep] = useState<number>(1);
  const [modalAction, setModalAction] = useState<string | null>(null);

  const mockPriorityData = {
    id: assetId,
    field: 'Mumbai High North',
    basin: 'Arabian Sea (Western Offshore)',
    aipsScore: 92,
    severity: 'CRITICAL',
    expectedProd: '1.42 MMBL',
    actualProd: '1.17 MMBL',
    deviationPct: '-17.4%',
    declineRate: '2.3% / month',
    anomalyScore: 0.94,
    recoveryPotential: '1.24 MMBL',
    complexityScore: 0.60,

    components: [
      {
        title: 'Production Loss',
        weight: '30% Weight',
        value: 'Value: -17.4%',
        contribution: 'Contribution: 5.2',
        tag: '◆ HIGH IMPACT',
        color: '#FF3B3B'
      },
      {
        title: 'Anomaly Severity',
        weight: '25% Weight',
        value: 'Score: 0.94',
        contribution: 'Contribution: 4.7',
        tag: '◆ CRITICAL',
        color: '#FF3B3B'
      },
      {
        title: 'Recovery Potential',
        weight: '35% Weight',
        value: 'Value: 1.24 MMBL',
        contribution: 'Contribution: 4.3',
        tag: '◆ HIGH POTENTIAL',
        color: '#00D966'
      },
      {
        title: 'Complexity',
        weight: '10% Weight',
        value: 'Score: 0.60',
        contribution: 'Contribution: 0.6',
        tag: '◆ MEDIUM COMPLEXITY',
        color: '#FF9000'
      }
    ],

    rankingContext: [
      { rank: 1, id: 'MH-07', score: 92, status: 'CRITICAL', current: true },
      { rank: 2, id: 'CB-12', score: 78, status: 'HIGH', current: false },
      { rank: 3, id: 'KG-05', score: 65, status: 'MEDIUM', current: false },
      { rank: 4, id: 'AS-09', score: 58, status: 'MEDIUM', current: false },
    ],

    risks: {
      operational: [
        'Field is mature (>15 years); recovery window time-sensitive.',
        'Pressure sensor PT-104 sub-assembly has history of thermal drift.'
      ],
      financial: {
        cost: '$1.2M USD',
        expectedValue: '~$62M USD (at $50/barrel)',
        roi: 'Positive (Breakeven in 3 weeks)'
      },
      resources: {
        crew: '4 Senior Field Technicians',
        duration: '2 - 3 Days',
        equipment: 'Pressure regulator PT-104, Subsea flow meter calibration kit'
      }
    },

    similarCases: [
      { id: 'AS-09 (2025)', field: 'Assam Shelf', recovery: '+0.92 MMBL', cost: '$0.9M', status: 'SUCCESS' },
      { id: 'CB-08 (2025)', field: 'Cauvery Basin', recovery: '+1.15 MMBL', cost: '$1.1M', status: 'SUCCESS' },
      { id: 'MH-04 (2024)', field: 'Mumbai High', recovery: '+0.67 MMBL', cost: '$0.8M', status: 'SUCCESS' },
    ],

    nextSteps: [
      { step: 1, title: 'Notify Field Operations Team', team: 'Control Room Ops', duration: 'Immediate', desc: 'Send dispatch notification to Lead Engineer on duty.' },
      { step: 2, title: 'Schedule On-Site Diagnostic', team: 'Offshore Diagnostic Crew', duration: '48 Hours', desc: 'Deploy calibration technicians to Zone B manifold.' },
      { step: 3, title: 'Prepare Intervention Plan', team: 'Reservoir Engineering', duration: '24 Hours', desc: 'Finalize choke valve recalibration & pressure equalization procedure.' },
      { step: 4, title: 'Execute Intervention', team: 'Field Technicians', duration: '2-3 Days', desc: 'Perform physical valve inspection and sensor replacement.' },
      { step: 5, title: 'Monitor Recovery Telemetry', team: 'PetroPulse AI Stream', duration: '1 Week', desc: 'Validate post-intervention yield gain vs 1.24 MMBL target.' }
    ]
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px', paddingBottom: '80px' }}>
      
      {/* BREADCRUMB & PRINT BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B8B3A8' }}>
          <Link to="/leaderboard" style={{ color: '#FF9000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>
          <span>/</span>
          <span>Intervention Priority</span>
          <span>/</span>
          <span style={{ color: '#F3EFE4', fontWeight: 700 }}>{mockPriorityData.id}</span>
        </div>

        <button
          onClick={handlePrint}
          style={{
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            color: '#F3EFE4',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Printer size={14} color="#00D966" /> Print Recommendation
        </button>
      </div>

      {/* 1. PAGE HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF9000', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          DECISION SUPPORT SYSTEM (AIPS)
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3EFE4', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
          Intervention Priority & Decision Panel
        </h1>
        <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
          AI-driven recommendations for operational intervention allocation
        </p>
      </div>

      {/* 2. PROMINENT FEATURED ASSET CARD (CENTER) */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1D1F 0%, #111313 100%)',
        border: '1px solid #FF3B3B66',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        
        {/* Top Identity & Circular AIPS Gauge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <h2 style={{ fontSize: '48px', fontWeight: 900, color: '#F3EFE4', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {mockPriorityData.id}
              </h2>
              <span style={{
                backgroundColor: '#FF3B3B22',
                color: '#FF3B3B',
                border: '1px solid #FF3B3B',
                fontSize: '14px',
                fontWeight: 900,
                padding: '6px 14px',
                borderRadius: '6px',
                letterSpacing: '0.05em'
              }}>
                ◆ CRITICAL
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#B8B3A8', marginTop: '6px' }}>
              {mockPriorityData.field} • <span style={{ color: '#F3EFE4' }}>{mockPriorityData.basin}</span>
            </div>
          </div>

          {/* Circular AIPS Gauge */}
          <div style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="140" height="140" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#2A2D30" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#FF3B3B"
                strokeWidth="8"
                fill="none"
                strokeDasharray="264"
                strokeDashoffset={264 * (1 - mockPriorityData.aipsScore / 100)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#FF3B3B', lineHeight: 1 }}>
                {mockPriorityData.aipsScore}
              </div>
              <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, marginTop: '2px' }}>
                OUT OF 100
              </div>
            </div>
          </div>
        </div>

        {/* Component Breakdown 4-Card Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          margin: '28px 0 20px 0'
        }}>
          {mockPriorityData.components.map((comp, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#111313',
                border: `1px solid ${comp.color}44`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#F3EFE4' }}>{comp.title}</div>
                <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '2px' }}>{comp.weight}</div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: comp.color }}>{comp.value}</div>
                <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '2px' }}>{comp.contribution}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: comp.color, marginTop: '6px' }}>{comp.tag}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. VISUAL AIPS FORMULA */}
        <div style={{
          backgroundColor: '#111313',
          border: '1px solid #2A2D30',
          borderRadius: '8px',
          padding: '14px 20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ color: '#B8B3A8' }}>AIPS Formula: </span>
            <span style={{ color: '#00D966' }}>(0.30 × |-17.4%|)</span> + <span style={{ color: '#00D966' }}>(0.25 × 0.94)</span> + <span style={{ color: '#00D966' }}>(0.35 × 1.24)</span> - <span style={{ color: '#FF3B3B' }}>(0.10 × 0.60)</span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 900, color: '#FF3B3B' }}>
            AIPS = 5.2 + 4.7 + 4.3 - 0.6 = 92
          </div>
        </div>
      </div>

      {/* 4. WHY PRIORITIZE MH-07? (DECISION RATIONALE) */}
      <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F3EFE4', margin: '0 0 16px 0' }}>
          Why Prioritize Asset {mockPriorityData.id}?
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '13px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00D966', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#00D966" /> High production deviation (-17.4% below expected baseline)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00D966', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#00D966" /> Rapid decline rate (2.3% per month acceleration)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00D966', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#00D966" /> Severe anomaly detected (0.94 Isolation Forest score)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00D966', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#00D966" /> High recovery potential (1.24 MMBL AI-identified uplift)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FF9000', fontWeight: 600 }}>
            <AlertTriangle size={18} color="#FF9000" /> Moderate complexity (does not block immediate dispatch)
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#B8B3A8', lineHeight: 1.5, backgroundColor: '#111313', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #FF9000', margin: 0 }}>
          "This asset combines the highest portfolio production loss with the largest AI-proven recovery potential. Intervening on {mockPriorityData.id} can recover up to 1.24 MMBL of crude output, making it the highest ROI intervention target in the basin."
        </p>
      </div>

      {/* 5. RECOMMENDED ACTION SECTION */}
      <div style={{
        backgroundColor: '#111313',
        border: '1px solid #FF9000',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#FF9000', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          RECOMMENDED PRIMARY ACTION
        </div>

        <button
          onClick={() => setModalAction('prioritize')}
          style={{
            backgroundColor: '#FF9000',
            color: '#080909',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 36px',
            fontSize: '16px',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 6px 20px rgba(255, 144, 0, 0.3)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Play size={20} /> PRIORITIZE FOR FIELD INVESTIGATION
        </button>
        <span style={{ fontSize: '12px', color: '#B8B3A8' }}>Next step: Engage offshore engineering crew & assign diagnostic work order</span>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setModalAction('maintenance')}
            style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', color: '#F3EFE4', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Schedule Maintenance
          </button>
          <button
            onClick={() => navigate('/forecast')}
            style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF9000', color: '#FF9000', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Simulate Recovery Scenario
          </button>
          <button
            onClick={() => setModalAction('watchlist')}
            style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', color: '#B8B3A8', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Add to Watchlist
          </button>
        </div>
      </div>

      {/* 6. RANKING CONTEXT, RISKS & SIMILAR CASES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '24px' }}>
        
        {/* RANKING CONTEXT (4 Cols) */}
        <div style={{ gridColumn: 'span 4', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F3EFE4', marginBottom: '14px' }}>
            Portfolio Ranking Context
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mockPriorityData.rankingContext.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: item.current ? '#FF900015' : '#111313',
                  border: item.current ? '1px solid #FF9000' : '1px solid #2A2D30',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: item.current ? '#FF9000' : '#B8B3A8' }}>#{item.rank}</span>
                  <span style={{ fontWeight: 800, color: '#F3EFE4' }}>{item.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: item.score >= 80 ? '#FF3B3B' : '#FFD700' }}>
                    {item.score}
                  </span>
                  {item.current && <span style={{ fontSize: '10px', backgroundColor: '#FF9000', color: '#080909', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>CURRENT</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RISK FACTORS & FINANCIAL ROI (4 Cols) */}
        <div style={{ gridColumn: 'span 4', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F3EFE4', marginBottom: '14px' }}>
            Risks & Financial ROI
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#111313', padding: '10px', borderRadius: '6px' }}>
              <div style={{ color: '#B8B3A8', fontSize: '10px', fontWeight: 700 }}>ESTIMATED COST</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginTop: '2px' }}>{mockPriorityData.risks.financial.cost}</div>
            </div>
            <div style={{ backgroundColor: '#111313', padding: '10px', borderRadius: '6px' }}>
              <div style={{ color: '#B8B3A8', fontSize: '10px', fontWeight: 700 }}>EXPECTED RECOVERY VALUE</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#00D966', marginTop: '2px' }}>{mockPriorityData.risks.financial.expectedValue}</div>
            </div>
            <div style={{ backgroundColor: '#111313', padding: '10px', borderRadius: '6px' }}>
              <div style={{ color: '#B8B3A8', fontSize: '10px', fontWeight: 700 }}>PROJECTED ROI BREAKEVEN</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#C7F700', marginTop: '2px' }}>{mockPriorityData.risks.financial.roi}</div>
            </div>
          </div>
        </div>

        {/* SIMILAR PAST CASES (4 Cols) */}
        <div style={{ gridColumn: 'span 4', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F3EFE4', marginBottom: '14px' }}>
            Similar Past Interventions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mockPriorityData.similarCases.map((c) => (
              <div key={c.id} style={{ backgroundColor: '#111313', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2A2D30', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#F3EFE4' }}>
                  <span>{c.id}</span>
                  <span style={{ color: '#00D966' }}>{c.recovery}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '2px' }}>{c.field} • Cost: {c.cost}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 7. NEXT STEPS WORKFLOW LOG (BOTTOM) */}
      <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginBottom: '16px' }}>
          Execution & Next Steps Workflow
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {mockPriorityData.nextSteps.map((s) => {
            const isActive = activeStep === s.step;
            return (
              <div
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                style={{
                  backgroundColor: isActive ? '#1A1D1F' : '#080909',
                  border: `1px solid ${isActive ? '#FF9000' : '#2A2D30'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#FF9000' : '#2A2D30',
                    color: isActive ? '#080909' : '#F3EFE4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '12px'
                  }}>
                    {s.step}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#F3EFE4' }}>{s.title}</span>
                </div>

                <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '10px' }}>
                  Assigned: <strong style={{ color: '#F3EFE4' }}>{s.team}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#FF9000', marginTop: '2px' }}>
                  Timeframe: {s.duration}
                </div>
                <p style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '6px', lineHeight: 1.3 }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION DIALOG MODAL */}
      {modalAction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(8, 9, 9, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF9000', borderRadius: '10px', width: '420px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
              Confirm Intervention Priority
            </h2>
            <p style={{ fontSize: '13px', color: '#B8B3A8', margin: '14px 0' }}>
              Work order #WO-MH07 generated. Field engineering squad dispatched to Mumbai High North.
            </p>
            <button
              onClick={() => setModalAction(null)}
              style={{ width: '100%', backgroundColor: '#FF9000', color: '#080909', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            >
              Acknowledge Dispatch
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
