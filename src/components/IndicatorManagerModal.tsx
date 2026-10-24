import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  SlidersHorizontal,
  Search,
} from 'lucide-react';
import { IndicatorDefinition, IndicatorType, UnitCode } from '../types/inm';
import { DEFAULT_INDICATORS, UNITS } from '../data/inmConfig';

interface IndicatorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorDefinition[];
  onSaveIndicators: (nextIndicators: IndicatorDefinition[]) => void;
  initialMode?: 'list' | 'add' | 'edit';
  initialEditIndicator?: IndicatorDefinition | null;
}

interface FormState {
  code: string;
  title: string;
  targetOperator: '>=' | '>' | '<=' | '<' | '=';
  targetValue: string;
  targetLabel: string;
  type: IndicatorType;
  numeratorLabel: string;
  denominatorLabel: string;
  description: string;
  standardReference: string;
  applyAllUnits: boolean;
  relevantUnits: UnitCode[];
}

function buildOperatorSymbol(op: FormState['targetOperator']): string {
  if (op === '>=') return '≥';
  if (op === '<=') return '≤';
  return op;
}

export const IndicatorManagerModal: React.FC<IndicatorManagerModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onSaveIndicators,
  initialMode = 'list',
  initialEditIndicator = null,
}) => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createEmptyForm = (list: IndicatorDefinition[]): FormState => {
    const nextNum = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
    const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return {
      code: `INM-${padded}`,
      title: '',
      targetOperator: '>=',
      targetValue: '80',
      targetLabel: '≥ 80%',
      type: 'N_D',
      numeratorLabel: 'Jumlah capaian sesuai standar',
      denominatorLabel: 'Jumlah seluruh sampel yang diamati',
      description: '',
      standardReference: 'Permenkes No. 30 Tahun 2022',
      applyAllUnits: true,
      relevantUnits: UNITS.map((u) => u.code),
    };
  };

  const indicatorToForm = (ind: IndicatorDefinition): FormState => {
    const hasCustomUnits = Array.isArray(ind.relevantUnits) && ind.relevantUnits.length > 0 && ind.relevantUnits.length < UNITS.length;
    return {
      code: ind.code,
      title: ind.title,
      targetOperator: ind.targetOperator,
      targetValue: String(ind.targetValue),
      targetLabel: ind.targetLabel,
      type: ind.type,
      numeratorLabel: ind.numeratorLabel || '',
      denominatorLabel: ind.denominatorLabel || '',
      description: ind.description || '',
      standardReference: ind.standardReference || 'Permenkes No. 30 Tahun 2022',
      applyAllUnits: !hasCustomUnits,
      relevantUnits: ind.relevantUnits && ind.relevantUnits.length > 0 ? [...ind.relevantUnits] : UNITS.map((u) => u.code),
    };
  };

  const [form, setForm] = useState<FormState>(() => createEmptyForm(indicators));

  useEffect(() => {
    if (isOpen) {
      setConfirmDeleteId(null);
      setConfirmReset(false);
      setFormError(null);
      if (initialMode === 'edit' && initialEditIndicator) {
        setMode('edit');
        setEditingId(initialEditIndicator.id);
        setForm(indicatorToForm(initialEditIndicator));
      } else if (initialMode === 'add') {
        setMode('add');
        setEditingId(null);
        setForm(createEmptyForm(indicators));
      } else {
        setMode('list');
        setEditingId(null);
      }
    }
  }, [isOpen, initialMode, initialEditIndicator]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setFormError(null);
    setEditingId(null);
    setForm(createEmptyForm(indicators));
    setMode('add');
  };

  const handleOpenEdit = (ind: IndicatorDefinition) => {
    setFormError(null);
    setEditingId(ind.id);
    setForm(indicatorToForm(ind));
    setMode('edit');
  };

  const handleOperatorOrValueChange = (
    nextOp: FormState['targetOperator'],
    nextValStr: string
  ) => {
    const sym = buildOperatorSymbol(nextOp);
    const formattedVal = nextValStr.replace('.', ',');
    const autoLabel = nextOp === '=' ? `${formattedVal}%` : `${sym} ${formattedVal}%`;
    setForm((prev) => ({
      ...prev,
      targetOperator: nextOp,
      targetValue: nextValStr,
      targetLabel: autoLabel,
    }));
  };

  const toggleUnit = (code: UnitCode) => {
    setForm((prev) => {
      const exists = prev.relevantUnits.includes(code);
      const next = exists
        ? prev.relevantUnits.filter((u) => u !== code)
        : [...prev.relevantUnits, code];
      return { ...prev, relevantUnits: next };
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Judul indikator mutu wajib diisi.');
      return;
    }
    const parsedTarget = Number(form.targetValue);
    if (isNaN(parsedTarget) || parsedTarget < 0 || parsedTarget > 100) {
      setFormError('Nilai target standar harus berupa angka antara 0 hingga 100.');
      return;
    }
    if (!form.applyAllUnits && form.relevantUnits.length === 0) {
      setFormError('Pilih minimal 1 unit/instalasi terkait atau aktifkan Semua Unit.');
      return;
    }

    const nextId =
      mode === 'edit' && editingId !== null
        ? editingId
        : indicators.length > 0
        ? Math.max(...indicators.map((i) => i.id)) + 1
        : 1;

    const newItem: IndicatorDefinition = {
      id: nextId,
      code: form.code.trim() || `INM-${nextId < 10 ? `0${nextId}` : nextId}`,
      title: form.title.trim(),
      targetOperator: form.targetOperator,
      targetValue: parsedTarget,
      targetLabel:
        form.targetLabel.trim() ||
        `${buildOperatorSymbol(form.targetOperator)} ${parsedTarget}%`,
      type: form.type,
      numeratorLabel: form.type === 'N_D' ? form.numeratorLabel.trim() : undefined,
      denominatorLabel: form.type === 'N_D' ? form.denominatorLabel.trim() : undefined,
      relevantUnits: form.applyAllUnits ? undefined : form.relevantUnits,
      description: form.description.trim() || form.title.trim(),
      standardReference: form.standardReference.trim() || 'Standar Mutu RS',
    };

    if (mode === 'edit' && editingId !== null) {
      const updated = indicators.map((ind) => (ind.id === editingId ? newItem : ind));
      onSaveIndicators(updated);
    } else {
      onSaveIndicators([...indicators, newItem]);
    }

    setMode('list');
    setEditingId(null);
    setFormError(null);
  };

  const handleConfirmDelete = (id: number) => {
    if (indicators.length <= 1) {
      setFormError('Minimal harus terdapat 1 indikator mutu aktif di dalam sistem.');
      setConfirmDeleteId(null);
      return;
    }
    const updated = indicators.filter((ind) => ind.id !== id);
    onSaveIndicators(updated);
    setConfirmDeleteId(null);
  };

  const handleResetDefaults = () => {
    onSaveIndicators([...DEFAULT_INDICATORS]);
    setConfirmReset(false);
  };

  const filteredList = indicators.filter(
    (ind) =>
      ind.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {mode === 'add'
                  ? 'Tambah Indikator Mutu Baru'
                  : mode === 'edit'
                  ? 'Edit Indikator Mutu'
                  : 'Kelola Daftar Indikator Mutu'}
              </h3>
              <p className="text-xs text-slate-300">
                {mode === 'list'
                  ? `Total ${indicators.length} indikator aktif · Tambah, ubah standar target, atau hapus indikator mutu`
                  : 'Lengkapi rincian indikator, formula numerator/denominator, dan target standar capaian'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-600 hover:text-rose-900 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {mode === 'list' ? (
            <div className="space-y-4">
              {/* Top Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode atau nama indikator mutu..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {confirmReset ? (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-amber-900 font-semibold">Reset ke 13 Standar INM?</span>
                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded cursor-pointer"
                      >
                        Ya, Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 rounded cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Standar Bawaan (13 INM)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Indikator Mutu</span>
                  </button>
                </div>
              </div>

              {/* Indicators Table / List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                {filteredList.map((ind, idx) => {
                  const isDeleting = confirmDeleteId === ind.id;
                  return (
                    <div
                      key={ind.id}
                      className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                          <span className="font-mono font-bold text-emerald-700">
                            {idx + 1}. {ind.code}
                          </span>
                          <span>&bull;</span>
                          <span>
                            Target Standar: <strong className="text-slate-800">{ind.targetLabel}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Tipe: {ind.type === 'PERCENT_ONLY' ? 'Persentase Langsung (%)' : 'Numerator / Denominator (N/D)'}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-900">{ind.title}</p>
                        {ind.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {ind.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDeleting ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1.5 rounded-lg text-xs">
                            <span className="font-bold text-rose-800">Hapus indikator ini?</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(ind.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(ind)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-teal-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(ind.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredList.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Tidak ditemukan indikator mutu yang sesuai dengan pencarian.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Indikator</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Contoh: INM-14"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama / Judul Indikator Mutu <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: Kepatuhan Jam Buka Pelayanan Poliklinik (>= 90%)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Standar</label>
                  <select
                    value={form.targetOperator}
                    onChange={(e) =>
                      handleOperatorOrValueChange(
                        e.target.value as FormState['targetOperator'],
                        form.targetValue
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value=">=">&ge; (Lebih dari atau sama dengan)</option>
                    <option value=">">&gt; (Lebih dari)</option>
                    <option value="<=">&le; (Kurang dari atau sama dengan)</option>
                    <option value="<">&lt; (Kurang dari)</option>
                    <option value="=">= (Sama dengan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nilai Target Standar (%) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={form.targetValue}
                    onChange={(e) =>
                      handleOperatorOrValueChange(form.targetOperator, e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Label Tampilan Target</label>
                  <input
                    type="text"
                    value={form.targetLabel}
                    onChange={(e) => setForm({ ...form, targetLabel: e.target.value })}
                    placeholder="Contoh: ≥ 85%"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Perhitungan</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as IndicatorType })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="N_D">Numerator (N) &amp; Denominator (D) Otomatis</option>
                    <option value="PERCENT_ONLY">Input Persentase Langsung (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regulasi / Standar Acuan</label>
                  <input
                    type="text"
                    value={form.standardReference}
                    onChange={(e) => setForm({ ...form, standardReference: e.target.value })}
                    placeholder="Permenkes No. 30 Tahun 2022 / Indikator Mutu Prioritas RS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {form.type === 'N_D' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Keterangan Numerator (Pembilang / N)
                    </label>
                    <input
                      type="text"
                      value={form.numeratorLabel}
                      onChange={(e) => setForm({ ...form, numeratorLabel: e.target.value })}
                      placeholder="Jumlah tindakan/pasien yang memenuhi kriteria"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Keterangan Denominator (Penyebut / D)
                    </label>
                    <input
                      type="text"
                      value={form.denominatorLabel}
                      onChange={(e) => setForm({ ...form, denominatorLabel: e.target.value })}
                      placeholder="Jumlah total populasi/sampel yang diamati"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Operasional</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Penjelasan singkat definisi operasional indikator mutu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Relevant Units */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Unit / Instalasi Penginput Data</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="checkbox"
                      checked={form.applyAllUnits}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          applyAllUnits: e.target.checked,
                          relevantUnits: e.target.checked ? UNITS.map((u) => u.code) : form.relevantUnits,
                        })
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Berlaku untuk Semua Unit Pelayanan</span>
                  </label>
                </div>

                {!form.applyAllUnits && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {UNITS.map((u) => {
                      const checked = form.relevantUnits.includes(u.code);
                      return (
                        <label
                          key={u.code}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUnit(u.code)}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          <span>
                            {u.code} — {u.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setMode('list');
                    setEditingId(null);
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Kembali ke Daftar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{mode === 'edit' ? 'Simpan Perubahan Indikator' : 'Simpan Indikator Baru'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {mode === 'list' && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <span>Perubahan daftar indikator otomatis diperbarui pada Kertas Kerja, Grafik &amp; Menu Cetak.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
