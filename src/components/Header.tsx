import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  BarChart3,
  Calendar,
  Download,
  Printer,
  Settings,
  Trash2,
  Upload,
  CheckCircle2,
  Building2,
  Sparkles,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import { MONTH_NAMES } from '../data/inmConfig';
import { HospitalConfig } from '../types/inm';

interface HeaderProps {
  activeTab: 'input' | 'report' | 'analytics';
  onTabChange: (tab: 'input' | 'report' | 'analytics') => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  hospital: HospitalConfig;
  onOpenSettings: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onOpenDeleteModal: () => void;
  onBackupData: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualSync?: () => void;
  lastSyncedTime?: string | null;
  isSaved?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  hospital,
  onOpenSettings,
  onExportExcel,
  onExportCSV,
  onPrint,
  onOpenDeleteModal,
  onBackupData,
  onImportFile,
  onManualSync,
  lastSyncedTime,
  isSaved = true,
  syncStatus = 'synced',
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top hospital branding bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {hospital.name}
                </h1>
                <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  INM Kemenkes
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {hospital.subTitle} &bull; 13 Indikator Nasional Mutu Pelayanan RS
              </p>
            </div>
          </div>

          {/* Right side: Period selector & quick actions */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Period selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2 mr-1.5" />
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 pr-2 py-1 outline-hidden cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 pr-2 py-1 border-l border-slate-300 pl-2 outline-hidden cursor-pointer"
              >
                {Array.from({ length: 21 }, (_, i) => 2020 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions group */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Ekspor ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Cetak Laporan / PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              {/* Upload Excel/CSV */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onImportFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Impor Data dari Excel / CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Impor</span>
              </button>

              {/* Backup Data */}
              <button
                type="button"
                onClick={onBackupData}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Cadangkan Semua Data ke Berkas JSON"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden xl:inline">Cadangkan</span>
              </button>

              {/* Delete Data */}
              <button
                type="button"
                onClick={onOpenDeleteModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Hapus Data Bulan Ini atau Semua Data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Hapus Data</span>
              </button>

              {/* Sinkron Cloud button */}
              <button
                type="button"
                onClick={onManualSync}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Sinkronkan data dengan Firebase Cloud (Semua Perangkat)"
              >
                <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-bounce text-amber-600' : 'text-emerald-700'}`} />
                <span className="hidden sm:inline">{syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
              </button>

              {/* Hospital Config */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Pengaturan Kop & Pengesahan RS"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation bar */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-4 py-2">
            <button
              onClick={() => onTabChange('input')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'input'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Lembar Kerja</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Input
              </span>
            </button>

            <button
              onClick={() => onTabChange('report')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Laporan Mutu Nasional</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
                Rekap Bulanan
              </span>
            </button>

            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              <span>Grafik & Analisis Mutu</span>
            </button>
          </nav>

          {/* Cloud Synchronization status indicator */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {syncStatus === 'syncing' ? (
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span className="hidden sm:inline">Menyinkronkan ke Cloud...</span>
                <span className="sm:hidden">Menyimpan...</span>
              </span>
            ) : syncStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Mode Offline (Tersimpan Lokal)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onManualSync}
                className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs cursor-pointer transition-colors"
                title="Klik untuk menyinkronkan ulang data dari Firebase"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold hidden sm:inline">Sinkron Cloud Aktif</span>
                {lastSyncedTime && (
                  <span className="text-[10px] text-emerald-700 font-mono bg-emerald-100 px-1.5 py-0.2 rounded">
                    {lastSyncedTime}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};