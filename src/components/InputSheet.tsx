import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Building,
  ClipboardList,
  Grid3X3,
  ShieldCheck,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Lock,
  Calendar,
} from 'lucide-react';
import { INDICATORS, MONTH_NAMES, SHORT_MONTH_NAMES, UNITS } from '../data/inmConfig';
import {
  IndicatorDefinition,
  MonthlyRecord,
  UnitCode,
  UserAccount,
  ValidationError,
} from '../types/inm';
import {
  calculatePercent,
  computeIndicatorSummary,
  formatNumber,
  isTargetMet,
} from '../utils/calculations';
import { validateMonthlyRecord } from '../utils/validation';

interface InputSheetProps {
  currentUser: UserAccount;
  record: MonthlyRecord;
  yearRecords?: Record<number, MonthlyRecord>;
  onMonthChange?: (month: number) => void;
  indicators?: IndicatorDefinition[];
  onChangeRecord: (newRecord: MonthlyRecord) => void;
  onSaveNow?: () => Promise<void>;
  onOpenAddIndicator?: () => void;
  onOpenEditIndicator?: (indicator: IndicatorDefinition) => void;
  onDeleteIndicator?: (indicator: IndicatorDefinition) => void;
  onOpenManageIndicators?: () => void;
  isSaving?: boolean;
  lastSyncedTime?: string | null;
}

export const InputSheet: React.FC<InputSheetProps> = ({
  currentUser,
  record,
  yearRecords = {},
  onMonthChange,
  indicators = INDICATORS,
  onChangeRecord,
  onSaveNow,
  onOpenAddIndicator,
  onOpenEditIndicator,
  onDeleteIndicator,
  onOpenManageIndicators,
  isSaving = false,
  lastSyncedTime,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const lockedUnit: UnitCode | null = isAdmin ? null : currentUser.unitCode;

  const [viewMode, setViewMode] = useState<'grid' | 'perUnit'>(() => {
    if (!isAdmin) return 'perUnit';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'perUnit';
    }
    return 'grid';
  });

  const [selectedUnit, setSelectedUnit] = useState<UnitCode>(() => lockedUnit || 'IRNA');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'met' | 'unmet' | 'empty' | 'errorsOnly'>('all');
  const [showValidationRules, setShowValidationRules] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [validationAlertMessage, setValidationAlertMessage] = useState<string | null>(null);
  const [showInputSummaryModal, setShowInputSummaryModal] = useState<boolean>(false);

  // Sync selectedUnit whenever logged-in user changes
  useEffect(() => {
    if (lockedUnit) {
      setSelectedUnit(lockedUnit);
      setViewMode('perUnit');
    }
  }, [lockedUnit]);

  const activeUnit: UnitCode = lockedUnit || selectedUnit;
  const monthName = MONTH_NAMES[record.month - 1];

  // Perform automatic validation on the monthly record
  const allValidationErrors: ValidationError[] = validateMonthlyRecord(record, indicators);
  // Scope validation errors to current room if non-admin, or all rooms if admin
  const validationErrors: ValidationError[] = lockedUnit
    ? allValidationErrors.filter((err) => err.unitCode === lockedUnit)
    : allValidationErrors;
  const hasErrors = validationErrors.length > 0;

  const getCellError = (
    indicatorId: number,
    unitCode: UnitCode,
    field?: 'numerator' | 'denominator' | 'percent'
  ): ValidationError | undefined => {
    return allValidationErrors.find(
      (err) =>
        err.indicatorId === indicatorId &&
        err.unitCode === unitCode &&
        (!field || err.field === field)
    );
  };

  // Safe input handler with strict RBAC check + numeric sanitation
  const handleCellChange = (
    indicatorId: number,
    unitCode: UnitCode,
    field: 'numerator' | 'denominator' | 'percent',
    valueStr: string
  ) => {
    // Enforce room-level access control: non-admin can ONLY edit their assigned room
    if (lockedUnit && unitCode !== lockedUnit) {
      return;
    }

    let val: number | null = null;
    if (valueStr !== '') {
      const parsed = parseFloat(valueStr);
      if (!isNaN(parsed) && isFinite(parsed)) {
        val = Math.max(0, parsed);
        if (field === 'percent') {
          val = Math.min(100, val);
        }
      }
    }

    const updatedData = { ...record.data };
    if (!updatedData[indicatorId]) {
      updatedData[indicatorId] = {};
    } else {
      updatedData[indicatorId] = { ...updatedData[indicatorId] };
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

  const handleAutoFixError = (err: ValidationError) => {
    if (lockedUnit && err.unitCode !== lockedUnit) return;
    const row = record.data[err.indicatorId]?.[err.unitCode];
    if (!row) return;

    if (err.field === 'numerator' && row.denominator !== null && row.denominator !== undefined) {
      handleCellChange(err.indicatorId, err.unitCode, 'numerator', String(row.denominator));
    } else if (err.field === 'denominator' && row.numerator !== null && row.numerator !== undefined) {
      handleCellChange(err.indicatorId, err.unitCode, 'denominator', String(row.numerator));
    }
  };

  const handleExplicitSave = async () => {
    if (onSaveNow) {
      try {
        await onSaveNow();
      } catch (err) {
        console.warn('Save finished locally:', err);
      }
    }

    if (hasErrors) {
      setValidationAlertMessage(
        `Data bulan ${monthName} ${record.year} berhasil disimpan ke Lembar Kerja. Terdapat ${validationErrors.length} sel yang perlu disesuaikan (misal Numerator > Denominator).`
      );
      setTimeout(() => setValidationAlertMessage(null), 8000);
    } else {
      setValidationAlertMessage(null);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 5000);
    }
  };

  // Count how many indicators are filled for a given record (scoped to lockedUnit for room users, or all units for admin)
  const countFilledForRecord = (rec: MonthlyRecord | undefined): number => {
    if (!rec || !rec.data) return 0;
    return indicators.filter((ind) => {
      const row = rec.data?.[ind.id];
      if (!row) return false;
      if (lockedUnit) {
        const c = row[lockedUnit];
        return Boolean(c && (c.numerator !== null || c.denominator !== null || c.percent !== null));
      }
      return Object.values(row).some(
        (c) => c && (c.numerator !== null || c.denominator !== null || c.percent !== null)
      );
    }).length;
  };

  const filledIndicatorsCount = countFilledForRecord(record);

  // Filter indicators
  const filteredIndicators = indicators.filter((ind) => {
    const matchesSearch =
      ind.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(ind.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterTarget === 'errorsOnly') {
      return validationErrors.some((e) => e.indicatorId === ind.id);
    }

    if (filterTarget !== 'all') {
      if (lockedUnit) {
        const cell = record.data?.[ind.id]?.[lockedUnit];
        const pct =
          ind.type === 'PERCENT_ONLY'
            ? cell?.percent ?? null
            : calculatePercent(cell?.numerator, cell?.denominator);
        const met = pct !== null ? isTargetMet(pct, ind.targetOperator, ind.targetValue) : null;
        if (filterTarget === 'met') return met === true;
        if (filterTarget === 'unmet') return met === false;
        if (filterTarget === 'empty') return pct === null;
      } else {
        const summary = computeIndicatorSummary(ind, record.data[ind.id]);
        if (filterTarget === 'met') return summary.isMetAverage === true;
        if (filterTarget === 'unmet') return summary.isMetAverage === false;
        if (filterTarget === 'empty') return summary.avgPercent === null;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner & Save Controls */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-2">
              <Calculator className="w-3.5 h-3.5" />
              <span>
                {isAdmin
                  ? 'Lembar Kerja Admin — Akses Semua 9 Ruangan'
                  : `Lembar Kerja Ruangan: ${currentUser.roomName} (${currentUser.unitCode})`}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
              Kertas Kerja Indikator Mutu Nasional (INM)
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isAdmin ? (
                <>
                  Anda login sebagai <strong className="text-emerald-300">Admin</strong>. Anda dapat mengisi dan mengelola data seluruh 9 ruangan pada setiap bulan pelaporan.
                </>
              ) : (
                <>
                  Anda login pada akun ruangan <strong className="text-emerald-300">{currentUser.fullName}</strong>. Pengisian data dibuka khusus untuk ruangan Anda dan tersimpan permanen sesuai bulannya.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleExplicitSave}
              className={`min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                isSaving
                  ? 'bg-amber-400 text-slate-950 cursor-wait'
                  : hasErrors
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Menyimpan...</span>
                </>
              ) : hasErrors ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Simpan Data ({validationErrors.length} Catatan)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Simpan Data {monthName}</span>
                </>
              )}
            </button>

            <div className="bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 flex sm:block items-center justify-between">
              <p className="text-[11px] text-slate-400 font-medium">Periode Aktif</p>
              <p className="text-xs sm:text-sm font-bold text-white tabular-nums">
                {monthName} {record.year}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Persistent Data Bar ("Semua data inputan tetap tersimpan sesuai bulannya di menu lembar kerja") */}
      {onMonthChange && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Data Bulanan Tersimpan ({record.year})</span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Pilih bulan untuk melihat atau mengisi data lembar kerja per bulan
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {SHORT_MONTH_NAMES.map((shortM, idx) => {
              const mNum = idx + 1;
              const isSelected = mNum === record.month;
              const monthRec = mNum === record.month ? record : yearRecords[mNum];
              const count = countFilledForRecord(monthRec);
              const hasSaved = count > 0;

              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => onMonthChange(mNum)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                      : hasSaved
                      ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Bulan ${MONTH_NAMES[idx]} ${record.year} (${count} indikator terisi)`}
                >
                  <span>{shortM}</span>
                  {hasSaved && (
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-md font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-200/80 text-emerald-900'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Worksheet Data Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
            <span className="text-slate-600 font-medium">
              Status {isAdmin ? 'Semua Unit' : currentUser.roomName} ({monthName}):
            </span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
              {filledIndicatorsCount} / {indicators.length} Indikator Terisi
            </span>
          </div>
          {lastSyncedTime && (
            <div className="text-slate-500 text-[11px] tabular-nums">
              Tersimpan: <strong className="text-slate-700">{lastSyncedTime}</strong>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && onOpenAddIndicator && (
            <button
              type="button"
              onClick={onOpenAddIndicator}
              className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Indikator</span>
            </button>
          )}
          {isAdmin && onOpenManageIndicators && (
            <button
              type="button"
              onClick={onOpenManageIndicators}
              className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-lg font-bold text-xs transition cursor-pointer border border-teal-200"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
              <span>Edit / Hapus Indikator</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowInputSummaryModal(!showInputSummaryModal)}
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition cursor-pointer border border-slate-300"
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
            <span>{showInputSummaryModal ? 'Tutup Ringkasan' : 'Ringkasan Terinput'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Quick Review of Inputted Data */}
      {showInputSummaryModal && (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 mb-3 border-b border-slate-200">
            <h4 className="font-bold text-xs uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Ringkasan Data {isAdmin ? 'Rumah Sakit' : `Ruang ${currentUser.roomName}`} — {monthName} {record.year}
              </span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Tersimpan otomatis sesuai bulan pada Lembar Kerja
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {indicators.map((ind) => {
              const summary = computeIndicatorSummary(ind, record.data?.[ind.id]);
              const unitVal = lockedUnit ? summary.unitValues[lockedUnit] : null;
              const displayPct = lockedUnit ? unitVal?.percent ?? null : summary.avgPercent;
              const displayNum = lockedUnit ? unitVal?.numerator ?? null : summary.avgNumerator;
              const displayDen = lockedUnit ? unitVal?.denominator ?? null : summary.avgDenominator;
              const displayMet = lockedUnit ? unitVal?.isMet ?? null : summary.isMetAverage;
              const hasData = displayPct !== null;

              return (
                <div
                  key={ind.id}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                    hasData
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-100/60 border-dashed border-slate-300 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-bold text-slate-800 line-clamp-1">
                      {ind.code}: {ind.title}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      Target: {ind.targetLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] tabular-nums">
                    <span className="text-slate-500">
                      {hasData ? (
                        ind.type === 'PERCENT_ONLY' ? (
                          'Indeks Kepuasan'
                        ) : (
                          <>
                            N: {formatNumber(displayNum, 1)} &bull; D: {formatNumber(displayDen, 1)}
                          </>
                        )
                      ) : (
                        'Belum diisi'
                      )}
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        hasData
                          ? displayMet
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {displayPct !== null ? `${displayPct.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Success Notice */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-700 text-white shadow-sm flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <div>
              <p className="font-bold">
                Data Bulan {monthName} {record.year} Berhasil Disimpan!
              </p>
              <p className="text-emerald-100 font-normal text-[11px]">
                Tersimpan aman sesuai bulannya di Lembar Kerja dan tersinkronisasi untuk HP maupun komputer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(false)}
            className="min-h-[36px] text-white/90 hover:text-white px-2.5 py-1 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Validation Alert Notice */}
      {validationAlertMessage && (
        <div className="p-4 rounded-xl bg-rose-600 text-white shadow-sm flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{validationAlertMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationAlertMessage(null)}
            className="min-h-[36px] text-white/90 hover:text-white px-2.5 py-1 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Automatic Validation Status Bar */}
      <div
        className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
          hasErrors
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                hasErrors ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {hasErrors ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm">
                  {hasErrors
                    ? `Perhatian: Ditemukan ${validationErrors.length} Kesalahan Format Input`
                    : 'Validasi Otomatis Aktif: Format Data Sesuai Standar'}
                </h4>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {hasErrors
                  ? 'Pastikan nilai Numerator (N) tidak melebihi Denominator (D) dan Denominator tidak bernilai 0.'
                  : 'Semua angka tersimpan otomatis sesuai bulan tanpa menghilangkan data ruangan lain.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowValidationRules(!showValidationRules)}
            className="min-h-[40px] sm:min-h-0 self-start sm:self-auto text-xs font-bold underline px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
          >
            {showValidationRules ? 'Tutup Aturan' : 'Aturan Validasi'}
          </button>
        </div>

        {hasErrors && (
          <div className="mt-3 pt-3 border-t border-rose-200 space-y-2">
            <p className="text-[11px] font-bold text-rose-900">Daftar Sel Yang Perlu Diperbaiki:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {validationErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold shrink-0">
                      {err.unitCode}
                    </span>
                    <span className="truncate text-slate-800">
                      <strong>INM-{err.indicatorId}:</strong> {err.message}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFixError(err)}
                    className="min-h-[36px] px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Samakan N=D
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showValidationRules && (
          <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-emerald-800 block mb-1">1. Angka Non-Negatif</span>
              <p className="text-[11px] text-slate-600">Nilai N dan D hanya menerima angka positif atau 0 (&ge; 0).</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-teal-800 block mb-1">2. Rasio Logis (N &le; D)</span>
              <p className="text-[11px] text-slate-600">Numerator tidak boleh melebihi Denominator.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-cyan-800 block mb-1">3. Pencegahan Pembagi Nol</span>
              <p className="text-[11px] text-slate-600">Jika Numerator &gt; 0, Denominator wajib lebih dari 0.</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">4. Akses Sesuai Ruangan</span>
              <p className="text-[11px] text-slate-600">Akun ruangan hanya dapat mengubah kolom ruangannya sendiri; Admin dapat mengubah semua ruangan.</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: View Toggle, Search & Filter */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* View mode toggle */}
        <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('perUnit')}
            className={`min-h-[42px] sm:min-h-0 flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'perUnit'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{isAdmin ? 'Form Per Ruangan' : `Form ${currentUser.roomName}`}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`min-h-[42px] sm:min-h-0 flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tabel Semua Ruangan</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari indikator mutu..."
              className="w-full min-h-[44px] sm:min-h-0 text-base sm:text-xs pl-9 pr-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-emerald-600 transition-colors"
            />
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <select
              aria-label="Filter Status Indikator"
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value as any)}
              className="w-full bg-transparent text-sm sm:text-xs font-medium outline-hidden cursor-pointer"
            >
              <option value="all">Semua Status</option>
              {hasErrors && <option value="errorsOnly">Kesalahan Input ({validationErrors.length})</option>}
              <option value="met">Target Tercapai</option>
              <option value="unmet">Belum Tercapai</option>
              <option value="empty">Belum Diisi</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SPREADSHEET GRID (Editable for Admin on all 9 units; for Room User ONLY on their own unit) */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                <span>Tabel Spreadsheet Indikator &amp; Rata-Rata ({monthName} {record.year})</span>
                {!isAdmin && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                    Edit Khusus Kolom {currentUser.unitCode} ({currentUser.roomName})
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Admin dapat mengisi seluruh kolom 9 ruangan secara langsung.'
                  : `Kolom ruangan lain dikunci (hanya baca). Anda hanya dapat mengisi kolom ${currentUser.roomName} (${currentUser.unitCode}).`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Tercapai
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                Belum
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">NO.</th>
                  <th className="py-3 px-4 min-w-[240px] border-r border-slate-200">INDIKATOR &amp; TARGET</th>
                  <th className="py-3 px-2 w-10 text-center border-r border-slate-200 bg-slate-200/60 font-bold">
                    TIPE
                  </th>
                  {UNITS.map((u) => {
                    const isEditableUnit = isAdmin || u.code === lockedUnit;
                    const isOwnRoom = lockedUnit === u.code;

                    return (
                      <th
                        key={u.code}
                        className={`py-3 px-2 min-w-[96px] text-center border-r border-slate-200 font-bold uppercase tracking-wider transition-colors ${
                          isOwnRoom
                            ? 'bg-emerald-100/90 text-emerald-950'
                            : !isEditableUnit
                            ? 'bg-slate-100/80 text-slate-400'
                            : 'text-slate-900'
                        }`}
                        title={u.fullName}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {!isEditableUnit && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                          <span>{u.code}</span>
                        </div>
                        <span className="block text-[10px] font-normal truncate max-w-[86px] mx-auto">
                          {u.name}
                        </span>
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 min-w-[110px] text-center bg-emerald-100 text-emerald-950 font-bold">
                    RATA-RATA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {filteredIndicators.map((ind, rowIdx) => {
                  const rowData = record.data[ind.id] || {};
                  const summary = computeIndicatorSummary(ind, rowData);

                  const renderRowActions = () => {
                    if (!isAdmin) return null;
                    return (
                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/80">
                        {confirmDeleteId === ind.id ? (
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="font-bold text-rose-700">Hapus?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteIndicator?.(ind);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 text-white font-bold rounded cursor-pointer"
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            {onOpenEditIndicator && (
                              <button
                                type="button"
                                onClick={() => onOpenEditIndicator(ind)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 bg-white border border-slate-200 hover:border-teal-300 px-2 py-0.5 rounded cursor-pointer"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            {onDeleteIndicator && indicators.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(ind.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 hover:text-rose-800 bg-white border border-slate-200 hover:border-rose-300 px-2 py-0.5 rounded cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  };

                  if (ind.type === 'PERCENT_ONLY') {
                    return (
                      <tr key={ind.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200 font-sans">
                          {rowIdx + 1}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-200 font-sans">
                          <div className="font-semibold text-slate-900">{ind.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Target: <span className="font-medium text-emerald-700">{ind.targetLabel}</span>
                          </div>
                          {renderRowActions()}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-teal-700 bg-teal-50">
                          %
                        </td>
                        {UNITS.map((u) => {
                          const canEdit = isAdmin || u.code === lockedUnit;
                          const val = rowData[u.code]?.percent;
                          const cellErr = getCellError(ind.id, u.code, 'percent');
                          const isMet = summary.unitValues[u.code]?.isMet;

                          return (
                            <td
                              key={u.code}
                              className={`p-1.5 border-r border-slate-200 text-center ${
                                !canEdit ? 'bg-slate-50/90' : lockedUnit === u.code ? 'bg-emerald-50/30' : ''
                              }`}
                            >
                              {canEdit ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="0.00"
                                    value={val !== null && val !== undefined ? val : ''}
                                    onChange={(e) =>
                                      handleCellChange(ind.id, u.code, 'percent', e.target.value)
                                    }
                                    className={`w-full text-center px-1 py-1.5 rounded text-xs font-semibold border transition-all ${
                                      cellErr
                                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-400'
                                        : isMet === true
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:bg-white'
                                        : isMet === false
                                        ? 'bg-rose-50 text-rose-800 border-rose-300 focus:bg-white'
                                        : 'bg-white text-slate-800 border-slate-200 focus:border-teal-500'
                                    }`}
                                    title={cellErr ? cellErr.message : undefined}
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 select-none">
                                  {val !== null && val !== undefined ? `${val}%` : '-'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-emerald-50/50">
                          <div
                            className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                              summary.isMetAverage === true
                                ? 'bg-emerald-600 text-white'
                                : summary.isMetAverage === false
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {summary.avgPercent !== null ? `${summary.avgPercent.toFixed(2)}%` : '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <React.Fragment key={ind.id}>
                      {/* Row N */}
                      <tr className="bg-white hover:bg-slate-50/50">
                        <td
                          rowSpan={3}
                          className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200 align-top font-sans bg-slate-50/40"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 inline-flex items-center justify-center font-bold text-xs mt-1">
                            {rowIdx + 1}
                          </span>
                        </td>
                        <td
                          rowSpan={3}
                          className="py-3 px-4 border-r border-slate-200 align-top font-sans bg-slate-50/40"
                        >
                          <div className="font-semibold text-slate-900 leading-snug">{ind.title}</div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                              Target: {ind.targetLabel}
                            </span>
                          </div>
                          {ind.numeratorLabel && (
                            <div className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-200 pt-1 space-y-0.5">
                              <div>
                                <span className="font-semibold text-emerald-700">N:</span> {ind.numeratorLabel}
                              </div>
                              <div>
                                <span className="font-semibold text-teal-700">D:</span> {ind.denominatorLabel}
                              </div>
                            </div>
                          )}
                          {renderRowActions()}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/40">
                          N
                        </td>
                        {UNITS.map((u) => {
                          const canEdit = isAdmin || u.code === lockedUnit;
                          const nVal = rowData[u.code]?.numerator;
                          const cellErr = getCellError(ind.id, u.code, 'numerator');

                          return (
                            <td
                              key={u.code}
                              className={`p-1 border-r border-slate-200 relative text-center ${
                                !canEdit ? 'bg-slate-50/90' : lockedUnit === u.code ? 'bg-emerald-50/30' : ''
                              }`}
                            >
                              {canEdit ? (
                                <>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    placeholder="-"
                                    value={nVal !== null && nVal !== undefined ? nVal : ''}
                                    onChange={(e) =>
                                      handleCellChange(ind.id, u.code, 'numerator', e.target.value)
                                    }
                                    className={`w-full text-center px-1.5 py-1 rounded text-xs font-medium text-slate-900 transition-all ${
                                      cellErr
                                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900'
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
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 select-none">
                                  {nVal !== null && nVal !== undefined ? nVal : '-'}
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
                          const canEdit = isAdmin || u.code === lockedUnit;
                          const dVal = rowData[u.code]?.denominator;
                          const cellErr = getCellError(ind.id, u.code, 'denominator');

                          return (
                            <td
                              key={u.code}
                              className={`p-1 border-r border-slate-200 relative text-center ${
                                !canEdit ? 'bg-slate-50/90' : lockedUnit === u.code ? 'bg-emerald-50/30' : ''
                              }`}
                            >
                              {canEdit ? (
                                <>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    placeholder="-"
                                    value={dVal !== null && dVal !== undefined ? dVal : ''}
                                    onChange={(e) =>
                                      handleCellChange(ind.id, u.code, 'denominator', e.target.value)
                                    }
                                    className={`w-full text-center px-1.5 py-1 rounded text-xs font-medium text-slate-900 transition-all ${
                                      cellErr
                                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900'
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
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 select-none">
                                  {dVal !== null && dVal !== undefined ? dVal : '-'}
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

      {/* VIEW MODE 2: PER-UNIT INPUT FORM (Mobile-friendly & locked to room for room accounts) */}
      {viewMode === 'perUnit' && (
        <div className="space-y-4">
          {/* Room Selector Tabs: Shown for Admin so Admin can switch between all 9 rooms */}
          {isAdmin ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {UNITS.map((u) => {
                const isSelected = activeUnit === u.code;
                const unitErrorCount = allValidationErrors.filter((e) => e.unitCode === u.code).length;

                return (
                  <button
                    key={u.code}
                    type="button"
                    onClick={() => setSelectedUnit(u.code)}
                    className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span>{u.code}</span>
                    {unitErrorCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {unitErrorCount}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Active Room Details Header Card */}
          {(() => {
            const activeUnitInfo = UNITS.find((u) => u.code === activeUnit);
            const unitErrors = allValidationErrors.filter((e) => e.unitCode === activeUnit);

            return (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    {activeUnit}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {activeUnitInfo?.fullName}
                      </h3>
                      {!isAdmin && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Ruangan Anda
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeUnitInfo?.description} &bull; Periode <strong>{monthName} {record.year}</strong>
                    </p>
                  </div>
                </div>
                {unitErrors.length > 0 ? (
                  <div className="text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{unitErrors.length} kesalahan validasi pada ruangan ini</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Input ruang {activeUnitInfo?.name} siap &amp; tersimpan otomatis</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Grid of Indicator Input Cards for Active Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredIndicators.map((ind) => {
              const rowData = record.data[ind.id] || {};
              const cell = rowData[activeUnit] || {};
              const isRelevant = !ind.relevantUnits || ind.relevantUnits.includes(activeUnit);

              const numErr = getCellError(ind.id, activeUnit, 'numerator');
              const denErr = getCellError(ind.id, activeUnit, 'denominator');
              const pctErr = getCellError(ind.id, activeUnit, 'percent');
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
                  className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between ${
                    hasCardErr
                      ? 'border-2 border-rose-400 bg-rose-50/20'
                      : !isRelevant
                      ? 'border-dashed border-slate-300'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          hasCardErr ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {ind.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {ind.title}
                        </h4>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                            Standar: <span className="font-bold text-emerald-700">{ind.targetLabel}</span>
                          </p>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              {onOpenEditIndicator && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEditIndicator(ind)}
                                  className="text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                              )}
                              {onDeleteIndicator && indicators.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteIndicator(ind)}
                                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isMet !== null && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isMet ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isMet ? 'Tercapai' : 'Belum'}
                        </span>
                      )}
                    </div>

                    {ind.numeratorLabel && ind.type === 'N_D' && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3 space-y-1">
                        <div>
                          <strong className="text-emerald-800">N:</strong> {ind.numeratorLabel}
                        </div>
                        <div>
                          <strong className="text-teal-800">D:</strong> {ind.denominatorLabel}
                        </div>
                      </div>
                    )}

                    {hasCardErr && (
                      <div className="bg-rose-100 text-rose-900 text-[11px] p-2.5 rounded-xl mb-3 flex items-start gap-1.5 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <span>{numErr?.message || denErr?.message || pctErr?.message}</span>
                      </div>
                    )}

                    {!isRelevant && (
                      <div className="bg-amber-50 text-amber-900 text-[11px] p-2.5 rounded-xl mb-3 flex items-start gap-1.5 border border-amber-200/70">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                        <span>Opsional untuk ruang {activeUnit} (diisi bila terdapat pelayanan terkait).</span>
                      </div>
                    )}
                  </div>

                  {ind.type === 'PERCENT_ONLY' ? (
                    <div className="mt-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Capaian Kepuasan (% / Indeks):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={cell.percent !== null && cell.percent !== undefined ? cell.percent : ''}
                          onChange={(e) =>
                            handleCellChange(ind.id, activeUnit, 'percent', e.target.value)
                          }
                          className={`w-full min-h-[46px] text-base sm:text-sm font-mono tabular-nums font-semibold px-3.5 py-2.5 border rounded-xl ${
                            pctErr
                              ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                              : 'border-slate-300 focus:outline-emerald-600 focus:bg-white bg-slate-50'
                          }`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-emerald-800 mb-1">
                            Numerator (N)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            placeholder="0"
                            value={cell.numerator !== null && cell.numerator !== undefined ? cell.numerator : ''}
                            onChange={(e) =>
                              handleCellChange(ind.id, activeUnit, 'numerator', e.target.value)
                            }
                            className={`w-full min-h-[46px] text-base sm:text-sm font-mono tabular-nums font-semibold px-3 py-2 border rounded-xl ${
                              numErr
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 focus:outline-emerald-600 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-teal-800 mb-1">
                            Denominator (D)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            placeholder="0"
                            value={cell.denominator !== null && cell.denominator !== undefined ? cell.denominator : ''}
                            onChange={(e) =>
                              handleCellChange(ind.id, activeUnit, 'denominator', e.target.value)
                            }
                            className={`w-full min-h-[46px] text-base sm:text-sm font-mono tabular-nums font-semibold px-3 py-2 border rounded-xl ${
                              denErr
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 focus:outline-teal-600 bg-slate-50 focus:bg-white'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Result Box */}
                      <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between border border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">Capaian ({activeUnit}):</span>
                        <span
                          className={`text-sm font-mono tabular-nums font-bold ${
                            isMet === true
                              ? 'text-emerald-700'
                              : isMet === false
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {pct !== null ? `${pct.toFixed(2)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Bottom Save Action Button inside Scroll Flow */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleExplicitSave}
              className="w-full min-h-[50px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isSaving
                  ? 'Menyimpan Data ke Cloud...'
                  : `Simpan Data ${isAdmin ? 'Semua Ruangan' : `Ruang ${currentUser.roomName}`} — Bulan ${monthName} ${record.year}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};