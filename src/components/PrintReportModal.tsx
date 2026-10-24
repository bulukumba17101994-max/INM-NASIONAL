import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Layers,
  Award,
  Check,
  AlertTriangle,
  Calendar,
  LineChart as LineChartIcon,
  Filter
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, SHORT_MONTH_NAMES } from '../data/inmConfig';
import { HospitalConfig, IndicatorDefinition, MonthlyRecord } from '../types/inm';
import {
  computeComprehensiveSummaries,
  computeMonthlySummaries,
  formatNumber,
  isTargetMet,
} from '../utils/calculations';

export type PrintPeriodScope = 'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MonthlyRecord;
  hospital: HospitalConfig;
  yearRecords?: Record<number, MonthlyRecord>;
  indicators?: IndicatorDefinition[];
  initialChartModel?: 'bar' | 'line';
  initialPeriodScope?: PrintPeriodScope;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  record,
  hospital,
  yearRecords,
  indicators = INDICATORS,
  initialChartModel = 'line',
  initialPeriodScope = 'tw1',
}) => {
  // Period scope selection: 'tw1', 'tw2', 'tw3', 'tw4', 's1', 's2', 'annual', 'monthly', 'all'
  const [periodScope, setPeriodScope] = useState<PrintPeriodScope>(initialPeriodScope);

  // Chart selection state: 'bar' (Batang), 'line' (Garis Tren), or 'both' (Kedua Model)
  const [chartModel, setChartModel] = useState<'bar' | 'line' | 'both'>(initialChartModel);

  // Content toggle checkboxes
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      if (initialChartModel) setChartModel(initialChartModel);
      if (initialPeriodScope) setPeriodScope(initialPeriodScope);
    }
  }, [isOpen, initialChartModel, initialPeriodScope]);

  if (!isOpen) return null;

  const summaries = computeMonthlySummaries(record, indicators);
  const comprehensive = computeComprehensiveSummaries(
    record.year,
    yearRecords || { [record.month]: record },
    indicators
  );
  const monthName = MONTH_NAMES[record.month - 1];

  const handlePrint = () => {
    window.print();
  };

  // Dimensions for high-resolution per-indicator print charts
  const svgWidth = 860;
  const svgHeight = 205;
  const paddingLeft = 54;
  const paddingRight = 30;
  const paddingTop = 24;
  const paddingBottom = 38;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const yMax = 100;

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(yMax, val));
    return paddingTop + chartHeight - (clamped / yMax) * chartHeight;
  };

  // Get metadata for current period scope
  const getPeriodMeta = () => {
    switch (periodScope) {
      case 'tw1':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: TRIWULAN I (JANUARI - MARET) TAHUN ${record.year}`,
          months: [1, 2, 3],
          monthIndices: [0, 1, 2],
          label: 'Triwulan I',
          shortLabel: 'TW 1',
          rate: comprehensive.overallTwComplianceRates.tw1,
          getValue: (ind: any) => ind.tw1.percent,
          getIsMet: (ind: any) => ind.tw1.isMet,
        };
      case 'tw2':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: TRIWULAN II (APRIL - JUNI) TAHUN ${record.year}`,
          months: [4, 5, 6],
          monthIndices: [3, 4, 5],
          label: 'Triwulan II',
          shortLabel: 'TW 2',
          rate: comprehensive.overallTwComplianceRates.tw2,
          getValue: (ind: any) => ind.tw2.percent,
          getIsMet: (ind: any) => ind.tw2.isMet,
        };
      case 'tw3':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: TRIWULAN III (JULI - SEPTEMBER) TAHUN ${record.year}`,
          months: [7, 8, 9],
          monthIndices: [6, 7, 8],
          label: 'Triwulan III',
          shortLabel: 'TW 3',
          rate: comprehensive.overallTwComplianceRates.tw3,
          getValue: (ind: any) => ind.tw3.percent,
          getIsMet: (ind: any) => ind.tw3.isMet,
        };
      case 'tw4':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: TRIWULAN IV (OKTOBER - DESEMBER) TAHUN ${record.year}`,
          months: [10, 11, 12],
          monthIndices: [9, 10, 11],
          label: 'Triwulan IV',
          shortLabel: 'TW 4',
          rate: comprehensive.overallTwComplianceRates.tw4,
          getValue: (ind: any) => ind.tw4.percent,
          getIsMet: (ind: any) => ind.tw4.isMet,
        };
      case 's1':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: SEMESTER I (JANUARI - JUNI) TAHUN ${record.year}`,
          months: [1, 2, 3, 4, 5, 6],
          monthIndices: [0, 1, 2, 3, 4, 5],
          label: 'Semester I',
          shortLabel: 'SM 1',
          rate: comprehensive.overallSemesterComplianceRates.s1,
          getValue: (ind: any) => ind.s1.percent,
          getIsMet: (ind: any) => ind.s1.isMet,
        };
      case 's2':
        return {
          title: 'LAPORAN CAPAIAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: SEMESTER II (JULI - DESEMBER) TAHUN ${record.year}`,
          months: [7, 8, 9, 10, 11, 12],
          monthIndices: [6, 7, 8, 9, 10, 11],
          label: 'Semester II',
          shortLabel: 'SM 2',
          rate: comprehensive.overallSemesterComplianceRates.s2,
          getValue: (ind: any) => ind.s2.percent,
          getIsMet: (ind: any) => ind.s2.isMet,
        };
      case 'annual':
        return {
          title: 'LAPORAN EVALUASI TAHUNAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: EVALUASI TAHUNAN TAHUN ${record.year} (JANUARI - DESEMBER)`,
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          monthIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          label: 'Tahunan',
          shortLabel: `Tahun ${record.year}`,
          rate: comprehensive.overallAnnualComplianceRate,
          getValue: (ind: any) => ind.annual.percent,
          getIsMet: (ind: any) => ind.annual.isMet,
        };
      case 'monthly':
        return {
          title: 'LAPORAN BULANAN INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: BULAN ${monthName.toUpperCase()} TAHUN ${record.year}`,
          months: [record.month],
          monthIndices: [record.month - 1],
          label: `Bulan ${monthName}`,
          shortLabel: monthName.substring(0, 3),
          rate:
            summaries.filter((s) => s.avgPercent !== null).length > 0
              ? (summaries.filter((s) => s.isMetAverage).length /
                  summaries.filter((s) => s.avgPercent !== null).length) *
                100
              : 0,
          getValue: (ind: any) => {
            const m = summaries.find((s) => s.id === ind.id);
            return m?.avgPercent ?? null;
          },
          getIsMet: (ind: any) => {
            const m = summaries.find((s) => s.id === ind.id);
            return m?.isMetAverage ?? null;
          },
        };
      case 'all':
      default:
        return {
          title: 'LAPORAN REKAPITULASI KOMPREHENSIF INDIKATOR NASIONAL MUTU (INM)',
          subtitle: `PERIODE: BULAN ${monthName.toUpperCase()} & REKAPITULASI TAHUN ${record.year}`,
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          monthIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          label: 'Semua Periode',
          shortLabel: 'Semua',
          rate: comprehensive.overallAnnualComplianceRate,
          getValue: (ind: any) => ind.annual.percent,
          getIsMet: (ind: any) => ind.annual.isMet,
        };
    }
  };

  const currentMeta = getPeriodMeta();

  // Count met / total indicators for active period
  const activeIndicatorsWithData = comprehensive.indicators.filter((ind) => currentMeta.getValue(ind) !== null);
  const activeIndicatorsMet = comprehensive.indicators.filter((ind) => currentMeta.getIsMet(ind) === true);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200 print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Interactive Top Control Bar (Hidden on actual print/PDF) */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-3.5 z-10 print:hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Pengaturan Cetak Laporan Mutu Nasional
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih periode cetak: <strong className="text-slate-800">Per Triwulan, Per Semester, Tahunan,</strong> atau <strong className="text-slate-800">Bulanan</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sekarang (Ctrl + P)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PERIOD SCOPE SELECTOR: TRIWULAN, SEMESTER, TAHUNAN, BULANAN */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>PILIH PERIODE CETAK LAPORAN:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Sedang dipilih: <strong className="text-emerald-700">{currentMeta.label} ({record.year})</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {/* Category Triwulan */}
              <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 px-2 uppercase tracking-wider">Triwulan:</span>
                {(['tw1', 'tw2', 'tw3', 'tw4'] as PrintPeriodScope[]).map((scope, idx) => {
                  const twLabels = ['TW 1 (Jan-Mar)', 'TW 2 (Apr-Jun)', 'TW 3 (Jul-Sep)', 'TW 4 (Okt-Des)'];
                  const isSelected = periodScope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setPeriodScope(scope)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {twLabels[idx]}
                    </button>
                  );
                })}
              </div>

              {/* Category Semester */}
              <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 px-2 uppercase tracking-wider">Semester:</span>
                {(['s1', 's2'] as PrintPeriodScope[]).map((scope, idx) => {
                  const sLabels = ['Semester 1 (Jan-Jun)', 'Semester 2 (Jul-Des)'];
                  const isSelected = periodScope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setPeriodScope(scope)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sLabels[idx]}
                    </button>
                  );
                })}
              </div>

              {/* Category Tahunan */}
              <button
                type="button"
                onClick={() => setPeriodScope('annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                  periodScope === 'annual'
                    ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Tahunan ({record.year})
              </button>

              {/* Category Bulanan */}
              <button
                type="button"
                onClick={() => setPeriodScope('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                  periodScope === 'monthly'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Bulan {monthName}
              </button>

              {/* Category Gabungan Semua */}
              <button
                type="button"
                onClick={() => setPeriodScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                  periodScope === 'all'
                    ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Gabungan Semua
              </button>
            </div>
          </div>

          {/* Model Grafik & Content Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Pilihan Model Grafik */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 px-2 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Format Grafik:</span>
              </span>
              <button
                type="button"
                onClick={() => setChartModel('bar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartModel === 'bar' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Batang</span>
              </button>
              <button
                type="button"
                onClick={() => setChartModel('line')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartModel === 'line' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>Garis Tren</span>
              </button>
              <button
                type="button"
                onClick={() => setChartModel('both')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartModel === 'both' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Kedua Model</span>
              </button>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-3 text-slate-700 font-medium">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Sertakan Grafik</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTable}
                  onChange={(e) => setIncludeTable(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Sertakan Tabel Data</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Sertakan Tanda Tangan</span>
              </label>
            </div>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 sm:p-12 print:p-6 text-slate-900 bg-white" id="printable-area">
          {/* Hospital Official Kop */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center relative">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
              {hospital.name}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-slate-700 uppercase tracking-wide mt-0.5">
              {hospital.subTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {hospital.address} &bull; Kota {hospital.city}
            </p>
            <div className="border-t border-slate-400 mt-2 pt-1 text-[11px] text-slate-500 flex justify-between font-sans">
              <span>Formulir: INM-KEMENKES-REKAP-{periodScope.toUpperCase()}</span>
              <span>Standar Akreditasi Kemenkes RI (Permenkes No. 30 Tahun 2022)</span>
            </div>
          </div>

          {/* Title & Period (Specific to chosen period) */}
          <div className="text-center my-5">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
              {currentMeta.title}
            </h3>
            <p className="text-xs font-bold text-slate-700 mt-1 uppercase">
              {currentMeta.subtitle}
            </p>
          </div>

          {/* Executive Summary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-center text-xs page-break-inside-avoid">
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 block font-semibold uppercase">Periode Evaluasi</span>
              <span className="font-black text-sm text-slate-900">{currentMeta.label}</span>
            </div>
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 block font-semibold uppercase">Indikator Tercapai</span>
              <span className="font-black text-sm text-emerald-800">
                {activeIndicatorsMet.length} / {activeIndicatorsWithData.length} Memenuhi Standar
              </span>
            </div>
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 block font-semibold uppercase">Rata-Rata Kepatuhan Periode</span>
              <span className="font-black text-sm text-teal-800">
                {currentMeta.rate.toFixed(1)}%
              </span>
            </div>
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 block font-semibold uppercase">Status Kelayakan</span>
              <span
                className={`font-black text-sm ${
                  currentMeta.rate >= 80 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {currentMeta.rate >= 80 ? 'SANGAT BAIK' : 'PERLU PENINGKATAN'}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 13 GRAFIK PER INDIKATOR KE BAWAH (SUMBU BAWAH = BULAN, SAMPING = NILAI)   */}
          {/* ========================================================================= */}
          {includeCharts && (
            <div className="my-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wide text-slate-900">
                    GRAFIK CAPAIAN BULANAN PER INDIKATOR ({indicators.length} GRAFIK): {currentMeta.label.toUpperCase()}
                  </h4>
                  <p className="text-[10px] text-slate-600 font-sans">
                    Sumbu bawah menampilkan Bulan pelaporan, sumbu samping menampilkan Nilai (%), dan Garis Merah Utuh menunjukkan Target Standar.
                  </p>
                </div>
                <div className="text-[10px] text-slate-700 flex items-center gap-3 font-sans">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-emerald-700 rounded-xs inline-block"></span>
                    Memenuhi
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-rose-600 rounded-xs inline-block"></span>
                    Belum Memenuhi
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-red-600 inline-block"></span>
                    <span className="font-bold text-red-700">Target Standar</span>
                  </span>
                </div>
              </div>

              {(() => {
                // For single-month print scope, still display 12 months Jan-Des on X-axis with active month highlighted
                const chartMonthIndices =
                  periodScope === 'monthly'
                    ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                    : currentMeta.monthIndices;

                return indicators.map((ind, indIdx) => {
                  const comp = comprehensive.indicators.find((s) => s.id === ind.id);
                  const mSum = summaries.find((s) => s.id === ind.id);

                  const monthSeries = chartMonthIndices.map((mIdx) => {
                    let val = comp?.monthlyPercents?.[mIdx] ?? null;
                    if (val === null && mIdx === record.month - 1 && mSum?.avgPercent !== undefined) {
                      val = mSum.avgPercent;
                    }
                    const met = val !== null ? isTargetMet(val, ind.targetOperator, ind.targetValue) : null;
                    return {
                      mIdx,
                      label: chartMonthIndices.length <= 6 ? MONTH_NAMES[mIdx] : SHORT_MONTH_NAMES[mIdx],
                      val,
                      met,
                    };
                  });

                  const periodVal = comp ? currentMeta.getValue(comp) : null;
                  const periodMet = comp ? currentMeta.getIsMet(comp) : null;
                  const targetY = getY(ind.targetValue);
                  const slotCount = monthSeries.length;
                  const slotWidth = chartWidth / slotCount;
                  const getCenterX = (i: number) => paddingLeft + i * slotWidth + slotWidth / 2;

                  const validLinePts = monthSeries
                    .map((m, i) => (m.val !== null ? { x: getCenterX(i), y: getY(m.val), m } : null))
                    .filter(Boolean) as { x: number; y: number; m: (typeof monthSeries)[number] }[];

                  const linePathD = validLinePts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <div
                      key={ind.id}
                      className="border border-slate-300 rounded-xl p-3 bg-white break-inside-avoid page-break-inside-avoid"
                    >
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-200 font-sans">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900">
                            {indIdx + 1}. [{ind.code}] {ind.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] shrink-0 font-mono">
                          <span className="text-red-700 font-bold">Standar: {ind.targetLabel}</span>
                          <span className="text-slate-700 font-bold">
                            Rata {currentMeta.shortLabel}: {periodVal !== null ? `${periodVal.toFixed(1)}%` : '-'}
                          </span>
                          {periodMet !== null && (
                            <span className={periodMet ? 'text-emerald-800 font-bold' : 'text-rose-700 font-bold'}>
                              ({periodMet ? 'TERCAPAI' : 'BELUM'})
                            </span>
                          )}
                        </div>
                      </div>

                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-sans">
                        <text
                          x={13}
                          y={paddingTop + chartHeight / 2}
                          transform={`rotate(-90, 13, ${paddingTop + chartHeight / 2})`}
                          textAnchor="middle"
                          className="text-[8.5px] font-bold fill-slate-500"
                        >
                          NILAI (%)
                        </text>

                        {[0, 20, 40, 60, 80, 100].map((lvl) => {
                          const y = getY(lvl);
                          return (
                            <g key={lvl}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke={lvl === 0 ? '#94a3b8' : '#cbd5e1'}
                                strokeDasharray={lvl === 0 || lvl === 100 ? undefined : '2 2'}
                              />
                              <text
                                x={paddingLeft - 6}
                                y={y + 3}
                                textAnchor="end"
                                className="text-[9px] fill-slate-600 font-mono"
                              >
                                {lvl}%
                              </text>
                            </g>
                          );
                        })}

                        <line
                          x1={paddingLeft}
                          y1={paddingTop}
                          x2={paddingLeft}
                          y2={paddingTop + chartHeight}
                          stroke="#94a3b8"
                        />

                        {/* Bars when chartModel is 'bar' or 'both' */}
                        {(chartModel === 'bar' || chartModel === 'both') &&
                          monthSeries.map((m, i) => {
                            const cx = getCenterX(i);
                            const bw = Math.min(34, Math.max(14, slotWidth * 0.48));
                            if (m.val === null) return null;
                            return (
                              <g key={`bar-${m.mIdx}`}>
                                <rect
                                  x={cx - bw / 2}
                                  y={getY(m.val)}
                                  width={bw}
                                  height={Math.max(2, paddingTop + chartHeight - getY(m.val))}
                                  fill={m.met ? '#047857' : '#e11d48'}
                                  opacity={chartModel === 'both' ? 0.45 : 0.92}
                                  rx={2.5}
                                />
                                {chartModel === 'bar' && (
                                  <text
                                    x={cx}
                                    y={Math.max(12, getY(m.val) - 5)}
                                    textAnchor="middle"
                                    className="text-[8.5px] font-mono fill-slate-800 font-bold"
                                  >
                                    {m.val.toFixed(1)}%
                                  </text>
                                )}
                              </g>
                            );
                          })}

                        {/* Solid Red Target Standar Line */}
                        <line
                          x1={paddingLeft}
                          y1={targetY}
                          x2={svgWidth - paddingRight}
                          y2={targetY}
                          stroke="#dc2626"
                          strokeWidth={2.2}
                        />

                        {/* Line Trend when chartModel is 'line' or 'both' */}
                        {(chartModel === 'line' || chartModel === 'both') && (
                          <>
                            {validLinePts.length > 1 && (
                              <path
                                d={linePathD}
                                fill="none"
                                stroke="#0f766e"
                                strokeWidth={2.3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            {validLinePts.map((p) => (
                              <g key={`pt-${p.m.mIdx}`}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={4}
                                  fill={p.m.met ? '#047857' : '#e11d48'}
                                  stroke="#ffffff"
                                  strokeWidth={1.3}
                                />
                                <text
                                  x={p.x}
                                  y={Math.max(12, p.y - 6)}
                                  textAnchor="middle"
                                  className="text-[8.5px] font-mono fill-slate-900 font-bold"
                                >
                                  {p.m.val!.toFixed(1)}%
                                </text>
                              </g>
                            ))}
                          </>
                        )}

                        {/* Month Labels at Bottom */}
                        {monthSeries.map((m, i) => (
                          <text
                            key={`xlbl-${m.mIdx}`}
                            x={getCenterX(i)}
                            y={paddingTop + chartHeight + 15}
                            textAnchor="middle"
                            className="text-[9.5px] font-sans fill-slate-800 font-bold"
                          >
                            {m.label}
                          </text>
                        ))}

                        <text
                          x={paddingLeft + chartWidth / 2}
                          y={svgHeight - 4}
                          textAnchor="middle"
                          className="text-[8px] font-bold fill-slate-400 uppercase tracking-wider"
                        >
                          BULAN ({record.year})
                        </text>
                      </svg>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TABEL REKAPITULASI SESUAI PERIODE TERPILIH                                 */}
          {/* ========================================================================= */}
          {includeTable && (
            <div className="my-6 page-break-inside-avoid">
              <h4 className="font-black text-xs uppercase tracking-wide text-slate-900 mb-2">
                TABEL REKAPITULASI NILAI CAPAIAN INM: {currentMeta.label.toUpperCase()}
              </h4>

              {/* TABEL 1: FORMAT KHUSUS TRIWULAN (TW 1 - 4) */}
              {(periodScope === 'tw1' || periodScope === 'tw2' || periodScope === 'tw3' || periodScope === 'tw4') && (
                <table className="w-full text-xs border-collapse border border-slate-600 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold font-sans text-[11px]">
                      <th className="border border-slate-600 py-2 px-1 text-center w-8">NO.</th>
                      <th className="border border-slate-600 py-2 px-2 text-left min-w-[200px]">INDIKATOR NASIONAL MUTU</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-20">STANDAR</th>
                      {currentMeta.monthIndices.map((mIdx) => (
                        <th key={mIdx} className="border border-slate-600 py-2 px-1 text-center w-20">
                          {MONTH_NAMES[mIdx].toUpperCase()}
                        </th>
                      ))}
                      <th className="border border-slate-600 py-2 px-1 text-center w-24 bg-slate-300">
                        RATA-RATA {currentMeta.shortLabel}
                      </th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-28">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {comprehensive.indicators.map((ind) => {
                      const twVal = currentMeta.getValue(ind);
                      const isMet = currentMeta.getIsMet(ind);

                      return (
                        <tr key={ind.id} className="border border-slate-600">
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold font-sans">
                            {ind.id}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-2 font-sans font-medium text-slate-900">
                            {ind.title}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold">
                            {ind.targetLabel}
                          </td>
                          {currentMeta.monthIndices.map((mIdx) => {
                            const val = ind.monthlyPercents[mIdx];
                            return (
                              <td key={mIdx} className="border border-slate-600 py-1.5 px-1 text-center">
                                {val !== null ? `${val.toFixed(1)}%` : '-'}
                              </td>
                            );
                          })}
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                            {twVal !== null ? `${twVal.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-sans font-bold text-[10px]">
                            {isMet === true ? (
                              <span className="text-emerald-800">TERCAPAI</span>
                            ) : isMet === false ? (
                              <span className="text-rose-800">BELUM</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TABEL 2: FORMAT KHUSUS SEMESTER (S1 / S2) */}
              {(periodScope === 's1' || periodScope === 's2') && (
                <table className="w-full text-xs border-collapse border border-slate-600 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold font-sans text-[11px]">
                      <th className="border border-slate-600 py-2 px-1 text-center w-8">NO.</th>
                      <th className="border border-slate-600 py-2 px-2 text-left min-w-[190px]">INDIKATOR NASIONAL MUTU</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TARGET</th>
                      {currentMeta.monthIndices.map((mIdx) => (
                        <th key={mIdx} className="border border-slate-600 py-2 px-1 text-center w-14">
                          {MONTH_NAMES[mIdx].substring(0, 3).toUpperCase()}
                        </th>
                      ))}
                      <th className="border border-slate-600 py-2 px-1 text-center w-22 bg-slate-300">
                        RATA {currentMeta.shortLabel}
                      </th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {comprehensive.indicators.map((ind) => {
                      const semVal = currentMeta.getValue(ind);
                      const isMet = currentMeta.getIsMet(ind);

                      return (
                        <tr key={ind.id} className="border border-slate-600">
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold font-sans">
                            {ind.id}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-2 font-sans font-medium text-slate-900">
                            {ind.title}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold">
                            {ind.targetLabel}
                          </td>
                          {currentMeta.monthIndices.map((mIdx) => {
                            const val = ind.monthlyPercents[mIdx];
                            return (
                              <td key={mIdx} className="border border-slate-600 py-1.5 px-1 text-center">
                                {val !== null ? `${val.toFixed(1)}%` : '-'}
                              </td>
                            );
                          })}
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                            {semVal !== null ? `${semVal.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-sans font-bold text-[10px]">
                            {isMet === true ? (
                              <span className="text-emerald-800">TERCAPAI</span>
                            ) : isMet === false ? (
                              <span className="text-rose-800">BELUM</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TABEL 3: FORMAT KHUSUS TAHUNAN */}
              {periodScope === 'annual' && (
                <table className="w-full text-xs border-collapse border border-slate-600 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold font-sans text-[11px]">
                      <th className="border border-slate-600 py-2 px-1 text-center w-8">NO.</th>
                      <th className="border border-slate-600 py-2 px-2 text-left min-w-[200px]">INDIKATOR NASIONAL MUTU</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-18">TARGET</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 1</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 2</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 3</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 4</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-18">SM 1</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-18">SM 2</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-22 bg-slate-300">RATA THN</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {comprehensive.indicators.map((ind) => {
                      const isMetAnnual = ind.annual.isMet;
                      return (
                        <tr key={ind.id} className="border border-slate-600">
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold font-sans">
                            {ind.id}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-2 font-sans font-medium text-slate-900">
                            {ind.title}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold">
                            {ind.targetLabel}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw1.percent !== null ? `${ind.tw1.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw2.percent !== null ? `${ind.tw2.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw3.percent !== null ? `${ind.tw3.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw4.percent !== null ? `${ind.tw4.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.s1.percent !== null ? `${ind.s1.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.s2.percent !== null ? `${ind.s2.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                            {ind.annual.percent !== null ? `${ind.annual.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-sans font-bold text-[10px]">
                            {isMetAnnual === true ? (
                              <span className="text-emerald-800">TERCAPAI</span>
                            ) : isMetAnnual === false ? (
                              <span className="text-rose-800">BELUM</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TABEL 4: FORMAT KHUSUS BULANAN */}
              {periodScope === 'monthly' && (
                <table className="w-full text-xs border-collapse border border-slate-600 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold font-sans text-[11px]">
                      <th className="border border-slate-600 py-2 px-1 text-center w-8">NO.</th>
                      <th className="border border-slate-600 py-2 px-2 text-left min-w-[220px]">INDIKATOR NASIONAL MUTU</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-20">STANDAR</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24">NUMERATOR (N)</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24">DENOMINATOR (D)</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24 bg-slate-300">CAPAIAN (%)</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-28">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {summaries.map((mSum) => (
                      <tr key={mSum.id} className="border border-slate-600">
                        <td className="border border-slate-600 py-1.5 px-1 text-center font-bold font-sans">
                          {mSum.id}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-2 font-sans font-medium text-slate-900">
                          {mSum.title}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-1 text-center font-bold">
                          {mSum.targetLabel}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-1 text-center">
                          {mSum.avgNumerator !== null ? formatNumber(mSum.avgNumerator, 2) : '-'}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-1 text-center">
                          {mSum.avgDenominator !== null ? formatNumber(mSum.avgDenominator, 2) : '-'}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                          {mSum.avgPercent !== null ? `${mSum.avgPercent.toFixed(1)}%` : '-'}
                        </td>
                        <td className="border border-slate-600 py-1.5 px-1 text-center font-sans font-bold text-[10px]">
                          {mSum.isMetAverage === true ? (
                            <span className="text-emerald-800">TERCAPAI</span>
                          ) : mSum.isMetAverage === false ? (
                            <span className="text-rose-800">BELUM</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABEL 5: FORMAT GABUNGAN SEMUA */}
              {periodScope === 'all' && (
                <table className="w-full text-xs border-collapse border border-slate-600 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold font-sans text-[11px]">
                      <th className="border border-slate-600 py-2 px-1 text-center w-8">NO.</th>
                      <th className="border border-slate-600 py-2 px-2 text-left min-w-[200px]">INDIKATOR NASIONAL MUTU</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TARGET</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-20 bg-slate-300">BULAN {monthName.substring(0, 3).toUpperCase()}</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 1</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 2</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 3</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-16">TW 4</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-18">SM 1</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-18">SM 2</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-22 bg-slate-300">TAHUN {record.year}</th>
                      <th className="border border-slate-600 py-2 px-1 text-center w-24">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {comprehensive.indicators.map((ind) => {
                      const mSum = summaries.find((s) => s.id === ind.id);
                      const isMetAnnual = ind.annual.isMet;
                      return (
                        <tr key={ind.id} className="border border-slate-600">
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold font-sans">
                            {ind.id}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-2 font-sans font-medium text-slate-900">
                            {ind.title}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold">
                            {ind.targetLabel}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                            {mSum?.avgPercent !== null && mSum?.avgPercent !== undefined ? `${mSum.avgPercent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw1.percent !== null ? `${ind.tw1.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw2.percent !== null ? `${ind.tw2.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw3.percent !== null ? `${ind.tw3.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.tw4.percent !== null ? `${ind.tw4.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.s1.percent !== null ? `${ind.s1.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center">
                            {ind.s2.percent !== null ? `${ind.s2.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-bold bg-slate-100">
                            {ind.annual.percent !== null ? `${ind.annual.percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className="border border-slate-600 py-1.5 px-1 text-center font-sans font-bold text-[10px]">
                            {isMetAnnual === true ? (
                              <span className="text-emerald-800">TERCAPAI</span>
                            ) : isMetAnnual === false ? (
                              <span className="text-rose-800">BELUM</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Endorsement Signatures */}
          {includeSignatures && (
            <div className="mt-8 pt-4 page-break-inside-avoid">
              <div className="text-right text-xs mb-6 font-sans">
                {hospital.city},{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs font-sans">
                <div>
                  <p className="text-slate-600 mb-20">
                    Mengetahui,<br />
                    <strong>Ketua Komite Mutu &amp; Keselamatan Pasien</strong>
                  </p>
                  <p className="font-bold underline text-slate-900">{hospital.leadQualityName}</p>
                  <p className="text-[11px] text-slate-500">NIP. {hospital.leadQualityNip}</p>
                </div>

                <div>
                  <p className="text-slate-600 mb-20">
                    Menyetujui,<br />
                    <strong>Direktur Rumah Sakit</strong>
                  </p>
                  <p className="font-bold underline text-slate-900">{hospital.directorName}</p>
                  <p className="text-[11px] text-slate-500">NIP. {hospital.directorNip}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};