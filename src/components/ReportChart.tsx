import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  LineChart as LineChartIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, SHORT_MONTH_NAMES } from '../data/inmConfig';
import { ComprehensiveReportSummary, IndicatorDefinition, IndicatorSummary } from '../types/inm';
import { isTargetMet } from '../utils/calculations';

export type ChartScope = 'annual' | 'triwulan' | 'semester' | 'monthly';

interface ReportChartProps {
  summaries: IndicatorSummary[];
  comprehensiveSummary?: ComprehensiveReportSummary;
  indicators?: IndicatorDefinition[];
  selectedMonth?: number;
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
  indicators = INDICATORS,
  selectedMonth,
  monthName,
  year,
  initialScope = 'annual',
  chartType: externalChartType,
  onChartTypeChange,
  isPrintMode = false,
}) => {
  const [scope, setScope] = useState<ChartScope>(initialScope);
  const [selectedTw, setSelectedTw] = useState<'all' | 'tw1' | 'tw2' | 'tw3' | 'tw4'>('all');
  const [selectedSemester, setSelectedSemester] = useState<'all' | 's1' | 's2'>('all');
  const [internalChartType, setInternalChartType] = useState<'bar' | 'line'>('line');
  const chartType = externalChartType !== undefined ? externalChartType : internalChartType;

  const handleSetChartType = (newType: 'bar' | 'line') => {
    setInternalChartType(newType);
    if (onChartTypeChange) {
      onChartTypeChange(newType);
    }
  };

  const [hoveredPoint, setHoveredPoint] = useState<{ indId: number; monthIdx: number } | null>(null);

  // Determine which month indices (0..11) are displayed on the X-axis (bagian bawah)
  const getActiveMonthIndices = (): number[] => {
    if (scope === 'triwulan') {
      if (selectedTw === 'tw1') return [0, 1, 2];
      if (selectedTw === 'tw2') return [3, 4, 5];
      if (selectedTw === 'tw3') return [6, 7, 8];
      if (selectedTw === 'tw4') return [9, 10, 11];
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    if (scope === 'semester') {
      if (selectedSemester === 's1') return [0, 1, 2, 3, 4, 5];
      if (selectedSemester === 's2') return [6, 7, 8, 9, 10, 11];
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    // 'annual' and 'monthly' display all 12 months (Jan - Des) on X-axis
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  };

  const activeMonthIndices = getActiveMonthIndices();
  const activeMonthIndexFromName =
    selectedMonth !== undefined ? selectedMonth - 1 : MONTH_NAMES.indexOf(monthName);

  // SVG dimensions for each individual indicator chart
  const svgWidth = 900;
  const svgHeight = 235;
  const paddingLeft = 58;
  const paddingRight = 34;
  const paddingTop = 28;
  const paddingBottom = 46;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const yMax = 100;

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(yMax, val));
    return paddingTop + chartHeight - (clamped / yMax) * chartHeight;
  };

  const getScopeTitle = () => {
    switch (scope) {
      case 'triwulan':
        if (selectedTw === 'tw1') return `Grafik Per Indikator — Triwulan 1 (Januari - Maret ${year})`;
        if (selectedTw === 'tw2') return `Grafik Per Indikator — Triwulan 2 (April - Juni ${year})`;
        if (selectedTw === 'tw3') return `Grafik Per Indikator — Triwulan 3 (Juli - September ${year})`;
        if (selectedTw === 'tw4') return `Grafik Per Indikator — Triwulan 4 (Oktober - Desember ${year})`;
        return `Grafik Per Indikator — Semua Triwulan (Januari - Desember ${year})`;
      case 'semester':
        if (selectedSemester === 's1') return `Grafik Per Indikator — Semester 1 (Januari - Juni ${year})`;
        if (selectedSemester === 's2') return `Grafik Per Indikator — Semester 2 (Juli - Desember ${year})`;
        return `Grafik Per Indikator — Semester 1 & 2 (Januari - Desember ${year})`;
      case 'monthly':
        return `Grafik Tren Bulanan Per Indikator — Sorotan Bulan ${monthName} ${year}`;
      case 'annual':
      default:
        return `Grafik Capaian Bulanan Per Indikator (Januari - Desember ${year})`;
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs ${
        isPrintMode ? 'border-none p-2 shadow-none' : ''
      }`}
    >
      {/* Top Controls & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
              {getScopeTitle()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan <strong>{indicators.length} grafik indikator ke bawah</strong> dengan sumbu bawah{' '}
              <strong>Bulan</strong>, sumbu samping <strong>Nilai (%)</strong>, dan{' '}
              <strong className="text-red-600">Garis Merah Utuh</strong> sebagai Target Standar.
            </p>
          </div>
        </div>

        {/* Scope & Chart Type Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScope('annual')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'annual'
                  ? 'bg-white text-indigo-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Tahun (Jan-Des)
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('triwulan');
                if (selectedTw === 'all') setSelectedTw('tw1');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'triwulan'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Triwulan
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('semester');
                if (selectedSemester === 'all') setSelectedSemester('s1');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'semester'
                  ? 'bg-white text-cyan-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester
            </button>
            <button
              type="button"
              onClick={() => setScope('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'monthly'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan ({monthName.substring(0, 3)})
            </button>
          </div>

          {scope === 'triwulan' && (
            <div className="flex items-center bg-teal-50 p-1 rounded-xl border border-teal-200 text-xs font-semibold">
              {(['tw1', 'tw2', 'tw3', 'tw4', 'all'] as const).map((tw) => {
                const labelMap = {
                  tw1: 'TW 1 (Jan-Mar)',
                  tw2: 'TW 2 (Apr-Jun)',
                  tw3: 'TW 3 (Jul-Sep)',
                  tw4: 'TW 4 (Okt-Des)',
                  all: 'Semua (Jan-Des)',
                };
                return (
                  <button
                    key={tw}
                    type="button"
                    onClick={() => setSelectedTw(tw)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedTw === tw ? 'bg-teal-700 text-white shadow-2xs' : 'text-teal-900'
                    }`}
                  >
                    {labelMap[tw]}
                  </button>
                );
              })}
            </div>
          )}

          {scope === 'semester' && (
            <div className="flex items-center bg-cyan-50 p-1 rounded-xl border border-cyan-200 text-xs font-semibold">
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
              <button
                type="button"
                onClick={() => setSelectedSemester('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 'all' ? 'bg-cyan-700 text-white shadow-2xs' : 'text-cyan-900'
                }`}
              >
                Semua (S1 &amp; S2)
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
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'line' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5 text-teal-600" />
              <span>Garis Tren</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-slate-600 border-b border-slate-100 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block"></span>
            <span>Capaian Memenuhi Standar</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block"></span>
            <span>Capaian Belum Memenuhi Standar</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-red-600 inline-block"></span>
            <span className="font-bold text-red-700">Target Standar Nasional (Garis Merah)</span>
          </span>
        </div>
        <span className="text-slate-500">
          Total: <strong className="text-slate-800">{indicators.length} Grafik Indikator</strong> (Urut ke Bawah)
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 13 GRAFIK INDIKATOR BERURUTAN KE BAWAH (SUMBU X = BULAN, SUMBU Y = NILAI) */}
      {/* ========================================================================= */}
      <div className="space-y-5">
        {indicators.map((ind, indIndex) => {
          const compInd = comprehensiveSummary?.indicators.find((c) => c.id === ind.id);
          const currentMonthSum = summaries.find((s) => s.id === ind.id);

          // Build monthly data series for activeMonthIndices
          const monthSeries = activeMonthIndices.map((mIdx) => {
            let val = compInd?.monthlyPercents?.[mIdx] ?? null;
            if (val === null && mIdx === activeMonthIndexFromName && currentMonthSum?.avgPercent !== undefined) {
              val = currentMonthSum.avgPercent;
            }
            const met = val !== null ? isTargetMet(val, ind.targetOperator, ind.targetValue) : null;
            return {
              monthIdx: mIdx,
              monthFull: MONTH_NAMES[mIdx],
              monthShort: activeMonthIndices.length <= 6 ? MONTH_NAMES[mIdx] : SHORT_MONTH_NAMES[mIdx],
              val,
              met,
            };
          });

          // Calculate period average across displayed months
          const validValues = monthSeries.filter((m) => m.val !== null).map((m) => m.val as number);
          const periodAvg =
            validValues.length > 0
              ? validValues.reduce((acc, v) => acc + v, 0) / validValues.length
              : null;
          const periodMet =
            periodAvg !== null ? isTargetMet(periodAvg, ind.targetOperator, ind.targetValue) : null;

          const targetY = getY(ind.targetValue);
          const slotCount = monthSeries.length;
          const slotWidth = chartWidth / slotCount;
          const getSlotCenterX = (i: number) => paddingLeft + i * slotWidth + slotWidth / 2;

          const validLinePoints = monthSeries
            .map((item, i) => {
              if (item.val === null) return null;
              return {
                x: getSlotCenterX(i),
                y: getY(item.val),
                item,
              };
            })
            .filter(Boolean) as {
            x: number;
            y: number;
            item: (typeof monthSeries)[number];
          }[];

          const linePathD = validLinePoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

          const hoveredForThisInd =
            hoveredPoint && hoveredPoint.indId === ind.id
              ? monthSeries.find((m) => m.monthIdx === hoveredPoint.monthIdx)
              : null;

          return (
            <div
              key={ind.id}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-colors hover:border-slate-300 break-inside-avoid"
            >
              {/* Individual Indicator Chart Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-200/80">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-teal-800">
                      Grafik {indIndex + 1} / {indicators.length} &middot; {ind.code}
                    </span>
                    <span>&middot;</span>
                    <span>{ind.standardReference}</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 mt-0.5">
                    {indIndex + 1}. {ind.title}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
                  <span className="text-slate-600">
                    Standar Target: <strong className="font-mono text-red-700">{ind.targetLabel}</strong>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span className="text-slate-600">
                    Rata-Rata:{' '}
                    <strong className="font-mono text-slate-900">
                      {periodAvg !== null ? `${periodAvg.toFixed(2)}%` : '-'}
                    </strong>
                  </span>
                  {periodMet !== null && (
                    <>
                      <span className="text-slate-300" aria-hidden="true">|</span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          periodMet ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {periodMet ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tercapai</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Belum Tercapai</span>
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Hover Detail Readout */}
              {hoveredForThisInd && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Bulan <strong>{hoveredForThisInd.monthFull} {year}</strong>
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span>
                      Nilai:{' '}
                      <strong>
                        {hoveredForThisInd.val !== null ? `${hoveredForThisInd.val.toFixed(2)}%` : 'Belum diisi'}
                      </strong>
                    </span>
                    <span>Target: {ind.targetLabel}</span>
                    {hoveredForThisInd.met !== null && (
                      <span className={hoveredForThisInd.met ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {hoveredForThisInd.met ? 'Memenuhi Standar' : 'Di Bawah Standar'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* SVG Chart: X-Axis = Bulan, Y-Axis = Nilai (%) */}
              <div className="w-full overflow-x-auto bg-white rounded-lg border border-slate-200/80 p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto min-w-[560px] font-sans select-none"
                >
                  {/* Y-Axis Title on Left Side */}
                  <text
                    x={14}
                    y={paddingTop + chartHeight / 2}
                    transform={`rotate(-90, 14, ${paddingTop + chartHeight / 2})`}
                    textAnchor="middle"
                    className="text-[9.5px] font-bold fill-slate-500 tracking-wider"
                  >
                    NILAI (%)
                  </text>

                  {/* Horizontal Y-Axis Grid Lines & % Labels (0% - 100%) */}
                  {[0, 20, 40, 60, 80, 100].map((lvl) => {
                    const y = getY(lvl);
                    return (
                      <g key={lvl}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          stroke={lvl === 0 ? '#94a3b8' : '#e2e8f0'}
                          strokeWidth={lvl === 0 ? 1.2 : 1}
                          strokeDasharray={lvl === 0 || lvl === 100 ? undefined : '3 3'}
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[10px] font-mono fill-slate-600 font-semibold"
                        >
                          {lvl}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Y-Axis Left Border Line */}
                  <line
                    x1={paddingLeft}
                    y1={paddingTop}
                    x2={paddingLeft}
                    y2={paddingTop + chartHeight}
                    stroke="#94a3b8"
                    strokeWidth={1.2}
                  />

                  {/* Highlight Active Month Column when scope === 'monthly' */}
                  {scope === 'monthly' &&
                    monthSeries.map((item, i) => {
                      if (item.monthIdx !== activeMonthIndexFromName) return null;
                      return (
                        <rect
                          key={`hl-${item.monthIdx}`}
                          x={paddingLeft + i * slotWidth + 2}
                          y={paddingTop}
                          width={slotWidth - 4}
                          height={chartHeight}
                          fill="#ecfdf5"
                          rx={4}
                        />
                      );
                    })}

                  {/* BAR CHART MODE */}
                  {chartType === 'bar' &&
                    monthSeries.map((item, i) => {
                      const centerX = getSlotCenterX(i);
                      const barWidth = Math.min(38, Math.max(16, slotWidth * 0.52));
                      const isHovered =
                        hoveredPoint?.indId === ind.id && hoveredPoint?.monthIdx === item.monthIdx;

                      return (
                        <g
                          key={item.monthIdx}
                          onMouseEnter={() => setHoveredPoint({ indId: ind.id, monthIdx: item.monthIdx })}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() =>
                            setHoveredPoint((prev) =>
                              prev?.indId === ind.id && prev?.monthIdx === item.monthIdx
                                ? null
                                : { indId: ind.id, monthIdx: item.monthIdx }
                            )
                          }
                          className="cursor-pointer"
                        >
                          {/* Invisible hover hit column */}
                          <rect
                            x={paddingLeft + i * slotWidth}
                            y={paddingTop}
                            width={slotWidth}
                            height={chartHeight}
                            fill="transparent"
                          />

                          {item.val !== null ? (
                            <>
                              <rect
                                x={centerX - barWidth / 2}
                                y={getY(item.val)}
                                width={barWidth}
                                height={Math.max(2, paddingTop + chartHeight - getY(item.val))}
                                fill={item.met ? '#059669' : '#e11d48'}
                                opacity={isHovered ? 1 : 0.9}
                                rx={3}
                              />
                              <text
                                x={centerX}
                                y={Math.max(14, getY(item.val) - 6)}
                                textAnchor="middle"
                                className="text-[9.5px] font-mono font-bold fill-slate-800"
                              >
                                {item.val.toFixed(1)}%
                              </text>
                            </>
                          ) : (
                            <text
                              x={centerX}
                              y={paddingTop + chartHeight - 6}
                              textAnchor="middle"
                              className="text-[9px] font-mono fill-slate-300"
                            >
                              -
                            </text>
                          )}
                        </g>
                      );
                    })}

                  {/* TARGET STANDAR LINE — SOLID RED LINE (#dc2626, NOT DASHED) */}
                  <line
                    x1={paddingLeft}
                    y1={targetY}
                    x2={svgWidth - paddingRight}
                    y2={targetY}
                    stroke="#dc2626"
                    strokeWidth={2.3}
                  />
                  <rect
                    x={svgWidth - paddingRight - 96}
                    y={Math.max(4, targetY - 17)}
                    width={94}
                    height={14}
                    rx={3}
                    fill="#fef2f2"
                    stroke="#fecaca"
                    strokeWidth={0.8}
                  />
                  <text
                    x={svgWidth - paddingRight - 49}
                    y={Math.max(14, targetY - 7)}
                    textAnchor="middle"
                    className="text-[8.5px] font-mono font-bold fill-red-700"
                  >
                    Standar: {ind.targetLabel}
                  </text>

                  {/* LINE TREND CHART MODE */}
                  {chartType === 'line' && (
                    <>
                      {validLinePoints.length > 1 && (
                        <path
                          d={linePathD}
                          fill="none"
                          stroke="#0f766e"
                          strokeWidth={2.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {monthSeries.map((item, i) => {
                        const centerX = getSlotCenterX(i);
                        const isHovered =
                          hoveredPoint?.indId === ind.id && hoveredPoint?.monthIdx === item.monthIdx;

                        return (
                          <g
                            key={item.monthIdx}
                            onMouseEnter={() => setHoveredPoint({ indId: ind.id, monthIdx: item.monthIdx })}
                            onMouseLeave={() => setHoveredPoint(null)}
                            onClick={() =>
                              setHoveredPoint((prev) =>
                                prev?.indId === ind.id && prev?.monthIdx === item.monthIdx
                                  ? null
                                  : { indId: ind.id, monthIdx: item.monthIdx }
                              )
                            }
                            className="cursor-pointer"
                          >
                            <rect
                              x={paddingLeft + i * slotWidth}
                              y={paddingTop}
                              width={slotWidth}
                              height={chartHeight}
                              fill="transparent"
                            />
                            {item.val !== null ? (
                              <>
                                <circle
                                  cx={centerX}
                                  cy={getY(item.val)}
                                  r={isHovered ? 6 : 4.5}
                                  fill={item.met ? '#059669' : '#e11d48'}
                                  stroke="#ffffff"
                                  strokeWidth={1.8}
                                />
                                <text
                                  x={centerX}
                                  y={Math.max(13, getY(item.val) - 8)}
                                  textAnchor="middle"
                                  className="text-[9.5px] font-mono font-bold fill-slate-800"
                                >
                                  {item.val.toFixed(1)}%
                                </text>
                              </>
                            ) : (
                              <circle
                                cx={centerX}
                                cy={paddingTop + chartHeight}
                                r={2}
                                fill="#cbd5e1"
                              />
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* X-Axis Month Labels (Bagian Bawah = Bulan) */}
                  {monthSeries.map((item, i) => {
                    const centerX = getSlotCenterX(i);
                    const isSelectedMonth = scope === 'monthly' && item.monthIdx === activeMonthIndexFromName;
                    return (
                      <text
                        key={`lbl-${item.monthIdx}`}
                        x={centerX}
                        y={paddingTop + chartHeight + 18}
                        textAnchor="middle"
                        className={`text-[10px] font-sans ${
                          isSelectedMonth ? 'fill-emerald-800 font-extrabold' : 'fill-slate-700 font-semibold'
                        }`}
                      >
                        {item.monthShort}
                      </text>
                    );
                  })}

                  {/* X-Axis Caption */}
                  <text
                    x={paddingLeft + chartWidth / 2}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-slate-400 tracking-wider uppercase"
                  >
                    BULAN PELAPORAN TAHUN {year}
                  </text>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};