import React, { useMemo } from 'react';
import {
  BarChart3,
  Building,
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, UNITS } from '../data/inmConfig';
import { IndicatorDefinition, MonthlyRecord } from '../types/inm';
import {
  computeComprehensiveSummaries,
  computeMonthlySummaries,
  computeOverallStats,
} from '../utils/calculations';
import { ReportChart } from './ReportChart';

interface AnalyticsViewProps {
  record: MonthlyRecord;
  yearRecords?: Record<number, MonthlyRecord>;
  indicators?: IndicatorDefinition[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  record,
  yearRecords,
  indicators = INDICATORS,
}) => {
  const summaries = useMemo(() => computeMonthlySummaries(record, indicators), [record, indicators]);
  const stats = useMemo(() => computeOverallStats(summaries), [summaries]);
  const comprehensive = useMemo(
    () =>
      computeComprehensiveSummaries(
        record.year,
        yearRecords || { [record.month]: record },
        indicators
      ),
    [record.year, record.month, record, yearRecords, indicators]
  );

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
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-800 mb-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              <span>Visualisasi &amp; Analisis Capaian Mutu ({indicators.length} Indikator)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Grafik Bulanan Per Indikator Mutu
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Menampilkan {indicators.length} grafik vertikal per indikator dengan Bulan di bagian bawah, Nilai (%) di bagian samping, dan Garis Merah Target Standar.
            </p>
          </div>
          <div className="text-right bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shrink-0">
            <span className="text-xs text-slate-500 block">Kepatuhan Bulan {monthName}</span>
            <p className="text-xl font-black text-teal-700">{stats.complianceRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* 13 Vertical Per-Indicator Monthly Charts */}
      <ReportChart
        summaries={summaries}
        comprehensiveSummary={comprehensive}
        indicators={indicators}
        selectedMonth={record.month}
        monthName={monthName}
        year={record.year}
        initialScope="annual"
      />

      {/* Unit Performance Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
          <Building className="w-4 h-4 text-teal-600" />
          <span>Kinerja Mutu per Instalasi / Unit Pelayanan ({monthName} {record.year})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unitStats.map((u) => (
            <div
              key={u.code}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-slate-900 text-sm">{u.code}</span>
                <span className="text-xs font-semibold text-slate-600">{u.name}</span>
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