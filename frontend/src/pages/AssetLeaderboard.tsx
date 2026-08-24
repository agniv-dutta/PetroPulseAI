import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  X,
  AlertOctagon,
  Sliders
} from 'lucide-react';
import { calculateAIPS } from '../utils/aipsCalculator';
import type { AIPSPriority, AssetSeverity } from '../types';
import { api } from '../api/client';

export interface AssetItem {
  rank: number;
  id: string;
  field: string;
  basin: string;
  currentProd: number;
  expectedProd: number;
  deviation: number;
  declineRate: number;
  severity: AssetSeverity;
  recoveryPotential: number;
  aipsScore: number;
  priority: AIPSPriority;
}

// Helper to generate 128 assets
const generate128Assets = (): AssetItem[] => {
  const basins = [
    { name: 'Mumbai Offshore', fields: ['Mumbai High North', 'Heera Field', 'Neelam Field', 'Bassein Complex'] },
    { name: 'Cauvery Basin', fields: ['Cauvery Offshore', 'Nagapattinam', 'Karaikal', 'Palk Bay'] },
    { name: 'KG Basin', fields: ['Krishna Godavari Deepwater', 'Ravva Platform Alpha', 'Dhirubhai Block', 'Gautami'] },
    { name: 'Assam Shelf', fields: ['Digboi Field', 'Rudrasagar', 'Geleki', 'Lakwa'] },
    { name: 'Cambay Basin', fields: ['Ankleshwar Sector 4', 'Gandhar Field', 'Hazira Offshore', 'Kalol'] },
    { name: 'Rajasthan Basin', fields: ['Mangala Field', 'Bhagyam', 'Aishwariya', 'Barmer Block'] },
  ];

  interface AssetSeed {
    id: string;
    field: string;
    basin: string;
    currentProd: number;
    expectedProd: number;
    deviation: number;
    declineRate: number;
    recoveryPotential: number;
    anomalyScore: number;
    histRate: number;
    complexity: number;
  }

  const scoreAsset = (seed: AssetSeed): { aipsScore: number; priority: AssetItem['priority']; severity: AssetItem['severity'] } => {
    const result = calculateAIPS({
      asset_id: seed.id,
      expected_production: seed.expectedProd,
      actual_production: seed.currentProd,
      anomaly_score: seed.anomalyScore,
      historical_recovery_rate: seed.histRate,
      intervention_complexity: seed.complexity,
    });
    const aipsScore = Math.round(result.aips_score);
    const severity: AssetItem['severity'] = aipsScore >= 80 ? 'CRITICAL' : aipsScore >= 60 ? 'HIGH' : aipsScore >= 40 ? 'WATCH' : 'NORMAL';
    return { aipsScore, priority: result.priority, severity };
  };

  const seedData: AssetSeed[] = [
    { id: 'MH-07', field: 'Mumbai High North', basin: 'Mumbai Offshore', currentProd: 1.17, expectedProd: 1.42, deviation: -17.4, declineRate: 2.3, recoveryPotential: 1.24, anomalyScore: 0.94, histRate: 0.80, complexity: 0.60 },
    { id: 'CB-12', field: 'Cauvery Offshore', basin: 'Cauvery Basin', currentProd: 0.89, expectedProd: 1.05, deviation: -15.2, declineRate: 1.8, recoveryPotential: 0.87, anomalyScore: 0.85, histRate: 0.80, complexity: 0.50 },
    { id: 'KG-102a', field: 'Ravva Platform Alpha', basin: 'KG Basin', currentProd: 8.15, expectedProd: 9.20, deviation: -11.4, declineRate: 1.5, recoveryPotential: 0.95, anomalyScore: 0.80, histRate: 0.80, complexity: 0.55 },
    { id: 'AS-09', field: 'Digboi Field', basin: 'Assam Shelf', currentProd: 0.42, expectedProd: 0.51, deviation: -17.6, declineRate: 2.7, recoveryPotential: 0.45, anomalyScore: 0.90, histRate: 0.85, complexity: 0.65 },
    { id: 'CB-991', field: 'Ankleshwar Sector 4', basin: 'Cambay Basin', currentProd: 4.20, expectedProd: 4.35, deviation: -3.4, declineRate: 0.9, recoveryPotential: 0.32, anomalyScore: 0.55, histRate: 0.75, complexity: 0.30 },
    { id: 'RJ-004', field: 'Mangala Field', basin: 'Rajasthan Basin', currentProd: 22.10, expectedProd: 22.00, deviation: 0.4, declineRate: 0.5, recoveryPotential: 0.15, anomalyScore: 0.20, histRate: 0.70, complexity: 0.20 },
  ];

  const assets: AssetItem[] = seedData.map((seed, idx) => {
    const { aipsScore, priority, severity } = scoreAsset(seed);
    return {
      rank: idx + 1,
      id: seed.id,
      field: seed.field,
      basin: seed.basin,
      currentProd: seed.currentProd,
      expectedProd: seed.expectedProd,
      deviation: seed.deviation,
      declineRate: seed.declineRate,
      severity,
      recoveryPotential: seed.recoveryPotential,
      aipsScore,
      priority,
    };
  });

  const prefixList = ['MH', 'CB', 'KG', 'AS', 'CAM', 'RJ', 'WB', 'KUT'];

  for (let i = 7; i <= 128; i++) {
    const basinObj = basins[i % basins.length];
    const fieldName = basinObj.fields[i % basinObj.fields.length];
    const pfix = prefixList[i % prefixList.length];
    const id = `${pfix}-${(i * 13) % 900 + 100}`;
    
    // Generate realistic variance
    const expected = parseFloat((Math.random() * 5 + 0.5).toFixed(2));
    const devPct = parseFloat((Math.random() * 50 - 35).toFixed(1)); // mostly negative
    const current = parseFloat((expected * (1 + devPct / 100)).toFixed(2));
    const decRate = parseFloat((Math.random() * 3 + 0.3).toFixed(1));
    const recovery = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));

    // Derive AIPS inputs from generated asset characteristics
    const anomalyScore = Math.min(0.95, Math.max(0.05, Math.abs(devPct) / 40 + Math.random() * 0.10));
    const histRate = parseFloat((0.70 + Math.random() * 0.20).toFixed(2));
    const complexity = Math.min(1, Math.max(0.05, decRate / 4 + Math.random() * 0.10));

    const { aipsScore, priority, severity } = scoreAsset({
      id,
      field: fieldName,
      basin: basinObj.name,
      currentProd: current,
      expectedProd: expected,
      deviation: devPct,
      declineRate: decRate,
      recoveryPotential: recovery,
      anomalyScore,
      histRate,
      complexity,
    });

    assets.push({
      rank: i,
      id,
      field: fieldName,
      basin: basinObj.name,
      currentProd: current,
      expectedProd: expected,
      deviation: devPct,
      declineRate: decRate,
      severity,
      recoveryPotential: recovery,
      aipsScore,
      priority
    });
  }

  // Pre-sort by AIPS Score descending
  return assets.sort((a, b) => b.aipsScore - a.aipsScore).map((item, idx) => ({ ...item, rank: idx + 1 }));
};

export const AssetLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const fallbackData = useMemo(() => generate128Assets(), []);
  const [rawData, setRawData] = useState<AssetItem[]>(fallbackData);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.leaderboard();
      if (!res || cancelled) return;
      setRawData(
        res.rows.map((r) => ({
          rank: r.rank,
          id: r.id,
          field: r.field,
          basin: r.basin,
          currentProd: r.currentProd,
          expectedProd: r.expectedProd,
          deviation: Math.round(r.deviation * 10) / 10,
          declineRate: r.declineRate,
          severity: (r.severity === 'ALERT' ? 'HIGH' : r.severity === 'WATCH' ? 'WATCH' : r.severity) as AssetSeverity,
          recoveryPotential: r.recoveryPotential,
          aipsScore: r.aipsScore,
          priority: r.priority as AIPSPriority,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedBasins, setSelectedBasins] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [maxDeviationFilter, setMaxDeviationFilter] = useState<number>(-50);
  const [minRecoveryFilter, setMinRecoveryFilter] = useState<number>(0);

  // Sorting States
  const [sortField, setSortField] = useState<keyof AssetItem>('aipsScore');
  const [sortAscending, setSortAscending] = useState(false);

  // Selection & Pagination
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  // Filter logic
  const filteredAssets = useMemo(() => {
    return rawData.filter(asset => {
      // Search
      const searchMatch =
        asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.basin.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Priority Filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(asset.priority)) {
        return false;
      }

      // Basin Filter
      if (selectedBasins.length > 0 && !selectedBasins.includes(asset.basin)) {
        return false;
      }

      // Severity Filter
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(asset.severity)) {
        return false;
      }

      // Deviation Filter
      if (asset.deviation < maxDeviationFilter) {
        return false;
      }

      // Recovery Potential Filter
      if (asset.recoveryPotential < minRecoveryFilter) {
        return false;
      }

      return true;
    });
  }, [rawData, searchTerm, selectedPriorities, selectedBasins, selectedSeverities, maxDeviationFilter, minRecoveryFilter]);

  // Sort logic
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortAscending
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      } else {
        return sortAscending
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
  }, [filteredAssets, sortField, sortAscending]);

  // Pagination logic
  const totalPages = Math.ceil(sortedAssets.length / pageSize) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAssets.slice(start, start + pageSize);
  }, [sortedAssets, currentPage, pageSize]);

  // Handlers
  const handleSort = (field: keyof AssetItem) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedAssets.map(a => a.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedPriorities([]);
    setSelectedBasins([]);
    setSelectedSeverities([]);
    setMaxDeviationFilter(-50);
    setMinRecoveryFilter(0);
  };

  const exportCSV = () => {
    const headers = ['Rank,Asset ID,Field,Basin,Current Prod (MMBL),Expected Prod (MMBL),Deviation %,Decline Rate (%/mo),Severity,Recovery Potential (MMBL),AIPS Score,Priority\n'];
    const rows = sortedAssets.map(a =>
      `${a.rank},${a.id},"${a.field}","${a.basin}",${a.currentProd},${a.expectedProd},${a.deviation}%,${a.declineRate}%,${a.severity},${a.recoveryPotential},${a.aipsScore},${a.priority}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetroPulse_Asset_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Helper colors
  const getAIPSColor = (score: number) => {
    if (score >= 80) return '#00D966';
    if (score >= 60) return '#FFD700';
    if (score >= 40) return '#FF9000';
    return '#FF3B3B';
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return { bg: '#FF3B3B22', border: '#FF3B3B', text: '#FF3B3B' };
      case 'HIGH': return { bg: '#FF900022', border: '#FF9000', text: '#FF9000' };
      case 'MEDIUM': return { bg: '#FFD70022', border: '#FFD700', text: '#FFD700' };
      case 'LOW': default: return { bg: '#00D96622', border: '#00D966', text: '#00D966' };
    }
  };

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px' }}>
      
      {/* 1. PAGE HEADER & FLEET KPIs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF9000', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            GLOBAL FLEET OVERVIEW
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3EFE4', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
            Asset Leaderboard
          </h1>
          <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
            Ranked by Asset Intervention Priority Score (AIPS)
          </p>
        </div>

        {/* Fleet KPI Summary Cards */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{
            backgroundColor: '#1A1D1F',
            border: '1px solid #FF3B3B44',
            borderRadius: '8px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>CRITICAL ASSETS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FF3B3B' }}>04 <span style={{ fontSize: '12px', color: '#B8B3A8', fontWeight: 500 }}>/ {rawData.length}</span></div>
            </div>
            <AlertOctagon size={24} color="#FF3B3B" />
          </div>

          <div style={{
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '8px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>AVG FLEET AIPS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFD700' }}>42 <span style={{ fontSize: '11px', color: '#00D966', fontWeight: 600 }}>+2.4% vs last wk</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR (Search, Filters, Export) */}
      <div style={{
        backgroundColor: '#111313',
        border: '1px solid #2A2D30',
        borderRadius: '8px 8px 0 0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '8px 12px',
            gap: '8px',
            width: '320px'
          }}>
            <Search size={16} color="#B8B3A8" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search assets, basins, fields..."
              aria-label="Search assets, basins, fields"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F3EFE4',
                fontSize: '13px',
                width: '100%'
              }}
            />
            {searchTerm && (
              <X size={14} color="#B8B3A8" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} aria-label="Clear search" />
            )}
          </div>

          {/* Filter Panel Toggle Button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            aria-expanded={showFilterPanel}
            aria-controls="filter-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: showFilterPanel ? '#FF900022' : '#1A1D1F',
              color: showFilterPanel ? '#FF9000' : '#F3EFE4',
              border: `1px solid ${showFilterPanel ? '#FF9000' : '#2A2D30'}`,
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Sliders size={16} />
            <span>Filters</span>
            {(selectedPriorities.length > 0 || selectedBasins.length > 0 || selectedSeverities.length > 0) && (
              <span style={{ backgroundColor: '#FF9000', color: '#080909', fontSize: '10px', borderRadius: '10px', padding: '2px 6px', fontWeight: 800 }}>
                {selectedPriorities.length + selectedBasins.length + selectedSeverities.length}
              </span>
            )}
          </button>

          {/* Quick Priority Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
            {['CRITICAL', 'HIGH'].map(p => {
              const active = selectedPriorities.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => {
                    if (active) setSelectedPriorities(selectedPriorities.filter(x => x !== p));
                    else setSelectedPriorities([...selectedPriorities, p]);
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: active ? (p === 'CRITICAL' ? '#FF3B3B' : '#FF9000') : '#1A1D1F',
                    color: active ? '#080909' : '#B8B3A8',
                    border: '1px solid #2A2D30',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ● {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bulk Actions */}
          {selectedRows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#B8B3A8', fontWeight: 600 }}>{selectedRows.length} selected</span>
              <button
                style={{
                  backgroundColor: '#1A1D1F',
                  border: '1px solid #FF9000',
                  color: '#FF9000',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <BookmarkPlus size={14} /> Add to Watchlist
              </button>
            </div>
          )}

          {/* CSV Export */}
          <button
            onClick={exportCSV}
            aria-label="Download asset data as CSV"
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
            <Download size={14} color="#00D966" /> Download as CSV
          </button>
        </div>
      </div>

      {/* 3. COLLAPSIBLE FILTER PANEL */}
      {showFilterPanel && (
        <div id="filter-panel"
          style={{
          backgroundColor: '#111313',
          borderLeft: '1px solid #2A2D30',
          borderRight: '1px solid #2A2D30',
          borderBottom: '1px solid #2A2D30',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          fontSize: '12px'
        }}>
          {/* Filter Priority */}
          <div>
            <div style={{ fontWeight: 700, color: '#F3EFE4', marginBottom: '8px' }}>Priority Level</div>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: '#B8B3A8' }}>
                <input
                  type="checkbox"
                  checked={selectedPriorities.includes(p)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPriorities([...selectedPriorities, p]);
                    else setSelectedPriorities(selectedPriorities.filter(x => x !== p));
                  }}
                />
                {p}
              </label>
            ))}
          </div>

          {/* Filter Basin */}
          <div>
            <div style={{ fontWeight: 700, color: '#F3EFE4', marginBottom: '8px' }}>Basin</div>
            {['Mumbai Offshore', 'Cauvery Basin', 'KG Basin', 'Assam Shelf', 'Cambay Basin', 'Rajasthan Basin'].map(b => (
              <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', color: '#B8B3A8' }}>
                <input
                  type="checkbox"
                  checked={selectedBasins.includes(b)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedBasins([...selectedBasins, b]);
                    else setSelectedBasins(selectedBasins.filter(x => x !== b));
                  }}
                />
                {b}
              </label>
            ))}
          </div>

          {/* Filter Deviation Slider */}
          <div>
            <div style={{ fontWeight: 700, color: '#F3EFE4', marginBottom: '8px' }}>
              Max Deviation: <span style={{ color: '#FF3B3B' }}>{maxDeviationFilter}%</span>
            </div>
            <input
              type="range"
              min="-50"
              max="10"
              value={maxDeviationFilter}
              onChange={(e) => setMaxDeviationFilter(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filter Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={handleResetFilters}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #2A2D30',
                color: '#B8B3A8',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN TABLE CONTAINER */}
      <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderTop: 'none', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1A1D1F', borderBottom: '1px solid #2A2D30', color: '#B8B3A8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px 16px', width: '40px' }}>
                <input
                  type="checkbox"
                  aria-label="Select all assets on this page"
                  checked={selectedRows.length === paginatedAssets.length && paginatedAssets.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: '14px 12px', cursor: 'pointer' }} onClick={() => handleSort('rank')}>
                Rank {sortField === 'rank' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', cursor: 'pointer' }} onClick={() => handleSort('id')}>
                Asset ID {sortField === 'id' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', cursor: 'pointer' }} onClick={() => handleSort('field')}>
                Field Name {sortField === 'field' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', cursor: 'pointer' }} onClick={() => handleSort('basin')}>
                Basin {sortField === 'basin' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('currentProd')}>
                Current (MMBL) {sortField === 'currentProd' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('expectedProd')}>
                Expected (MMBL) {sortField === 'expectedProd' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('deviation')}>
                Deviation % {sortField === 'deviation' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('declineRate')}>
                Decline {sortField === 'declineRate' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', cursor: 'pointer' }} onClick={() => handleSort('severity')}>
                Severity {sortField === 'severity' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('recoveryPotential')}>
                Recovery (MMBL) {sortField === 'recoveryPotential' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('aipsScore')}>
                AIPS {sortField === 'aipsScore' && (sortAscending ? '▲' : '▼')}
              </th>
              <th style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => handleSort('priority')}>
                Priority {sortField === 'priority' && (sortAscending ? '▲' : '▼')}
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedAssets.map((asset) => {
              const isSelected = selectedRows.includes(asset.id);
              const isCritical = asset.priority === 'CRITICAL';
              const pStyle = getPriorityBadgeStyle(asset.priority);
              const aipsColor = getAIPSColor(asset.aipsScore);

              return (
                <tr
                  key={asset.id}
                  onClick={() => navigate(`/assets/detail/${asset.id}`)}
                  style={{
                    backgroundColor: isCritical ? '#FF3B3B11' : (isSelected ? '#1A1D1F' : 'transparent'),
                    borderBottom: '1px solid #1A1D1F',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCritical && !isSelected) e.currentTarget.style.backgroundColor = '#1A1D1F';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCritical && !isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Select Checkbox */}
                  <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(asset.id)}
                      aria-label={`Select asset ${asset.id}`}
                    />
                  </td>

                  {/* Rank */}
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: '#B8B3A8' }}>
                    #{asset.rank}
                  </td>

                  {/* Asset ID */}
                  <td style={{ padding: '14px 12px', fontWeight: 800, color: '#FF9000' }}>
                    {asset.id}
                  </td>

                  {/* Field Name */}
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#F3EFE4' }}>
                    {asset.field}
                  </td>

                  {/* Basin */}
                  <td style={{ padding: '14px 12px', color: '#B8B3A8' }}>
                    {asset.basin}
                  </td>

                  {/* Current Production */}
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#F3EFE4' }}>
                    {asset.currentProd}
                  </td>

                  {/* Expected Production */}
                  <td style={{ padding: '14px 12px', textAlign: 'right', color: '#B8B3A8' }}>
                    {asset.expectedProd}
                  </td>

                  {/* Deviation % */}
                  <td style={{
                    padding: '14px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: asset.deviation < 0 ? '#FF3B3B' : '#00D966'
                  }}>
                    {asset.deviation > 0 ? `+${asset.deviation}%` : `${asset.deviation}%`}
                  </td>

                  {/* Decline Rate */}
                  <td style={{ padding: '14px 12px', textAlign: 'right', color: '#B8B3A8' }}>
                    {asset.declineRate}%/mo
                  </td>

                  {/* Severity Badge */}
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      backgroundColor: asset.severity === 'CRITICAL' ? '#FF3B3B22' : (asset.severity === 'HIGH' ? '#FF900022' : '#00D96622'),
                      color: asset.severity === 'CRITICAL' ? '#FF3B3B' : (asset.severity === 'HIGH' ? '#FF9000' : '#00D966'),
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${asset.severity === 'CRITICAL' ? '#FF3B3B44' : '#2A2D30'}`
                    }}>
                      {asset.severity}
                    </span>
                  </td>

                  {/* Recovery Potential */}
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#C7F700' }}>
                    {asset.recoveryPotential}
                  </td>

                  {/* AIPS Score */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: aipsColor }}>
                      {asset.aipsScore}
                    </span>
                  </td>

                  {/* Priority Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      backgroundColor: pStyle.bg,
                      color: pStyle.text,
                      border: `1px solid ${pStyle.border}`,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {asset.priority}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. PAGINATION FOOTER */}
      <div style={{
        backgroundColor: '#111313',
        border: '1px solid #2A2D30',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#B8B3A8'
      }}>
        <div>
          Showing <strong style={{ color: '#F3EFE4' }}>{(currentPage - 1) * pageSize + 1}</strong> to <strong style={{ color: '#F3EFE4' }}>{Math.min(currentPage * pageSize, sortedAssets.length)}</strong> of <strong style={{ color: '#F3EFE4' }}>{sortedAssets.length}</strong> Assets
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            aria-label="Previous page"
            style={{
              backgroundColor: '#1A1D1F',
              border: '1px solid #2A2D30',
              color: currentPage === 1 ? '#666' : '#F3EFE4',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <span style={{ fontWeight: 600, color: '#F3EFE4' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            aria-label="Next page"
            style={{
              backgroundColor: '#1A1D1F',
              border: '1px solid #2A2D30',
              color: currentPage === totalPages ? '#666' : '#F3EFE4',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
