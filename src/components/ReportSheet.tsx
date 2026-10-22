import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Check,
  XCircle,
  Building2,
  Clock,
  Layers,
  TableProperties,
  Bell,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart3,
  Award,
  Filter
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, UNITS } from '../data/inmConfig';
import { HospitalConfig, MonthlyRecord, ThresholdAlert } from '../types/inm';
import {
  computeComprehensiveSummaries,
  computeMonthlySummaries,
  computeOverallStats,
  formatNumber,
  formatPercent,
  isTargetMet,
} from '../utils/calculations';
import { getThresholdAlerts } from '../utils/validation';
import { ReportChart } from './ReportChart';

interface ReportSheetProps {
  record: MonthlyRecord;
  hospital: HospitalConfig;
  yearRecords?: Record<number, MonthlyRecord>;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onPrint: (chartModel?: 'bar' | 'line', periodScope?: 'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all') => void;
  onNavigateToInput: () => void;
}

export const ReportSheet: React.FC<ReportSheetProps> = ({
  record,
  hospital,
  yearRecords,
  onExportExcel,
  onExportCSV,
  onPrint,
  onNavigateToInput,
}) => {
  const [activeChartModel, setActiveChartModel] = useState<'bar' | 'line'>('bar');
  const [viewTableMode, setViewTableMode] = useState<'periods' | 'monthlyMatrix' | 'ndDetails'>('periods');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all'
  >('tw1');
  const [filterThreshold, setFilterThreshold] = useState<'all' | 'alertsOnly'>('all');
  const [showAlertDetails, setShowAlertDetails] = useState<boolean>(true);
  const [showUnitBreakdown, setShowUnitBreakdown] = useState<boolean>(false);

  const monthName = MONTH_NAMES[record.month - 1];
  const currentTw = record.month <= 3 ? 'tw1' : record.month <= 6 ? 'tw2' : record.month <= 9 ? 'tw3' : 'tw4';
  const currentSemester = record.month <= 6 ? 's1' : 's2';

  // Monthly computations for the currently selected month
  const summaries = useMemo(() => computeMonthlySummaries(record), [record]);
  const stats = useMemo(() => computeOverallStats(summaries), [summaries]);
  const alerts: ThresholdAlert[] = useMemo(() => getThresholdAlerts(summaries), [summaries]);

  // Comprehensive computations across Monthly, Triwulan (TW1-4), Semester (S1-2), and Tahunan (Annual)
  const comprehensive = useMemo(() => {
    return computeComprehensiveSummaries(record.year, yearRecords || { [record.month]: record });
  }, [record.year, record.month, record, yearRecords]);

  // Period config helper
  const getPeriodConfig = (period: typeof selectedPeriod) => {
    switch (period) {
      case 'tw1':
        return {
          title: `Triwulan 1 (Januari - Maret ${record.year})`,
          shortLabel: 'Triwulan 1',
          monthNames: ['Januari', 'Februari', 'Maret'],
          monthIndices: [0, 1, 2],
          rate: comprehensive.overallTwComplianceRates.tw1,
          getValue: (ind: any) => ind.tw1.percent,
          getIsMet: (ind: any) => ind.tw1.isMet,
        };
      case 'tw2':
        return {
          title: `Triwulan 2 (April - Juni ${record.year})`,
          shortLabel: 'Triwulan 2',
          monthNames: ['April', 'Mei', 'Juni'],
          monthIndices: [3, 4, 5],
          rate: comprehensive.overallTwComplianceRates.tw2,
          getValue: (ind: any) => ind.tw2.percent,
          getIsMet: (ind: any) => ind.tw2.isMet,
        };
      case 'tw3':
        return {
          title: `Triwulan 3 (Juli - September ${record.year})`,
          shortLabel: 'Triwulan 3',
          monthNames: ['Juli', 'Agustus', 'September'],
          monthIndices: [6, 7, 8],
          rate: comprehensive.overallTwComplianceRates.tw3,
          getValue: (ind: any) => ind.tw3.percent,
          getIsMet: (ind: any) => ind.tw3.isMet,
        };
      case 'tw4':
        return {
          title: `Triwulan 4 (Oktober - Desember ${record.year})`,
          shortLabel: 'Triwulan 4',
          monthNames: ['Oktober', 'November', 'Desember'],
          monthIndices: [9, 10, 11],
          rate: comprehensive.overallTwComplianceRates.tw4,
          getValue: (ind: any) => ind.tw4.percent,
          getIsMet: (ind: any) => ind.tw4.isMet,
        };
      case 's1':
        return {
          title: `Semester 1 (Januari - Juni ${record.year})`,
          shortLabel: 'Semester 1',
          monthNames: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'],
          monthIndices: [0, 1, 2, 3, 4, 5],
          rate: comprehensive.overallSemesterComplianceRates.s1,
          getValue: (ind: any) => ind.s1.percent,
          getIsMet: (ind: any) => ind.s1.isMet,
        };
      case 's2':
        return {
          title: `Semester 2 (Juli - Desember ${record.year})`,
          shortLabel: 'Semester 2',
          monthNames: ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
          monthIndices: [6, 7, 8, 9, 10, 11],
          rate: comprehensive.overallSemesterComplianceRates.s2,
          getValue: (ind: any) => ind.s2.percent,
          getIsMet: (ind: any) => ind.s2.isMet,
        };
      case 'annual':
        return {
          title: `Tahunan (${record.year})`,
          shortLabel: 'Tahunan',
          monthNames: MONTH_NAMES,
          monthIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          rate: comprehensive.overallAnnualComplianceRate,
          getValue: (ind: any) => ind.annual.percent,
          getIsMet: (ind: any) => ind.annual.isMet,
        };
      case 'monthly':
        return {
          title: `Bulan ${monthName} ${record.year}`,
          shortLabel: `Bulan ${monthName}`,
          monthNames: [monthName],
          monthIndices: [record.month - 1],
          rate: stats.complianceRate,
          getValue: (ind: any) => {
            const s = summaries.find((m) => m.id === ind.id);
            return s?.avgPercent ?? null;
          },
          getIsMet: (ind: any) => {
            const s = summaries.find((m) => m.id === ind.id);
            return s?.isMetAverage ?? null;
          },
        };
      case 'all':
      default:
        return {
          title: `Semua Periode (${record.year})`,
          shortLabel: 'Semua Periode',
          monthNames: [],
          monthIndices: [],
          rate: comprehensive.overallAnnualComplianceRate,
          getValue: (ind: any) => ind.annual.percent,
          getIsMet: (ind: any) => ind.annual.isMet,
        };
    }
  };

  const activePeriodConfig = getPeriodConfig(selectedPeriod);

  // Filter indicators if user selected alertsOnly
  const displayedIndicators = comprehensive.indicators.filter((ind) => {
    if (filterThreshold === 'alertsOnly') {
      const s = summaries.find((sum) => sum.id === ind.id);
      return s?.isMetAverage === false || ind.annual.isMet === false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Auto-Sync Notification & Comprehensive Info */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rekapitulasi Mutu Nasional Terpadu &amp; Tersinkronisasi</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              LAPORAN INDIKATOR NASIONAL MUTU (INM)
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
              Memuat kalkulasi <span className="text-emerald-300 font-bold">Rata-Rata Bulanan</span>,{' '}
              <span className="text-teal-300 font-bold">Capaian Per Triwulan (TW 1 - 4)</span>,{' '}
              <span className="text-cyan-300 font-bold">Semester (1 &amp; 2)</span>, dan{' '}
              <span className="text-amber-300 font-bold">Rata-Rata Tahunan</span> ke-13 Indikator Nasional Mutu sesuai standar Kemenkes RI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh Excel</span>
            </button>

            {/* Dedicated Print Buttons: Triwulan, Semester 1 & 2, Tahunan */}
            <div className="inline-flex items-center bg-emerald-800/80 p-1 rounded-xl border border-emerald-400/30 gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => onPrint(activeChartModel, currentTw)}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Cetak Laporan Khusus Triwulan"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak Triwulan</span>
              </button>
              <button
                type="button"
                onClick={() => onPrint(activeChartModel, 's1')}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Cetak Laporan Semester 1 (Januari - Juni)"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak Sem 1</span>
              </button>
              <button
                type="button"
                onClick={() => onPrint(activeChartModel, 's2')}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Cetak Laporan Semester 2 (Juli - Desember)"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak Sem 2</span>
              </button>
              <button
                type="button"
                onClick={() => onPrint(activeChartModel, 'annual')}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Cetak Laporan Evaluasi Tahunan"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak Tahunan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Period & Hospital Info */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{hospital.name}</span>
            <span>&bull;</span>
            <span>Bulan Berjalan: <strong className="text-emerald-300">{monthName} {record.year}</strong></span>
            <span>&bull;</span>
            <span>Tahun Evaluasi: <strong className="text-teal-300">{record.year}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Kalkulasi Triwulan, Semester &amp; Tahunan Otomatis Aktif</span>
          </div>
        </div>
      </div>

      {/* SISTEM PERINGATAN (WARNING NOTIFICATION SYSTEM) */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30 animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-rose-950 text-sm md:text-base flex items-center gap-2">
                  <span>PERINGATAN: {alerts.length} INDIKATOR DI LUAR AMBANG BATAS</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                    Perlu Tindak Lanjut
                  </span>
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Rata-rata capaian mutu pada bulan <strong>{monthName} {record.year}</strong> belum memenuhi standar nasional Kemenkes RI.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAlertDetails(!showAlertDetails)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer border border-rose-300"
              >
                <span>{showAlertDetails ? 'Sembunyikan Rincian' : 'Lihat Rincian Peringatan'}</span>
                {showAlertDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded List of Warnings */}
          {showAlertDetails && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {alerts.map((al) => (
                <div
                  key={al.indicatorId}
                  className="bg-white rounded-xl p-3.5 border border-rose-200 shadow-2xs flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    {al.indicatorId}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {al.indicatorTitle}
                      </h4>
                      <span className="text-[10px] font-extrabold text-rose-700 font-mono shrink-0">
                        Gap: {al.gap.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-slate-500">Capaian:</span>
                      <span className="font-mono font-bold text-rose-600">{al.currentValue.toFixed(2)}%</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-500">Target:</span>
                      <span className="font-mono font-bold text-emerald-700">{al.targetLabel}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 italic leading-relaxed">
                      Rekomendasi: {al.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXECUTIVE SUMMARY CARDS: BULANAN, TRIWULAN, SEMESTER & TAHUNAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kepatuhan Bulan Ini */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs bg-emerald-50/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Capaian Bulan {monthName}
            </p>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {stats.complianceRate.toFixed(1)}% Kepatuhan
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{stats.totalMet}</span>
            <span className="text-xs font-semibold text-emerald-600">dari {stats.totalWithData} Indikator Memenuhi</span>
          </div>
          <p className="text-[11px] text-emerald-600/90 mt-1">
            Standar Nasional INM Bulan Berjalan
          </p>
          <div className="w-full bg-emerald-200/70 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.complianceRate}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Capaian Triwulan Berjalan */}
        <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-2xs bg-teal-50/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-teal-800 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Capaian Triwulan ({record.month <= 3 ? 'TW 1' : record.month <= 6 ? 'TW 2' : record.month <= 9 ? 'TW 3' : 'TW 4'})
            </p>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
              3 Bulan
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-teal-800">
              {record.month <= 3
                ? comprehensive.overallTwComplianceRates.tw1.toFixed(1)
                : record.month <= 6
                ? comprehensive.overallTwComplianceRates.tw2.toFixed(1)
                : record.month <= 9
                ? comprehensive.overallTwComplianceRates.tw3.toFixed(1)
                : comprehensive.overallTwComplianceRates.tw4.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-teal-600">Tingkat Capaian TW</span>
          </div>
          <p className="text-[11px] text-teal-600/90 mt-1">
            Rata-rata 3 bulan dalam triwulan berjalan
          </p>
          <div className="w-full bg-teal-200/70 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  record.month <= 3
                    ? comprehensive.overallTwComplianceRates.tw1
                    : record.month <= 6
                    ? comprehensive.overallTwComplianceRates.tw2
                    : record.month <= 9
                    ? comprehensive.overallTwComplianceRates.tw3
                    : comprehensive.overallTwComplianceRates.tw4
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 3: Capaian Semester Berjalan */}
        <div className="bg-white rounded-2xl border border-cyan-200 p-4 shadow-2xs bg-cyan-50/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-cyan-800 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
              Capaian Semester ({record.month <= 6 ? 'Semester 1' : 'Semester 2'})
            </p>
            <span className="text-[11px] font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
              6 Bulan
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-cyan-900">
              {record.month <= 6
                ? comprehensive.overallSemesterComplianceRates.s1.toFixed(1)
                : comprehensive.overallSemesterComplianceRates.s2.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-cyan-700">Tingkat Capaian Semester</span>
          </div>
          <p className="text-[11px] text-cyan-700 mt-1">
            Akumulasi evaluasi mutu tengah tahunan
          </p>
          <div className="w-full bg-cyan-200/70 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-cyan-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  record.month <= 6
                    ? comprehensive.overallSemesterComplianceRates.s1
                    : comprehensive.overallSemesterComplianceRates.s2
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 4: Rata-Rata Tahunan Keseluruhan */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-2xs bg-indigo-50/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-700" />
              Rata-Rata Tahunan ({record.year})
            </p>
            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
              12 Bulan
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-900">
              {comprehensive.overallAnnualComplianceRate.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-indigo-700">Tingkat Capaian RS</span>
          </div>
          <p className="text-[11px] text-indigo-700 mt-1">
            {comprehensive.totalMetAnnual} dari {comprehensive.totalWithDataAnnual} indikator memenuhi target tahunan
          </p>
          <div className="w-full bg-indigo-200/70 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${comprehensive.overallAnnualComplianceRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* VISUALISASI DATA: GRAFIK CAPAIAN RATA-RATA (BULANAN, TRIWULAN, SEMESTER, TAHUNAN) */}
      <ReportChart
        summaries={summaries}
        comprehensiveSummary={comprehensive}
        monthName={monthName}
        year={record.year}
        chartType={activeChartModel}
        onChartTypeChange={setActiveChartModel}
      />

      {/* TABEL REKAPITULASI NILAI RATA-RATA INDIKATOR NASIONAL MUTU (INM) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Table Title Bar & View Controls */}
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                TABEL REKAPITULASI NILAI RATA-RATA INDIKATOR NASIONAL MUTU (INM)
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Lengkap Terpadu
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Rekapitulasi resmi capaian rata-rata mutu per Triwulan (TW 1 - 4), Semester (1 &amp; 2), dan Tahunan untuk ke-13 indikator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setViewTableMode('periods')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewTableMode === 'periods'
                    ? 'bg-slate-800 text-white font-extrabold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rata-Rata TW &amp; Semester
              </button>
              <button
                type="button"
                onClick={() => setViewTableMode('monthlyMatrix')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewTableMode === 'monthlyMatrix'
                    ? 'bg-slate-800 text-white font-extrabold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matriks 12 Bulan (Jan - Des)
              </button>
              <button
                type="button"
                onClick={() => setViewTableMode('ndDetails')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewTableMode === 'ndDetails'
                    ? 'bg-slate-800 text-white font-extrabold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rincian Nilai N &amp; D
              </button>
            </div>

            {/* Filter: All vs Alerts Only */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setFilterThreshold('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterThreshold === 'all'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({comprehensive.indicators.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterThreshold('alertsOnly')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  filterThreshold === 'alertsOnly'
                    ? 'bg-rose-700 text-white font-bold'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Peringatan ({alerts.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: REKAPITULASI PERIODE (DYNAMIC PERIODE: TW1-4, S1-2, TAHUNAN, SEMUA) */}
        {viewTableMode === 'periods' && (
          <div>
            {/* Sub-toolbar: Period Selector & Direct Print Button */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Pilih Periode:
                </span>
                {[
                  { id: 'tw1', label: 'Triwulan 1 (Jan - Mar)' },
                  { id: 'tw2', label: 'Triwulan 2 (Apr - Jun)' },
                  { id: 'tw3', label: 'Triwulan 3 (Jul - Sep)' },
                  { id: 'tw4', label: 'Triwulan 4 (Okt - Des)' },
                  { id: 's1', label: 'Semester 1 (Jan - Jun)' },
                  { id: 's2', label: 'Semester 2 (Jul - Des)' },
                  { id: 'annual', label: 'Tahunan (12 Bln)' },
                  { id: 'all', label: 'Semua TW (Matriks)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedPeriod === p.id
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Action Button: Print the selected period */}
              <button
                type="button"
                onClick={() => onPrint(activeChartModel, selectedPeriod)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                title={`Cetak Laporan ${activePeriodConfig.title}`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan: {activePeriodConfig.shortLabel}</span>
              </button>
            </div>

            {/* TABEL PERIODE SPESIFIK (CONTOH: TRIWULAN 1 MENAMPILKAN JANUARI, FEBRUARI, MARET) */}
            {selectedPeriod !== 'all' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-200/90 text-slate-900 font-bold border-b-2 border-slate-300 font-sans">
                      <th className="py-3 px-2 w-10 text-center border-r border-slate-300">NO.</th>
                      <th className="py-3 px-4 min-w-[240px] border-r border-slate-300">
                        INDIKATOR NASIONAL MUTU
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-slate-100">
                        STANDAR
                      </th>
                      {activePeriodConfig.monthIndices.map((mIdx) => (
                        <th
                          key={mIdx}
                          className={`py-3 px-2 text-center border-r border-slate-300 font-mono text-xs ${
                            mIdx + 1 === record.month
                              ? 'bg-emerald-100/90 text-emerald-950 font-black'
                              : 'bg-slate-100/90 text-slate-800 font-bold'
                          }`}
                        >
                          BULAN {MONTH_NAMES[mIdx].toUpperCase()} (%)
                        </th>
                      ))}
                      <th className="py-3 px-3 w-36 text-center border-r border-slate-300 bg-teal-100/80 text-teal-950 font-black">
                        RATA-RATA {activePeriodConfig.shortLabel.toUpperCase()} (%)
                      </th>
                      <th className="py-3 px-3 w-32 text-center font-black">
                        STATUS CAPAIAN
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {displayedIndicators.map((ind) => {
                      const periodVal = activePeriodConfig.getValue(ind);
                      const isMet = activePeriodConfig.getIsMet(ind);

                      return (
                        <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-2 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                            {ind.id}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200 font-sans">
                            <div className="font-semibold text-slate-900 leading-snug">{ind.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ind.code}</div>
                          </td>
                          <td className="py-3 px-2 text-center border-r border-slate-200 bg-slate-50 text-slate-800 font-bold">
                            {ind.targetLabel}
                          </td>

                          {/* Dynamic Month Columns (e.g. Januari, Februari, Maret for TW1) */}
                          {activePeriodConfig.monthIndices.map((mIdx) => {
                            const val = ind.monthlyPercents[mIdx];
                            return (
                              <td
                                key={mIdx}
                                className={`py-3 px-2 text-center border-r border-slate-200 ${
                                  mIdx + 1 === record.month ? 'bg-emerald-50/40 font-bold' : ''
                                }`}
                              >
                                {val !== null && val !== undefined ? (
                                  <span className="font-mono text-slate-800">
                                    {val.toFixed(2)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Period Average Value */}
                          <td className="py-3 px-3 text-center border-r border-slate-200 bg-teal-50/50 font-black">
                            {periodVal !== null && periodVal !== undefined ? (
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs inline-block font-extrabold ${
                                  isMet ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                {periodVal.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Status Capaian */}
                          <td className="py-3 px-3 text-center font-sans text-[11px] font-bold">
                            {isMet === true ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tercapai</span>
                              </span>
                            ) : isMet === false ? (
                              <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Peringatan</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Belum Lengkap</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer Summary Row */}
                  <tfoot className="bg-slate-100 font-sans border-t-2 border-slate-300 text-slate-900 font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right border-r border-slate-300 font-extrabold uppercase">
                        Rata-Rata Capaian {activePeriodConfig.shortLabel} Rumah Sakit:
                      </td>
                      {activePeriodConfig.monthIndices.map((mIdx) => {
                        let sum = 0;
                        let count = 0;
                        displayedIndicators.forEach((ind) => {
                          const val = ind.monthlyPercents[mIdx];
                          if (val !== null && val !== undefined) {
                            sum += val;
                            count++;
                          }
                        });
                        const avg = count > 0 ? sum / count : null;
                        return (
                          <td key={mIdx} className="py-3 px-2 text-center border-r border-slate-300 font-mono">
                            {avg !== null ? `${avg.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center border-r border-slate-300 bg-teal-200/80 text-teal-950 font-black font-mono text-sm">
                        {activePeriodConfig.rate.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            activePeriodConfig.rate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {activePeriodConfig.rate >= 80 ? 'Sangat Baik' : 'Perlu Evaluasi'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* TABEL RINGKASAN SEMUA PERIODE */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-200/90 text-slate-900 font-bold border-b-2 border-slate-300 font-sans">
                      <th className="py-3 px-2 w-10 text-center border-r border-slate-300">NO.</th>
                      <th className="py-3 px-4 min-w-[240px] border-r border-slate-300">
                        INDIKATOR NASIONAL MUTU
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-slate-100">
                        STANDAR
                      </th>
                      <th className="py-3 px-2 w-28 text-center border-r border-slate-300 bg-emerald-100/70 text-emerald-950 font-black">
                        BULAN {monthName.substring(0, 3).toUpperCase()} (%)
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-sky-100/70 text-sky-950 font-extrabold">
                        TW 1 (%)
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-teal-100/70 text-teal-950 font-extrabold">
                        TW 2 (%)
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-amber-100/70 text-amber-950 font-extrabold">
                        TW 3 (%)
                      </th>
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300 bg-purple-100/70 text-purple-950 font-extrabold">
                        TW 4 (%)
                      </th>
                      <th className="py-3 px-2 w-28 text-center border-r border-slate-300 bg-cyan-100/80 text-cyan-950 font-extrabold">
                        SEMESTER 1
                      </th>
                      <th className="py-3 px-2 w-28 text-center border-r border-slate-300 bg-emerald-100/80 text-emerald-950 font-extrabold">
                        SEMESTER 2
                      </th>
                      <th className="py-3 px-3 w-32 text-center border-r border-slate-300 bg-indigo-100/90 text-indigo-950 font-black">
                        TAHUNAN {record.year}
                      </th>
                      <th className="py-3 px-3 w-28 text-center font-black">
                        STATUS MUTU
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {displayedIndicators.map((ind) => {
                      const monthlySum = summaries.find((s) => s.id === ind.id);
                      const isMonthlyMet = monthlySum?.isMetAverage;
                      const isAnnualMet = ind.annual.isMet;

                      return (
                        <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-2 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                            {ind.id}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200 font-sans">
                            <div className="font-semibold text-slate-900 leading-snug">{ind.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ind.code}</div>
                          </td>
                          <td className="py-3 px-2 text-center border-r border-slate-200 bg-slate-50 text-slate-800 font-bold">
                            {ind.targetLabel}
                          </td>

                          {/* Bulan Ini */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 font-bold bg-emerald-50/40">
                            {monthlySum?.avgPercent !== null && monthlySum?.avgPercent !== undefined ? (
                              <span
                                className={`px-2 py-0.5 rounded-md font-extrabold ${
                                  isMonthlyMet ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                {monthlySum.avgPercent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* TW1 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200">
                            {ind.tw1.percent !== null ? (
                              <span
                                className={`font-extrabold ${
                                  ind.tw1.isMet ? 'text-teal-700' : 'text-rose-600 font-black'
                                }`}
                              >
                                {ind.tw1.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* TW2 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200">
                            {ind.tw2.percent !== null ? (
                              <span
                                className={`font-extrabold ${
                                  ind.tw2.isMet ? 'text-teal-700' : 'text-rose-600 font-black'
                                }`}
                              >
                                {ind.tw2.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* TW3 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200">
                            {ind.tw3.percent !== null ? (
                              <span
                                className={`font-extrabold ${
                                  ind.tw3.isMet ? 'text-teal-700' : 'text-rose-600 font-black'
                                }`}
                              >
                                {ind.tw3.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* TW4 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200">
                            {ind.tw4.percent !== null ? (
                              <span
                                className={`font-extrabold ${
                                  ind.tw4.isMet ? 'text-teal-700' : 'text-rose-600 font-black'
                                }`}
                              >
                                {ind.tw4.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Semester 1 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 bg-cyan-50/40">
                            {ind.s1.percent !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                  ind.s1.isMet ? 'bg-cyan-700 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                {ind.s1.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Semester 2 */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 bg-emerald-50/40">
                            {ind.s2.percent !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                  ind.s2.isMet ? 'bg-emerald-700 text-white' : 'bg-rose-600 text-white'
                                }`}
                              >
                                {ind.s2.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Tahunan */}
                          <td className="py-3 px-3 text-center border-r border-slate-200 bg-indigo-50/60 font-black text-xs text-indigo-950">
                            {ind.annual.percent !== null ? (
                              <span
                                className={`px-2.5 py-1 rounded-md shadow-xs ${
                                  isAnnualMet ? 'bg-indigo-700 text-white' : 'bg-amber-600 text-white'
                                }`}
                              >
                                {ind.annual.percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Status Mutu */}
                          <td className="py-3 px-3 text-center font-sans text-[11px] font-bold">
                            {isAnnualMet === true ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Tercapai</span>
                              </span>
                            ) : isAnnualMet === false ? (
                              <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-1 rounded-full border border-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Peringatan</span>
                              </span>
                            ) : isMonthlyMet === true ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Bulan OK
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Belum Lengkap</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MATRIKS REKAPITULASI 12 BULAN LENGKAP */}
        {viewTableMode === 'monthlyMatrix' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 font-sans">
                  <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">NO</th>
                  <th className="py-2.5 px-3 min-w-[220px] border-r border-slate-300">INDIKATOR MUTU</th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-300 bg-slate-200/60">TARGET</th>
                  {MONTH_NAMES.map((m, idx) => (
                    <th
                      key={m}
                      className={`py-2 px-1 text-center w-14 border-r border-slate-300 font-mono text-[11px] ${
                        idx + 1 === record.month ? 'bg-emerald-100 text-emerald-950 font-black' : ''
                      }`}
                    >
                      {m.substring(0, 3).toUpperCase()}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center w-32 bg-teal-100 text-teal-950 font-black border-r border-slate-300">
                    RATA TAHUN
                  </th>
                  <th className="py-2.5 px-2 text-center w-28 bg-slate-100 font-bold">
                    STATUS AKHIR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {displayedIndicators.map((ind) => (
                  <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                      {ind.id}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans font-semibold text-slate-900">
                      {ind.title}
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      {ind.targetLabel}
                    </td>
                    {ind.monthlyPercents.map((pct, idx) => {
                      const isCurrentMonth = idx + 1 === record.month;
                      const metMonth = pct !== null ? isTargetMet(pct, ind.targetOperator, ind.targetValue) : null;

                      return (
                        <td
                          key={idx}
                          className={`py-2 px-1 text-right border-r border-slate-200 pr-2 ${
                            isCurrentMonth ? 'font-bold bg-emerald-50/60' : ''
                          } ${
                            metMonth === false
                              ? 'text-rose-600 bg-rose-50/40'
                              : metMonth === true
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {pct !== null ? `${pct.toFixed(1)}%` : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center border-r border-slate-200 bg-teal-50/70 font-bold text-xs text-teal-950 font-mono">
                      {ind.annual.percent !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold ${
                            ind.annual.isMet ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white'
                          }`}
                        >
                          {ind.annual.percent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-sans text-[11px] font-bold">
                      {ind.annual.isMet === true ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          TERCAPAI
                        </span>
                      ) : ind.annual.isMet === false ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          PERINGATAN
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">BELUM LENGKAP</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: RINCIAN NILAI N & D */}
        {viewTableMode === 'ndDetails' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300 font-sans">
                  <th className="py-3 px-2 w-10 text-center border-r border-slate-300">NO.</th>
                  <th className="py-3 px-4 min-w-[260px] border-r border-slate-300">INDIKATOR MUTU</th>
                  <th className="py-3 px-3 w-28 text-center border-r border-slate-300">STANDAR</th>
                  <th className="py-3 px-2 w-28 text-center border-r border-slate-300">RATA (N) BLN</th>
                  <th className="py-3 px-2 w-28 text-center border-r border-slate-300">RATA (D) BLN</th>
                  <th className="py-3 px-2 w-28 text-center border-r border-slate-300 bg-emerald-50">RATA (N) THN</th>
                  <th className="py-3 px-2 w-28 text-center border-r border-slate-300 bg-teal-50">RATA (D) THN</th>
                  <th className="py-3 px-3 w-32 text-center bg-indigo-100 text-indigo-950 font-black">
                    PERSENTASE THN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {displayedIndicators.map((ind) => {
                  const monthlySum = summaries.find((s) => s.id === ind.id);

                  return (
                    <tr key={ind.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                        {ind.id}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-medium text-slate-900">
                        {ind.title}
                      </td>
                      <td className="py-3 px-3 text-center border-r border-slate-200 font-bold text-slate-800 bg-slate-50">
                        {ind.targetLabel}
                      </td>
                      <td className="py-3 px-2 text-right pr-4 border-r border-slate-200">
                        {ind.type === 'PERCENT_ONLY' ? '-' : monthlySum?.avgNumerator !== null && monthlySum?.avgNumerator !== undefined ? formatNumber(monthlySum.avgNumerator, 2) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right pr-4 border-r border-slate-200">
                        {ind.type === 'PERCENT_ONLY' ? '-' : monthlySum?.avgDenominator !== null && monthlySum?.avgDenominator !== undefined ? formatNumber(monthlySum.avgDenominator, 2) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right pr-4 border-r border-slate-200 bg-emerald-50/40">
                        {ind.type === 'PERCENT_ONLY' ? '-' : ind.annual.numerator !== null ? formatNumber(ind.annual.numerator, 2) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right pr-4 border-r border-slate-200 bg-teal-50/40">
                        {ind.type === 'PERCENT_ONLY' ? '-' : ind.annual.denominator !== null ? formatNumber(ind.annual.denominator, 2) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center bg-indigo-50/70 font-extrabold text-indigo-950">
                        {ind.annual.percent !== null ? `${ind.annual.percent.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optional Accordion: Tampilkan Rincian Per Unit Pelayanan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <TableProperties className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Lampiran Rincian Data Per Unit Pelayanan (IRNA, RAJAL, LAB, RAD, GIZI, IGD, BDRS, OK, FARM)
              </h4>
              <p className="text-[11px] text-slate-500">
                Data dukung per unit pelayanan untuk periode {monthName} {record.year}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUnitBreakdown(!showUnitBreakdown)}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            {showUnitBreakdown ? 'Sembunyikan Rincian Unit' : 'Tampilkan Rincian Unit'}
          </button>
        </div>

        {showUnitBreakdown && (
          <div className="mt-4 pt-4 border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 font-sans">
                  <th className="py-2 px-2 text-center w-8 border-r border-slate-300">NO</th>
                  <th className="py-2 px-3 min-w-[200px] border-r border-slate-300">INDIKATOR</th>
                  {UNITS.map((u) => (
                    <th key={u.code} className="py-2 px-2 text-center w-20 border-r border-slate-300">
                      {u.code}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center w-24 bg-emerald-100 text-emerald-950">RATA-RATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {summaries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 text-center font-sans font-bold text-slate-700 border-r border-slate-200">
                      {s.id}
                    </td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800 border-r border-slate-200">
                      {s.title}
                    </td>
                    {UNITS.map((u) => {
                      const uVal = s.unitValues[u.code];
                      return (
                        <td key={u.code} className="py-2 px-2 text-center border-r border-slate-200">
                          {uVal?.percent !== null && uVal?.percent !== undefined ? (
                            <span className={uVal.isMet ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                              {uVal.percent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-bold bg-emerald-50 text-emerald-950 font-mono">
                      {s.avgPercent !== null ? `${s.avgPercent.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};