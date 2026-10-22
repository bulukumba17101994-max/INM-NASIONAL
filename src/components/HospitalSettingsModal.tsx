import React, { useState } from 'react';
import { X, Building2, Save, UserCheck, ShieldCheck } from 'lucide-react';
import { HospitalConfig } from '../types/inm';

interface HospitalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HospitalConfig;
  onSave: (newConfig: HospitalConfig) => void;
}

export const HospitalSettingsModal: React.FC<HospitalSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<HospitalConfig>({ ...config });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Pengaturan Identitas & Pengesahan Rumah Sakit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Fasilitas Pelayanan / Rumah Sakit:</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-600 font-semibold text-slate-900"
              placeholder="Contoh: RUMAH SAKIT UMUM DAERAH"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Sub Judul / Tim Pengelola Mutu:</label>
            <input
              type="text"
              value={formData.subTitle}
              onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-600 text-slate-900"
              placeholder="Contoh: KOMITE MUTU DAN KESELAMATAN PASIEN"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Alamat Fasilitas:</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-600 text-slate-900"
                placeholder="Jl. Kesehatan No. 10"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kota / Kabupaten:</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-600 text-slate-900"
                placeholder="Jakarta"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5 text-emerald-800">
              <UserCheck className="w-4 h-4" />
              <span>Pejabat Penandatangan Laporan</span>
            </h4>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Ketua Komite Mutu:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.leadQualityName}
                    onChange={(e) => setFormData({ ...formData, leadQualityName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    placeholder="Nama Lengkap & Gelar"
                  />
                  <input
                    type="text"
                    value={formData.leadQualityNip}
                    onChange={(e) => setFormData({ ...formData, leadQualityNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    placeholder="NIP / NIK"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Direktur Rumah Sakit:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.directorName}
                    onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    placeholder="Nama Direktur & Gelar"
                  />
                  <input
                    type="text"
                    value={formData.directorNip}
                    onChange={(e) => setFormData({ ...formData, directorNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    placeholder="NIP / NIK"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};