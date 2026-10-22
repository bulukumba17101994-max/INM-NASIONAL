import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteCurrentMonth: () => void;
  onDeleteAllData: () => void;
  monthName: string;
  year: number;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onDeleteCurrentMonth,
  onDeleteAllData,
  monthName,
  year,
}) => {
  const [confirmStep, setConfirmStep] = useState<'select' | 'confirmAll'>('select');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-900">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm">Hapus Data Indikator Mutu</h3>
          </div>
          <button
            onClick={() => {
              setConfirmStep('select');
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          {confirmStep === 'select' ? (
            <>
              <p className="leading-relaxed">
                Data Anda <strong>tersimpan aman dan permanen secara real-time</strong> di browser ini dan tidak akan pernah hilang kecuali Anda memilih untuk menghapusnya secara manual di sini.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCurrentMonth();
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-rose-200 hover:bg-rose-50/60 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      Hapus Data Bulan {monthName} {year}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hanya mengosongkan data inputan pada periode bulan berjalan ini. Data bulan lain tetap aman.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmStep('confirmAll')}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      Hapus Seluruh Data (Semua Bulan & Tahun)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mengosongkan total seluruh catatan data rumah sakit dari awal.
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-950">
                  <p className="font-bold">Konfirmasi Penghapusan Total</p>
                  <p className="mt-1 text-[11px] text-rose-800">
                    Tindakan ini akan menghapus <strong>seluruh data semua periode</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep('select')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAllData();
                    setConfirmStep('select');
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Ya, Hapus Semua Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};