import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Building,
  Target,
  ArrowRight
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, UNITS } from '../data/inmConfig';
import { MonthlyRecord } from '../types/inm';
import {
  computeMonthlySummaries,
  computeOverallStats,
  formatPercent
} from '../utils/calculations';

interface AnalyticsViewProps {
  record: MonthlyRecord;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ record }) => {
  const summaries = computeMonthlySummaries(record);
  const stats = computeOverallStats(summaries);
  const monthName = MONTH_NAMES[record.month - 1];

  // Unit compliance comparison
  const unitStats = UNITS.map((unit) => {
    let totalAssigned = 0;
    let metCount = 0;
    let sumPercent = 0;
    let countPercent = 0;

    summaries.forEach((s) => {
      const uData = s.unitValues[unit.code];
      if (uData && uData.percent !== null) {
        sumPercent += uData.percent;
        countPercent++;
        totalAssigned++;
        if (uData.isMet) {
          metCount++;
        }
      }
    });

    const avg = countPercent > 0 ? sumPercent / countPercent : 0;
    const rate = totalAssigned > 0 ? (metCount / totalAssigned) * 100 : 0;

    return {
      code: unit.code,
      name: unit.name,
      fullName: unit.fullName,
      average: avg,
      complianceRate: rate,
      totalIndicators: totalAssigned,
      metCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-semibold mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visualisasi & Analisis Capaian Mutu</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Analisis Kinerja Mutu Nasional
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Evaluasi komparatif capaian mutu antar instalasi/unit dan perbandingan terhadap standar nasional Kemenkes.
            </p>
          </div>
          <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Kepatuhan RS Keseluruhan</span>
            <p className="text-xl font-black text-teal-700">{stats.complianceRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* 13 Indicators Bar Chart Visualization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Grafik Capaian 13 Indikator Nasional vs Target ({monthName} {record.year})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Garis putus-putus menunjukkan ambang batas target nasional Kemenkes RI.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              Tercapai
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
              Belum Tercapai
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {summaries.map((s) => {
            const hasData = s.avgPercent !== null;
            const pct = s.avgPercent ?? 0;
            const target = s.targetValue;
            const isMet = s.isMetAverage;

            return (
              <div key={s.id} className="group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {s.id}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{s.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 font-mono text-[11px]">
                      Target: <strong className="text-slate-700">{s.targetLabel}</strong>
                    </span>
                    <span
                      className={`font-bold font-mono text-xs w-16 text-right ${
                        isMet === true
                          ? 'text-emerald-700'
                          : isMet === false
                          ? 'text-rose-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {hasData ? `${pct.toFixed(2)}%` : '-'}
                    </span>
                  </div>
                </div>

                {/* Progress bar with target line */}
                <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  {/* Fill bar */}
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      !hasData
                        ? 'w-0'
                        : isMet === true
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-rose-500 to-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  ></div>

                  {/* Target line indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                    style={{ left: `${Math.min(100, Math.max(0, target))}%` }}
                    title={`Target: ${target}%`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unit Performance Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
          <Building className="w-4 h-4 text-teal-600" />
          <span>Kinerja Mutu per Instalasi / Unit Pelayanan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unitStats.map((u) => (
            <div
              key={u.code}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-slate-900 text-sm">{u.code}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  {u.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 truncate">{u.fullName}</p>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Rata-Rata Capaian:</span>
                  <span className="font-bold text-slate-900">{u.average.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Target Terpenuhi:</span>
                  <span className="font-bold text-emerald-700">
                    {u.metCount} / {u.totalIndicators} Indikator
                  </span>
                </div>
              </div>

              {/* Mini progress */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${u.complianceRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};