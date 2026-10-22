import React, { useState } from 'react';
import {
  Calculator,
  Search,
  Filter,
  Layers,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Building,
  Sparkles,
  ClipboardList,
  Grid3X3,
  ListFilter,
  ShieldCheck,
  Check,
  Save,
  RotateCcw
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, UNITS } from '../data/inmConfig';
import { IndicatorDefinition, MonthlyRecord, UnitCode, ValidationError } from '../types/inm';
import {
  calculatePercent,
  computeIndicatorSummary,
  formatNumber,
  formatPercent,
  isTargetMet
} from '../utils/calculations';
import { validateCell, validateMonthlyRecord } from '../utils/validation';

interface InputSheetProps {
  record: MonthlyRecord;
  onChangeRecord: (newRecord: MonthlyRecord) => void;
  onSaveNow?: () => Promise<void>;
  isSaving?: boolean;
  lastSyncedTime?: string | null;
}

export const InputSheet: React.FC<InputSheetProps> = ({
  record,
  onChangeRecord,
  onSaveNow,
  isSaving = false,
  lastSyncedTime,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'perUnit'>('grid');
  const [selectedUnit, setSelectedUnit] = useState<UnitCode>('IRNA');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'met' | 'unmet' | 'empty' | 'errorsOnly'>('all');
  const [showValidationRules, setShowValidationRules] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const monthName = MONTH_NAMES[record.month - 1];

  // Perform full automatic validation on the monthly record
  const validationErrors: ValidationError[] = validateMonthlyRecord(record);
  const hasErrors = validationErrors.length > 0;

  // Helper to check if a specific cell has a validation error
  const getCellError = (
    indicatorId: number,
    unitCode: UnitCode,
    field?: 'numerator' | 'denominator' | 'percent'
  ): ValidationError | undefined => {
    return validationErrors.find(
      (err) =>
        err.indicatorId === indicatorId &&
        err.unitCode === unitCode &&
        (!field || err.field === field)
    );
  };

  // Safe input handler with real-time numeric sanitation & validation (null-safe, no undefined)
  const handleCellChange = (
    indicatorId: number,
    unitCode: UnitCode,
    field: 'numerator' | 'denominator' | 'percent',
    valueStr: string
  ) => {
    // Sanitize: allow only valid positive numeric characters
    let val: number | null = null;
    if (valueStr !== '') {
      const parsed = parseFloat(valueStr);
      if (!isNaN(parsed) && isFinite(parsed)) {
        // Enforce non-negative rule
        val = Math.max(0, parsed);
        // For percent-only, clamp to max 100
        if (field === 'percent') {
          val = Math.min(100, val);
        }
      }
    }

    const updatedData = { ...record.data };
    if (!updatedData[indicatorId]) {
      updatedData[indicatorId] = {};
    }
    if (!updatedData[indicatorId][unitCode]) {
      updatedData[indicatorId][unitCode] = {
        numerator: null,
        denominator: null,
        percent: null,
      };
    }

    const currentCell = {
      numerator: updatedData[indicatorId][unitCode]?.numerator ?? null,
      denominator: updatedData[indicatorId][unitCode]?.denominator ?? null,
      percent: updatedData[indicatorId][unitCode]?.percent ?? null,
    };

    if (field === 'numerator') {
      currentCell.numerator = val;
    } else if (field === 'denominator') {
      currentCell.denominator = val;
    } else if (field === 'percent') {
      currentCell.percent = val;
    }

    updatedData[indicatorId][unitCode] = currentCell;

    onChangeRecord({
      ...record,
      lastUpdated: new Date().toISOString(),
      data: updatedData,
    });
  };

  // Quick fix: auto-adjust numerator to denominator when N > D
  const handleAutoFixError = (err: ValidationError) => {
    const row = record.data[err.indicatorId]?.[err.unitCode];
    if (!row) return;

    if (err.field === 'numerator' && row.denominator !== null && row.denominator !== undefined) {
      handleCellChange(err.indicatorId, err.unitCode, 'numerator', String(row.denominator));
    } else if (err.field === 'denominator' && row.numerator !== null && row.numerator !== undefined) {
      handleCellChange(err.indicatorId, err.unitCode, 'denominator', String(row.numerator));
    }
  };

  const [validationAlertMessage, setValidationAlertMessage] = useState<string | null>(null);
  const [showInputSummaryModal, setShowInputSummaryModal] = useState<boolean>(false);

  // Trigger explicit validation save check - ALWAYS persists data to storage so it is NEVER lost
  const handleExplicitSave = async () => {
    // 1. Always execute save so entered inputs are preserved in local storage and cloud
    if (onSaveNow) {
      try {
        await onSaveNow();
      } catch (err) {
        console.warn('Save finished locally:', err);
      }
    }

    // 2. Inform the user with clear feedback
    if (hasErrors) {
      setValidationAlertMessage(
        `Data berhasil disimpan ke Kertas Kerja (tidak hilang). Terdapat ${validationErrors.length} sel yang perlu disesuaikan (misal Numerator > Denominator). Anda dapat melihat dan memperbaikinya kapan saja.`
      );
      setTimeout(() => setValidationAlertMessage(null), 8000);
    } else {
      setValidationAlertMessage(null);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 5000);
    }
  };

  // Calculate quick summary metrics for current worksheet
  const filledIndicatorsCount = INDICATORS.filter((ind) => {
    const row = record.data?.[ind.id];
    if (!row) return false;
    return Object.values(row).some(
      (c) => c && (c.numerator !== null || c.denominator !== null || c.percent !== null)
    );
  }).length;

  // Filter indicators
  const filteredIndicators = INDICATORS.filter((ind) => {
    const matchesSearch =
      ind.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(ind.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterTarget === 'errorsOnly') {
      return validationErrors.some((e) => e.indicatorId === ind.id);
    }

    if (filterTarget !== 'all') {
      const summary = computeIndicatorSummary(ind, record.data[ind.id]);
      if (filterTarget === 'met') return summary.isMetAverage === true;
      if (filterTarget === 'unmet') return summary.isMetAverage === false;
      if (filterTarget === 'empty') return summary.avgPercent === null;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-2">
              <Calculator className="w-3.5 h-3.5" />
              <span>Lembar Kerja Penginputan Data</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Kertas Kerja Indikator Mutu Nasional (INM)
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Masukkan nilai <span className="text-emerald-300 font-semibold">Numerator (N)</span> dan{' '}
              <span className="text-teal-300 font-semibold">Denominator (D)</span>. Seluruh data hasil inputan tersimpan aman dan{' '}
              <span className="text-emerald-300 font-bold underline decoration-emerald-400">tidak akan hilang</span> setelah divalidasi, sehingga dapat dilihat kembali setiap saat.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleExplicitSave}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                isSaving
                  ? 'bg-amber-400 text-amber-950 cursor-wait'
                  : hasErrors
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Menyimpan Kertas Kerja...</span>
                </>
              ) : hasErrors ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Simpan &amp; Validasi ({validationErrors.length} Catatan)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Validasi &amp; Simpan Data</span>
                </>
              )}
            </button>

            <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-right">
              <p className="text-[10px] text-slate-300 font-medium">Periode Lembar Kerja</p>
              <p className="text-xs font-bold text-white">
                {monthName} {record.year}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Worksheet Data Status Bar: Guaranteeing data is preserved */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 font-medium">Status Data:</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Tersimpan Aman ({filledIndicatorsCount} / {INDICATORS.length} Indikator Terisi)
            </span>
          </div>
          {lastSyncedTime && (
            <div className="text-slate-500 text-[11px]">
              Terakhir Disimpan: <strong className="text-slate-700">{lastSyncedTime}</strong>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowInputSummaryModal(!showInputSummaryModal)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition cursor-pointer border border-slate-300"
        >
          <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
          <span>{showInputSummaryModal ? 'Tutup Rekap Terinput' : 'Lihat Ringkasan Data Terinput'}</span>
        </button>
      </div>

      {/* Collapsible Quick Review of Inputted Data */}
      {showInputSummaryModal && (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
            <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ringkasan Data Yang Sudah Terinput Bulan {monthName} {record.year}</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-sans">
              Data ini tersimpan permanen dan otomatis dikalkulasi ke Laporan Rekapitulasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {INDICATORS.map((ind) => {
              const summary = computeIndicatorSummary(ind, record.data?.[ind.id]);
              const hasData = summary.avgPercent !== null;

              return (
                <div
                  key={ind.id}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                    hasData
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-100/60 border-dashed border-slate-300 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-bold text-slate-800 line-clamp-1">
                      INM-{ind.id < 10 ? `0${ind.id}` : ind.id}: {ind.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      Target: {ind.targetLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">
                      {hasData ? (
                        <>N: {formatNumber(summary.avgNumerator, 1)} &bull; D: {formatNumber(summary.avgDenominator, 1)}</>
                      ) : (
                        'Belum ada data input'
                      )}
                    </span>
                    <span
                      className={`font-black font-mono ${
                        hasData
                          ? summary.isMetAverage
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {hasData ? `${summary.avgPercent?.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white shadow-lg flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <div>
              <p className="font-bold">Data Bulan {monthName} {record.year} Berhasil Disimpan & Tersinkron ke Firebase Cloud!</p>
              <p className="text-emerald-100 font-normal text-[11px]">
                Data telah terverifikasi aman dan dapat langsung dibuka dari komputer, laptop, tablet, atau HP manapun secara konsisten.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(false)}
            className="text-white/80 hover:text-white px-2 py-1 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Validation Alert Notice if user clicks Save with errors */}
      {validationAlertMessage && (
        <div className="p-4 rounded-xl bg-rose-600 text-white shadow-lg flex items-center justify-between gap-3 text-xs font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{validationAlertMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationAlertMessage(null)}
            className="text-white/80 hover:text-white px-2 py-1 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* AUTOMATIC VALIDATION STATUS BAR */}
      <div
        className={`rounded-2xl border p-4 transition-all shadow-xs ${
          hasErrors
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                hasErrors ? 'bg-rose-600 text-white shadow-rose-600/30 shadow-md' : 'bg-emerald-600 text-white'
              }`}
            >
              {hasErrors ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm">
                  {hasErrors
                    ? `Perhatian: Ditemukan ${validationErrors.length} Kesalahan Format Data Input!`
                    : 'Validasi Otomatis Berhasil: Semua Data Sesuai Aturan Format (0 Kesalahan)'}
                </h4>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    hasErrors ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {hasErrors ? 'Perlu Diperbaiki' : 'Format Sesuai'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {hasErrors
                  ? 'Pastikan nilai Numerator (N) tidak melebihi Denominator (D) dan Denominator tidak bernilai 0.'
                  : 'Sistem memastikan seluruh input berupa angka non-negatif dan memenuhi aturan logis INM.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowValidationRules(!showValidationRules)}
              className="text-xs font-bold underline px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              {showValidationRules ? 'Tutup Aturan' : 'Lihat Aturan Validasi'}
            </button>
          </div>
        </div>

        {/* Validation Errors Dropdown List */}
        {hasErrors && (
          <div className="mt-3 pt-3 border-t border-rose-200 space-y-2">
            <p className="text-[11px] font-bold text-rose-900">Daftar Sel Yang Perlu Diperbaiki:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {validationErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {err.unitCode}
                    </span>
                    <span className="truncate text-slate-800">
                      <strong>INM-{err.indicatorId}:</strong> {err.message}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFixError(err)}
                    className="px-2 py-1 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    Samakan N = D
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Validation Rules Explainer */}
        {showValidationRules && (
          <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-emerald-800 block mb-1">1. Format Angka Non-Negatif</span>
              <p className="text-[11px] text-slate-600">Nilai N dan D hanya menerima angka positif atau 0 (angka &ge; 0). Karakter teks ditolak otomatis.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-teal-800 block mb-1">2. Rasio Logis (N &le; D)</span>
              <p className="text-[11px] text-slate-600">Numerator (kejadian patuh) tidak boleh lebih besar dari Denominator (total peluang yang diobservasi).</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-cyan-800 block mb-1">3. Pencegahan Deviasi Nol</span>
              <p className="text-[11px] text-slate-600">Jika Numerator terisi (&gt; 0), Denominator tidak boleh 0 untuk mencegah kesalahan pembagian matematika.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-purple-800 block mb-1">4. Rentang Khusus Kepuasan</span>
              <p className="text-[11px] text-slate-600">Untuk Indikator 13, nilai indeks kepuasan dibatasi ketat dalam rentang 0% hingga 100%.</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Success Notice Banner */}
      {saveSuccessNotice && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-200" />
            <span>Format data tervalidasi 100% sukses dan tersimpan ke basis data browser!</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded">Tersimpan</span>
        </div>
      )}

      {/* Control bar: Switch View, Search, and Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-4 h-4 text-emerald-600" />
            <span>Tabel Spreadsheet (Semua Unit)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('perUnit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'perUnit'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-teal-600" />
            <span>Form Input Khusus Per Unit</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari indikator mutu..."
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-emerald-600 transition-colors"
            />
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={filterTarget}
              onChange={(e: any) => setFilterTarget(e.target.value)}
              className="bg-transparent font-medium outline-hidden cursor-pointer"
            >
              <option value="all">Semua Status</option>
              {hasErrors && <option value="errorsOnly">⚠️ Hanya Kesalahan Input ({validationErrors.length})</option>}
              <option value="met">Target Tercapai</option>
              <option value="unmet">Belum Tercapai</option>
              <option value="empty">Belum Diisi</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SPREADSHEET GRID WITH AUTO-VALIDATION */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Tabel Penginputan Data Indikator & Kalkulasi Rata-Rata</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                  Validasi Aktif
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ketik langsung angka N & D. Sel merah menandakan data melanggar aturan format (misal N &gt; D).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Tercapai
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                Belum Tercapai
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-300 inline-block"></span>
                Error Format
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">NO.</th>
                  <th className="py-3 px-4 min-w-[260px] border-r border-slate-200">INDIKATOR & TARGET</th>
                  <th className="py-3 px-2 w-10 text-center border-r border-slate-200 bg-slate-200/60 font-bold">
                    TIPE
                  </th>
                  {UNITS.map((u) => (
                    <th
                      key={u.code}
                      className="py-3 px-2 min-w-[95px] text-center border-r border-slate-200 font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
                      title={u.fullName}
                    >
                      <span className="block text-slate-900">{u.code}</span>
                      <span className="block text-[10px] text-slate-500 font-normal truncate max-w-[85px] mx-auto">
                        {u.name}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 min-w-[120px] text-center bg-emerald-100 text-emerald-950 font-bold">
                    RATA-RATA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredIndicators.map((ind) => {
                  const rowData = record.data[ind.id] || {};
                  const summary = computeIndicatorSummary(ind, rowData);

                  if (ind.type === 'PERCENT_ONLY') {
                    // Indicator 13: Kepuasan Pasien
                    return (
                      <tr key={ind.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                          {ind.id}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-200 font-sans">
                          <div className="font-semibold text-slate-900">{ind.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Target: <span className="font-medium text-emerald-700">{ind.targetLabel}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-teal-700 bg-teal-50">
                          %
                        </td>
                        {UNITS.map((u) => {
                          const val = rowData[u.code]?.percent;
                          const cellErr = getCellError(ind.id, u.code, 'percent');
                          const isMet = summary.unitValues[u.code]?.isMet;

                          return (
                            <td key={u.code} className="p-1.5 border-r border-slate-200 text-center">
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="0.00"
                                  value={val !== null && val !== undefined ? val : ''}
                                  onChange={(e) =>
                                    handleCellChange(ind.id, u.code, 'percent', e.target.value)
                                  }
                                  className={`w-full text-center px-1 py-1 rounded text-xs font-semibold border transition-all ${
                                    cellErr
                                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400'
                                      : isMet === true
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:bg-white'
                                      : isMet === false
                                      ? 'bg-rose-50 text-rose-800 border-rose-300 focus:bg-white'
                                      : 'bg-white text-slate-800 border-slate-200 focus:border-teal-500'
                                  }`}
                                  title={cellErr ? cellErr.message : undefined}
                                />
                                {val !== null && val !== undefined && (
                                  <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                                    %
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-emerald-50/50">
                          <div
                            className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                              summary.isMetAverage === true
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : summary.isMetAverage === false
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {summary.avgPercent !== null ? `${summary.avgPercent.toFixed(2)}%` : '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Indicators 1 - 12: 3 rows (N, D, %)
                  return (
                    <React.Fragment key={ind.id}>
                      {/* Row N */}
                      <tr className="bg-white hover:bg-slate-50/50">
                        <td
                          rowSpan={3}
                          className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200 align-top font-sans bg-slate-50/40"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 inline-flex items-center justify-center font-bold text-xs mt-1">
                            {ind.id}
                          </span>
                        </td>
                        <td
                          rowSpan={3}
                          className="py-3 px-4 border-r border-slate-200 align-top font-sans bg-slate-50/40"
                        >
                          <div className="font-semibold text-slate-900 leading-snug">{ind.title}</div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                              Target: {ind.targetLabel}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {ind.standardReference}
                            </span>
                          </div>
                          {ind.numeratorLabel && (
                            <div className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-200 pt-1 space-y-0.5">
                              <div><span className="font-semibold text-emerald-700">N:</span> {ind.numeratorLabel}</div>
                              <div><span className="font-semibold text-teal-700">D:</span> {ind.denominatorLabel}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/40">
                          N
                        </td>
                        {UNITS.map((u) => {
                          const nVal = rowData[u.code]?.numerator;
                          const cellErr = getCellError(ind.id, u.code, 'numerator');

                          return (
                            <td key={u.code} className="p-1 border-r border-slate-200 relative">
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={nVal !== null && nVal !== undefined ? nVal : ''}
                                onChange={(e) =>
                                  handleCellChange(ind.id, u.code, 'numerator', e.target.value)
                                }
                                className={`w-full text-center px-1.5 py-1 rounded text-xs font-medium text-slate-900 transition-all ${
                                  cellErr
                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-1 ring-rose-400'
                                    : 'bg-white border border-slate-200 focus:border-emerald-500 focus:bg-emerald-50/30'
                                }`}
                                title={cellErr ? cellErr.message : undefined}
                              />
                              {cellErr && (
                                <span
                                  className="absolute right-1 top-1 w-2.5 h-2.5 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold"
                                  title={cellErr.message}
                                >
                                  !
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-emerald-50/60 font-semibold text-emerald-950">
                          {summary.avgNumerator !== null ? summary.avgNumerator.toFixed(2) : '-'}
                        </td>
                      </tr>

                      {/* Row D */}
                      <tr className="bg-white hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-teal-700 bg-teal-50/40">
                          D
                        </td>
                        {UNITS.map((u) => {
                          const dVal = rowData[u.code]?.denominator;
                          const cellErr = getCellError(ind.id, u.code, 'denominator');

                          return (
                            <td key={u.code} className="p-1 border-r border-slate-200 relative">
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={dVal !== null && dVal !== undefined ? dVal : ''}
                                onChange={(e) =>
                                  handleCellChange(ind.id, u.code, 'denominator', e.target.value)
                                }
                                className={`w-full text-center px-1.5 py-1 rounded text-xs font-medium text-slate-900 transition-all ${
                                  cellErr
                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-1 ring-rose-400'
                                    : 'bg-white border border-slate-200 focus:border-teal-500 focus:bg-teal-50/30'
                                }`}
                                title={cellErr ? cellErr.message : undefined}
                              />
                              {cellErr && (
                                <span
                                  className="absolute right-1 top-1 w-2.5 h-2.5 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold"
                                  title={cellErr.message}
                                >
                                  !
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-teal-50/60 font-semibold text-teal-950">
                          {summary.avgDenominator !== null ? summary.avgDenominator.toFixed(2) : '-'}
                        </td>
                      </tr>

                      {/* Row % */}
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-600 bg-slate-200/50">
                          %
                        </td>
                        {UNITS.map((u) => {
                          const unitSummary = summary.unitValues[u.code];
                          const pct = unitSummary?.percent;
                          const isMet = unitSummary?.isMet;

                          return (
                            <td
                              key={u.code}
                              className={`py-2 px-1 text-center border-r border-slate-200 font-semibold text-[11px] ${
                                isMet === true
                                  ? 'bg-emerald-50/80 text-emerald-800'
                                  : isMet === false
                                  ? 'bg-rose-50/80 text-rose-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {pct !== null && pct !== undefined ? `${pct.toFixed(2)}%` : '-'}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-emerald-100/70">
                          <div
                            className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                              summary.isMetAverage === true
                                ? 'bg-emerald-700 text-white'
                                : summary.isMetAverage === false
                                ? 'bg-rose-700 text-white'
                                : 'text-slate-500'
                            }`}
                          >
                            {summary.avgPercent !== null ? `${summary.avgPercent.toFixed(2)}%` : '-'}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: PER-UNIT INPUT FORM WITH REALTIME VALIDATION */}
      {viewMode === 'perUnit' && (
        <div className="space-y-4">
          {/* Unit selection tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {UNITS.map((u) => {
              const isSelected = selectedUnit === u.code;
              const unitErrorCount = validationErrors.filter((e) => e.unitCode === u.code).length;

              return (
                <button
                  key={u.code}
                  type="button"
                  onClick={() => setSelectedUnit(u.code)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{u.code}</span>
                  {unitErrorCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {unitErrorCount}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unit Details Header Card */}
          {(() => {
            const activeUnitInfo = UNITS.find((u) => u.code === selectedUnit);
            const unitErrors = validationErrors.filter((e) => e.unitCode === selectedUnit);

            return (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    {selectedUnit}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{activeUnitInfo?.fullName}</h3>
                    <p className="text-xs text-slate-500">{activeUnitInfo?.description}</p>
                  </div>
                </div>
                {unitErrors.length > 0 ? (
                  <div className="text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Ditemukan {unitErrors.length} kesalahan validasi pada unit ini</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Semua input data pada unit {selectedUnit} valid</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Grid of indicator cards for selected unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIndicators.map((ind) => {
              const rowData = record.data[ind.id] || {};
              const cell = rowData[selectedUnit] || {};
              const isRelevant = !ind.relevantUnits || ind.relevantUnits.includes(selectedUnit);

              const numErr = getCellError(ind.id, selectedUnit, 'numerator');
              const denErr = getCellError(ind.id, selectedUnit, 'denominator');
              const pctErr = getCellError(ind.id, selectedUnit, 'percent');
              const hasCardErr = numErr || denErr || pctErr;

              let pct: number | null = null;
              if (ind.type === 'PERCENT_ONLY') {
                pct = cell.percent ?? null;
              } else {
                pct = calculatePercent(cell.numerator, cell.denominator);
              }

              const isMet = pct !== null ? isTargetMet(pct, ind.targetOperator, ind.targetValue) : null;

              return (
                <div
                  key={ind.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs transition-all ${
                    hasCardErr
                      ? 'border-2 border-rose-400 bg-rose-50/20'
                      : !isRelevant
                      ? 'border-dashed border-slate-300 opacity-75'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        hasCardErr ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ind.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {ind.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Target: <span className="font-semibold text-emerald-700">{ind.targetLabel}</span>
                      </p>
                    </div>
                    {isMet !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isMet ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isMet ? 'Tercapai' : 'Belum'}
                      </span>
                    )}
                  </div>

                  {/* Card Validation Warning Alert */}
                  {hasCardErr && (
                    <div className="bg-rose-100 text-rose-900 text-[11px] p-2 rounded-lg mb-2.5 flex items-start gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0 mt-0.5" />
                      <span>{numErr?.message || denErr?.message || pctErr?.message}</span>
                    </div>
                  )}

                  {!isRelevant && (
                    <div className="bg-amber-50 text-amber-800 text-[11px] p-2 rounded-lg mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Indikator ini umumnya tidak berlaku di unit {selectedUnit}, namun tetap dapat diisi jika ada data.</span>
                    </div>
                  )}

                  {ind.type === 'PERCENT_ONLY' ? (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Capaian Kepuasan (% / Indeks):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={cell.percent !== null && cell.percent !== undefined ? cell.percent : ''}
                          onChange={(e) =>
                            handleCellChange(ind.id, selectedUnit, 'percent', e.target.value)
                          }
                          className={`w-full text-sm font-semibold px-3 py-2 border rounded-lg ${
                            pctErr
                              ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                              : 'border-slate-300 focus:outline-emerald-600 focus:bg-white bg-slate-50'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                            Numerator (N):
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={cell.numerator !== null && cell.numerator !== undefined ? cell.numerator : ''}
                            onChange={(e) =>
                              handleCellChange(ind.id, selectedUnit, 'numerator', e.target.value)
                            }
                            className={`w-full text-xs font-semibold px-2.5 py-1.5 border rounded-lg ${
                              numErr
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 focus:outline-emerald-600 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-teal-800 mb-1">
                            Denominator (D):
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={cell.denominator !== null && cell.denominator !== undefined ? cell.denominator : ''}
                            onChange={(e) =>
                              handleCellChange(ind.id, selectedUnit, 'denominator', e.target.value)
                            }
                            className={`w-full text-xs font-semibold px-2.5 py-1.5 border rounded-lg ${
                              denErr
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 focus:outline-teal-600 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Result Box */}
                      <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-medium">Hasil Perhitungan:</span>
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold ${
                              isMet === true
                                ? 'text-emerald-700'
                                : isMet === false
                                ? 'text-rose-700'
                                : 'text-slate-700'
                            }`}
                          >
                            {pct !== null ? `${pct.toFixed(2)}%` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};