import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  LineChart as LineChartIcon,
  Target,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { INDICATORS } from '../data/inmConfig';
import { ComprehensiveReportSummary, IndicatorSummary } from '../types/inm';

export type ChartScope = 'monthly' | 'triwulan' | 'semester' | 'annual';

interface ReportChartProps {
  summaries: IndicatorSummary[];
  comprehensiveSummary?: ComprehensiveReportSummary;
  monthName: string;
  year: number;
  initialScope?: ChartScope;
  chartType?: 'bar' | 'line';
  onChartTypeChange?: (type: 'bar' | 'line') => void;
  isPrintMode?: boolean;
}

export const ReportChart: React.FC<ReportChartProps> = ({
  summaries,
  comprehensiveSummary,
  monthName,
  year,
  initialScope = 'monthly',
  chartType: externalChartType,
  onChartTypeChange,
  isPrintMode = false,
}) => {
  const [scope, setScope] = useState<ChartScope>(initialScope);
  const [selectedTw, setSelectedTw] = useState<'all' | 'tw1' | 'tw2' | 'tw3' | 'tw4'>('all');
  const [selectedSemester, setSelectedSemester] = useState<'all' | 's1' | 's2'>('all');
  const [internalChartType, setInternalChartType] = useState<'bar' | 'line'>('bar');
  const chartType = externalChartType !== undefined ? externalChartType : internalChartType;

  const handleSetChartType = (newType: 'bar' | 'line') => {
    setInternalChartType(newType);
    if (onChartTypeChange) {
      onChartTypeChange(newType);
    }
  };

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // SVG Chart dimensions
  const svgWidth = 920;
  const svgHeight =
    (scope === 'triwulan' && selectedTw === 'all') ||
    (scope === 'semester' && selectedSemester === 'all')
      ? 320
      : 280;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 48;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const yMax = 100;
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(yMax, val));
    return paddingTop + chartHeight - (clamped / yMax) * chartHeight;
  };

  // Get data item according to current scope
  interface ChartDataPoint {
    id: number;
    title: string;
    targetValue: number;
    targetLabel: string;
    targetOperator: string;
    // Values depending on scope
    value: number | null;
    isMet: boolean | null;
    // For Triwulan multi-bar
    tw1Val?: number | null;
    tw2Val?: number | null;
    tw3Val?: number | null;
    tw4Val?: number | null;
    // For Semester multi-bar
    s1Val?: number | null;
    s2Val?: number | null;
    label: string;
  }

  const chartData: ChartDataPoint[] = INDICATORS.map((ind) => {
    const monthlySum = summaries.find((s) => s.id === ind.id);
    const compInd = comprehensiveSummary?.indicators.find((s) => s.id === ind.id);

    let val: number | null = null;
    let isMet: boolean | null = null;

    if (scope === 'monthly') {
      val = monthlySum?.avgPercent ?? null;
      isMet = monthlySum?.isMetAverage ?? null;
    } else if (scope === 'triwulan') {
      if (selectedTw === 'tw1') {
        val = compInd?.tw1.percent ?? null;
        isMet = compInd?.tw1.isMet ?? null;
      } else if (selectedTw === 'tw2') {
        val = compInd?.tw2.percent ?? null;
        isMet = compInd?.tw2.isMet ?? null;
      } else if (selectedTw === 'tw3') {
        val = compInd?.tw3.percent ?? null;
        isMet = compInd?.tw3.isMet ?? null;
      } else if (selectedTw === 'tw4') {
        val = compInd?.tw4.percent ?? null;
        isMet = compInd?.tw4.isMet ?? null;
      } else {
        // 'all': use annual as reference or average of available TWs
        val = compInd?.annual.percent ?? null;
        isMet = compInd?.annual.isMet ?? null;
      }
    } else if (scope === 'semester') {
      if (selectedSemester === 's1') {
        val = compInd?.s1.percent ?? null;
        isMet = compInd?.s1.isMet ?? null;
      } else if (selectedSemester === 's2') {
        val = compInd?.s2.percent ?? null;
        isMet = compInd?.s2.isMet ?? null;
      } else {
        // 'all': use annual as reference
        val = compInd?.annual.percent ?? null;
        isMet = compInd?.annual.isMet ?? null;
      }
    } else if (scope === 'annual') {
      val = compInd?.annual.percent ?? null;
      isMet = compInd?.annual.isMet ?? null;
    }

    return {
      id: ind.id,
      title: ind.title,
      targetValue: ind.targetValue,
      targetLabel: ind.targetLabel,
      targetOperator: ind.targetOperator,
      value: val,
      isMet,
      tw1Val: compInd?.tw1.percent ?? null,
      tw2Val: compInd?.tw2.percent ?? null,
      tw3Val: compInd?.tw3.percent ?? null,
      tw4Val: compInd?.tw4.percent ?? null,
      s1Val: compInd?.s1.percent ?? null,
      s2Val: compInd?.s2.percent ?? null,
      label: `INM-${ind.id < 10 ? `0${ind.id}` : ind.id}`,
    };
  });

  const hoveredItem = chartData.find((d) => d.id === hoveredId);

  // Line chart points
  const points = chartData
    .map((d, idx) => {
      if (d.value === null) return null;
      const total = chartData.length;
      const step = chartWidth / (total - 1 || 1);
      const x = paddingLeft + idx * step;
      return {
        x,
        y: getY(d.value),
        targetY: getY(d.targetValue),
        data: d,
      };
    })
    .filter(Boolean) as {
    x: number;
    y: number;
    targetY: number;
    data: ChartDataPoint;
  }[];

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const targetPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.targetY}`).join(' ');

  const getScopeTitle = () => {
    switch (scope) {
      case 'monthly':
        return `Capaian Rata-Rata Bulanan (${monthName} ${year})`;
      case 'triwulan':
        return selectedTw === 'all'
          ? `Perbandingan Capaian Rata-Rata Per Triwulan (TW 1 s/d TW 4 Tahun ${year})`
          : `Capaian Rata-Rata ${selectedTw.toUpperCase()} (${year})`;
      case 'semester':
        if (selectedSemester === 's1') {
          return `Capaian Rata-Rata Semester 1 (Januari - Juni Tahun ${year})`;
        } else if (selectedSemester === 's2') {
          return `Capaian Rata-Rata Semester 2 (Juli - Desember Tahun ${year})`;
        }
        return `Perbandingan Capaian Rata-Rata Per Semester (Semester 1 vs Semester 2 Tahun ${year})`;
      case 'annual':
        return `Capaian Rata-Rata Tahunan (Tahun ${year} Penuh)`;
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs ${isPrintMode ? 'border-none p-2 shadow-none' : ''}`}>
      {/* Header & Scope Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <span>{getScopeTitle()}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualisasi perbandingan capaian mutu terhadap target standar nasional Kemenkes RI.
              </p>
            </div>
          </div>
        </div>

        {/* Scope Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScope('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'monthly'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulanan ({monthName.substring(0, 3)})
            </button>
            <button
              type="button"
              onClick={() => setScope('triwulan')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'triwulan'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Triwulan (TW 1-4)
            </button>
            <button
              type="button"
              onClick={() => setScope('semester')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'semester'
                  ? 'bg-white text-cyan-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester (S1 & S2)
            </button>
            <button
              type="button"
              onClick={() => setScope('annual')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'annual'
                  ? 'bg-white text-indigo-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahunan ({year})
            </button>
          </div>

          {/* Triwulan sub-filter if in triwulan scope */}
          {scope === 'triwulan' && (
            <div className="flex items-center bg-teal-50 p-1 rounded-xl border border-teal-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedTw('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTw === 'all' ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                }`}
              >
                Semua TW
              </button>
              <button
                type="button"
                onClick={() => setSelectedTw('tw1')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTw === 'tw1' ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                }`}
              >
                TW 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedTw('tw2')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTw === 'tw2' ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                }`}
              >
                TW 2
              </button>
              <button
                type="button"
                onClick={() => setSelectedTw('tw3')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTw === 'tw3' ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                }`}
              >
                TW 3
              </button>
              <button
                type="button"
                onClick={() => setSelectedTw('tw4')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTw === 'tw4' ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                }`}
              >
                TW 4
              </button>
            </div>
          )}

          {/* Semester sub-filter if in semester scope */}
          {scope === 'semester' && (
            <div className="flex items-center bg-cyan-50 p-1 rounded-xl border border-cyan-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedSemester('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 'all' ? 'bg-cyan-700 text-white shadow-2xs' : 'text-cyan-900'
                }`}
              >
                Semua (S1 &amp; S2)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester('s1')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 's1' ? 'bg-cyan-700 text-white shadow-2xs' : 'text-cyan-900'
                }`}
              >
                Semester 1 (Jan-Jun)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester('s2')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 's2' ? 'bg-cyan-700 text-white shadow-2xs' : 'text-cyan-900'
                }`}
              >
                Semester 2 (Jul-Des)
              </button>
            </div>
          )}

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => handleSetChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Batang</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'line' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Garis Tren</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Title (Visible only when printed) */}
      <div className="hidden print:block mb-3 text-center">
        <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
          {getScopeTitle()}
        </h4>
        <p className="text-[10px] text-slate-500 font-sans">
          Grafik Standar Capaian Rata-Rata Indikator Nasional Mutu (Permenkes No. 30 Tahun 2022)
        </p>
      </div>

      {/* EXECUTIVE COMPLIANCE CARDS FOR PERIODS */}
      {comprehensiveSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 my-3 text-xs">
          {/* TW1 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'triwulan' && selectedTw === 'tw1' ? 'ring-2 ring-teal-500 bg-teal-50/70 border-teal-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">Triwulan 1 (Jan-Mar)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-teal-800">
                {comprehensiveSummary.overallTwComplianceRates.tw1.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">tercapai</span>
            </div>
          </div>

          {/* TW2 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'triwulan' && selectedTw === 'tw2' ? 'ring-2 ring-teal-500 bg-teal-50/70 border-teal-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">Triwulan 2 (Apr-Jun)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-teal-800">
                {comprehensiveSummary.overallTwComplianceRates.tw2.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">tercapai</span>
            </div>
          </div>

          {/* TW3 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'triwulan' && selectedTw === 'tw3' ? 'ring-2 ring-teal-500 bg-teal-50/70 border-teal-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">Triwulan 3 (Jul-Sep)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-teal-800">
                {comprehensiveSummary.overallTwComplianceRates.tw3.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">tercapai</span>
            </div>
          </div>

          {/* TW4 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'triwulan' && selectedTw === 'tw4' ? 'ring-2 ring-teal-500 bg-teal-50/70 border-teal-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">Triwulan 4 (Okt-Des)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-teal-800">
                {comprehensiveSummary.overallTwComplianceRates.tw4.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">tercapai</span>
            </div>
          </div>

          {/* Semester 1 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'semester' ? 'bg-cyan-50/80 border-cyan-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-cyan-800 block uppercase">Semester 1</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-cyan-900">
                {comprehensiveSummary.overallSemesterComplianceRates.s1.toFixed(1)}%
              </span>
              <span className="text-[10px] text-cyan-700">tercapai</span>
            </div>
          </div>

          {/* Semester 2 */}
          <div className={`p-2.5 rounded-xl border transition-all ${scope === 'semester' ? 'bg-cyan-50/80 border-cyan-300' : 'bg-slate-50/80 border-slate-200'}`}>
            <span className="text-[10px] font-bold text-cyan-800 block uppercase">Semester 2</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-cyan-900">
                {comprehensiveSummary.overallSemesterComplianceRates.s2.toFixed(1)}%
              </span>
              <span className="text-[10px] text-cyan-700">tercapai</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Chart Rendering */}
      <div className="pt-2 overflow-x-auto">
        <div className="min-w-[760px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none font-sans">
            {/* Grid Lines */}
            {[0, 20, 40, 60, 80, 100].map((level) => {
              const y = getY(level);
              return (
                <g key={level}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={level === 0 || level === 100 ? undefined : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono font-medium"
                  >
                    {level}%
                  </text>
                </g>
              );
            })}

            {/* BAR CHART VIEW */}
            {chartType === 'bar' && (
              <>
                {/* CASE A: MULTI-BAR TRIWULAN (ALL 4 QUARTERS) */}
                {scope === 'triwulan' && selectedTw === 'all' ? (
                  <>
                    {chartData.map((d, idx) => {
                      const total = chartData.length;
                      const slotWidth = chartWidth / total;
                      const xSlotStart = paddingLeft + idx * slotWidth;
                      const miniBarWidth = Math.min(10, (slotWidth - 8) / 4);
                      const targetY = getY(d.targetValue);
                      const isHovered = hoveredId === d.id;

                      const quarters = [
                        { val: d.tw1Val, color: '#0284c7', label: 'TW1' },
                        { val: d.tw2Val, color: '#0d9488', label: 'TW2' },
                        { val: d.tw3Val, color: '#d97706', label: 'TW3' },
                        { val: d.tw4Val, color: '#7c3aed', label: 'TW4' },
                      ];

                      return (
                        <g
                          key={d.id}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredId(d.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          {/* Hover Background */}
                          <rect
                            x={xSlotStart}
                            y={paddingTop}
                            width={slotWidth}
                            height={chartHeight}
                            fill={isHovered ? '#f1f5f9' : 'transparent'}
                            rx={4}
                          />

                          {/* 4 Mini Bars */}
                          {quarters.map((q, qIdx) => {
                            if (q.val === null || q.val === undefined) return null;
                            const barX = xSlotStart + 4 + qIdx * (miniBarWidth + 2);
                            const barY = getY(q.val);
                            const barH = chartHeight - (barY - paddingTop);

                            return (
                              <rect
                                key={qIdx}
                                x={barX}
                                y={barY}
                                width={miniBarWidth}
                                height={Math.max(2, barH)}
                                rx={2}
                                fill={q.color}
                                opacity={isHovered ? 1 : 0.85}
                              />
                            );
                          })}

                          {/* Target Line Tick (Solid Red) */}
                          <line
                            x1={xSlotStart + 2}
                            y1={targetY}
                            x2={xSlotStart + slotWidth - 2}
                            y2={targetY}
                            stroke="#dc2626"
                            strokeWidth={2.5}
                          />

                          {/* X-axis label */}
                          <text
                            x={xSlotStart + slotWidth / 2}
                            y={svgHeight - paddingBottom + 16}
                            textAnchor="middle"
                            className={`text-[10px] font-mono ${isHovered ? 'fill-slate-900 font-black' : 'fill-slate-600'}`}
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : scope === 'semester' && selectedSemester === 'all' ? (
                  /* CASE B: MULTI-BAR SEMESTER (S1 & S2) */
                  <>
                    {chartData.map((d, idx) => {
                      const total = chartData.length;
                      const slotWidth = chartWidth / total;
                      const xSlotStart = paddingLeft + idx * slotWidth;
                      const miniBarWidth = Math.min(16, (slotWidth - 8) / 2);
                      const targetY = getY(d.targetValue);
                      const isHovered = hoveredId === d.id;

                      const semesters = [
                        { val: d.s1Val, color: '#0891b2', label: 'S1' },
                        { val: d.s2Val, color: '#059669', label: 'S2' },
                      ];

                      return (
                        <g
                          key={d.id}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredId(d.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <rect
                            x={xSlotStart}
                            y={paddingTop}
                            width={slotWidth}
                            height={chartHeight}
                            fill={isHovered ? '#f1f5f9' : 'transparent'}
                            rx={4}
                          />

                          {semesters.map((s, sIdx) => {
                            if (s.val === null || s.val === undefined) return null;
                            const barX = xSlotStart + 6 + sIdx * (miniBarWidth + 3);
                            const barY = getY(s.val);
                            const barH = chartHeight - (barY - paddingTop);

                            return (
                              <rect
                                key={sIdx}
                                x={barX}
                                y={barY}
                                width={miniBarWidth}
                                height={Math.max(2, barH)}
                                rx={3}
                                fill={s.color}
                                opacity={isHovered ? 1 : 0.85}
                              />
                            );
                          })}

                          {/* Target line (Solid Red) */}
                          <line
                            x1={xSlotStart + 2}
                            y1={targetY}
                            x2={xSlotStart + slotWidth - 2}
                            y2={targetY}
                            stroke="#dc2626"
                            strokeWidth={2.5}
                          />

                          <text
                            x={xSlotStart + slotWidth / 2}
                            y={svgHeight - paddingBottom + 16}
                            textAnchor="middle"
                            className={`text-[10px] font-mono ${isHovered ? 'fill-slate-900 font-black' : 'fill-slate-600'}`}
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  /* CASE C: SINGLE-BAR (Monthly, Single TW, Annual) */
                  <>
                    {chartData.map((d, idx) => {
                      const hasData = d.value !== null;
                      const val = d.value ?? 0;
                      const total = chartData.length;
                      const slotWidth = chartWidth / total;
                      const barWidth = Math.min(34, slotWidth * 0.65);
                      const xCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
                      const x = xCenter - barWidth / 2;
                      const y = getY(val);
                      const h = chartHeight - (y - paddingTop);
                      const targetY = getY(d.targetValue);
                      const isHovered = hoveredId === d.id;
                      const isMet = d.isMet;

                      return (
                        <g
                          key={d.id}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredId(d.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <rect
                            x={xCenter - slotWidth / 2}
                            y={paddingTop}
                            width={slotWidth}
                            height={chartHeight}
                            fill={isHovered ? '#f8fafc' : 'transparent'}
                          />

                          {hasData && (
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(2, h)}
                              rx={4}
                              fill={isMet === true ? '#059669' : '#e11d48'}
                              opacity={isHovered ? 1 : 0.85}
                              className="transition-all"
                            />
                          )}

                          {/* Target Line Tick (Solid Red) */}
                          <line
                            x1={x - 4}
                            y1={targetY}
                            x2={x + barWidth + 4}
                            y2={targetY}
                            stroke="#dc2626"
                            strokeWidth={2.5}
                          />

                          {/* Value label on top of bar */}
                          {hasData && (
                            <text
                              x={xCenter}
                              y={y - 6}
                              textAnchor="middle"
                              className="text-[10px] font-bold font-mono"
                              fill={isMet === true ? '#047857' : '#be123c'}
                            >
                              {val.toFixed(1)}%
                            </text>
                          )}

                          {/* X Axis Label */}
                          <text
                            x={xCenter}
                            y={svgHeight - paddingBottom + 16}
                            textAnchor="middle"
                            className={`text-[11px] font-mono ${
                              isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-600'
                            }`}
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* LINE CHART VIEW */}
            {chartType === 'line' && (
              <>
                {/* Target line - Solid Red Line as requested */}
                <path
                  d={targetPath}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Actual Average line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points on Line */}
                {points.map((p) => {
                  const isHovered = hoveredId === p.data.id;
                  const isMet = p.data.isMet;

                  return (
                    <g
                      key={p.data.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredId(p.data.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 7 : 5}
                        fill={isMet === true ? '#059669' : '#e11d48'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="transition-all"
                      />
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        className="text-[10px] font-bold font-mono"
                        fill={isMet === true ? '#047857' : '#be123c'}
                      >
                        {p.data.value?.toFixed(1)}%
                      </text>
                      <text
                        x={p.x}
                        y={svgHeight - paddingBottom + 16}
                        textAnchor="middle"
                        className="text-[11px] font-mono fill-slate-600"
                      >
                        {p.data.label}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Legend & Hover Details */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          {scope === 'triwulan' && selectedTw === 'all' ? (
            <>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-sky-600 inline-block"></span>
                <span>TW 1 (Jan-Mar)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-teal-600 inline-block"></span>
                <span>TW 2 (Apr-Jun)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block"></span>
                <span>TW 3 (Jul-Sep)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block"></span>
                <span>TW 4 (Okt-Des)</span>
              </span>
            </>
          ) : scope === 'semester' ? (
            <>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-cyan-600 inline-block"></span>
                <span>Semester 1 (Jan-Jun)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
                <span>Semester 2 (Jul-Des)</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
                <span>Memenuhi Target Standar</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-600 inline-block"></span>
                <span>Di Bawah Target Standar</span>
              </span>
            </>
          )}

          <span className="flex items-center gap-1.5 font-bold text-rose-700">
            <span className="w-5 h-0.5 bg-rose-600 inline-block"></span>
            <span>Target Standar Kemenkes RI (Garis Merah)</span>
          </span>
        </div>

        {/* Hover details if active */}
        {!isPrintMode && (
          <div>
            {hoveredItem ? (
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in shadow-xs">
                <span className="font-bold">{hoveredItem.label}:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{hoveredItem.title}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {hoveredItem.value !== null ? `${hoveredItem.value.toFixed(2)}%` : 'Belum Ada Data'}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">(Target: {hoveredItem.targetLabel})</span>
              </div>
            ) : (
              <div className="text-slate-400 text-[11px] italic">
                Arahkan kursor pada grafik untuk melihat rincian capaian indikator
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};