import React, { useState } from 'react';
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
  Building2,
  Cloud,
  SlidersHorizontal,
  LogOut,
  UserCheck,
  MoreHorizontal,
  X,
  Shield,
} from 'lucide-react';
import { MONTH_NAMES } from '../data/inmConfig';
import { HospitalConfig, UserAccount } from '../types/inm';

interface HeaderProps {
  currentUser: UserAccount;
  onLogout: () => void;
  activeTab: 'input' | 'report' | 'analytics';
  onTabChange: (tab: 'input' | 'report' | 'analytics') => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  hospital: HospitalConfig;
  indicatorsCount?: number;
  onOpenManageIndicators?: () => void;
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
  currentUser,
  onLogout,
  activeTab,
  onTabChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  hospital,
  indicatorsCount = 13,
  onOpenManageIndicators,
  onOpenSettings,
  onExportExcel,
  onPrint,
  onOpenDeleteModal,
  onBackupData,
  onImportFile,
  onManualSync,
  lastSyncedTime,
  syncStatus = 'synced',
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <>
      {/* Hidden File Input for Import (Admin only) */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={onImportFile}
        />
      )}

      {/* Top Header: Scrolls naturally on mobile to maximize viewport, sticky on desktop */}
      <header className="bg-white border-b border-slate-200 relative md:sticky md:top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-3">
            {/* Row 1: Hospital Identity + Active Account & Mobile Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-700 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                      {hospital.name}
                    </h1>
                    <span className="hidden sm:inline-block text-xs px-2 py-0.5 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      INM Kemenkes
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                    {hospital.subTitle} &bull; {indicatorsCount} Indikator
                  </p>
                </div>
              </div>

              {/* Right: Active User Identity + Logout + Mobile Drawer Trigger */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div
                  className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                    isAdmin
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  }`}
                >
                  {isAdmin ? (
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  )}
                  <span className="font-bold">
                    {isAdmin ? 'Admin (Semua Ruangan)' : `Ruang: ${currentUser.roomName} (${currentUser.unitCode})`}
                  </span>
                </div>

                {/* Mobile More Menu Button (>=44px hitbox) */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 active:bg-slate-100 cursor-pointer"
                  aria-label="Menu Aksi"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {/* Logout Button (>=44px on mobile) */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-xs font-bold text-slate-700 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl md:rounded-lg transition-colors cursor-pointer"
                  title="Keluar / Ganti Akun Ruangan"
                >
                  <LogOut className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">Ganti Akun</span>
                </button>
              </div>
            </div>

            {/* Mobile User Badge Strip */}
            <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-slate-900 shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span className="font-bold text-slate-900 truncate">
                  {isAdmin
                    ? 'Akun: Admin (Semua Ruangan)'
                    : `Akun Ruangan: ${currentUser.roomName} (${currentUser.unitCode})`}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                {isAdmin ? 'Akses Penuh' : 'Khusus Ruangan'}
              </span>
            </div>

            {/* Row 2: Period Selector & Desktop Action Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1 md:pt-0">
              {/* Period selector (Touch ergonomic on mobile) */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:flex-initial flex items-center bg-slate-100 rounded-xl md:rounded-lg px-2.5 py-1 border border-slate-200 min-h-[44px] md:min-h-0">
                  <Calendar className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <select
                    aria-label="Pilih Bulan"
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(Number(e.target.value))}
                    className="flex-1 md:flex-initial bg-transparent text-sm md:text-xs font-bold text-slate-800 pr-2 py-1 outline-hidden cursor-pointer"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Pilih Tahun"
                    value={selectedYear}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="bg-transparent text-sm md:text-xs font-bold text-slate-800 pl-2 pr-1 py-1 border-l border-slate-300 outline-hidden cursor-pointer tabular-nums"
                  >
                    {Array.from({ length: 21 }, (_, i) => 2020 + i).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Quick Sync Button */}
                <button
                  type="button"
                  onClick={onManualSync}
                  className="md:hidden min-h-[44px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Sinkronkan Data Cloud"
                >
                  <Cloud className="w-4 h-4 text-emerald-700" />
                  <span>{syncStatus === 'syncing' ? 'Simpan...' : 'Sinkron'}</span>
                </button>
              </div>

              {/* Desktop Actions Group */}
              <div className="hidden md:flex items-center flex-wrap gap-1.5">
                {isAdmin && onOpenManageIndicators && (
                  <button
                    type="button"
                    onClick={onOpenManageIndicators}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                    title="Tambah, Edit, atau Hapus Indikator Mutu"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
                    <span>Kelola Indikator</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Ekspor ke Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={onPrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Cetak Laporan / PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Impor Data dari Excel / CSV / JSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Impor</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBackupData}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Cadangkan Semua Data ke Berkas JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden xl:inline">Cadangkan</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenDeleteModal}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Data Bulan Ini atau Semua Data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Hapus Data</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onManualSync}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                  title="Sinkronkan data dengan Firebase Cloud"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{syncStatus === 'syncing' ? 'Menyimpan...' : 'Sinkron Cloud'}</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Pengaturan Kop & Pengesahan RS"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Tabs Navigation Bar (Hidden on mobile where Bottom Nav is used) */}
        <div className="hidden md:block bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <nav className="flex space-x-2 py-2">
              <button
                type="button"
                onClick={() => onTabChange('input')}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'input'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Lembar Kerja</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold">
                  {isAdmin ? 'Semua Unit' : currentUser.unitCode}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('report')}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Laporan Mutu Nasional</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('analytics')}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-cyan-600" />
                <span>Grafik &amp; Analisis Mutu</span>
              </button>
            </nav>

            {/* Cloud Synchronization status indicator */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {syncStatus === 'syncing' ? (
                <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Menyinkronkan ke Cloud...</span>
                </span>
              ) : syncStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Tersimpan Lokal</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onManualSync}
                  className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 cursor-pointer transition-colors"
                  title="Klik untuk menyinkronkan ulang data dari Firebase"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Cloud Aktif</span>
                  {lastSyncedTime && (
                    <span className="text-[10px] text-emerald-700 font-mono tabular-nums bg-emerald-100 px-1.5 py-0.5 rounded">
                      {lastSyncedTime}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (< md) — Respects 15% sticky surface cap */}
      <nav
        aria-label="Navigasi Utama Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg print:hidden"
      >
        <div className="grid grid-cols-3 h-16">
          <button
            type="button"
            onClick={() => onTabChange('input')}
            className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors cursor-pointer relative ${
              activeTab === 'input' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            {activeTab === 'input' && (
              <span className="absolute top-0 inset-x-6 h-0.5 bg-emerald-600 rounded-b-full" />
            )}
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Lembar Kerja</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('report')}
            className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors cursor-pointer relative ${
              activeTab === 'report' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            {activeTab === 'report' && (
              <span className="absolute top-0 inset-x-6 h-0.5 bg-emerald-600 rounded-b-full" />
            )}
            <FileText className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Laporan INM</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('analytics')}
            className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors cursor-pointer relative ${
              activeTab === 'analytics' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            {activeTab === 'analytics' && (
              <span className="absolute top-0 inset-x-6 h-0.5 bg-emerald-600 rounded-b-full" />
            )}
            <BarChart3 className="w-5 h-5" />
            <span className="text-[11px] tracking-tight">Grafik Mutu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Action Bottom Sheet Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs print:hidden">
          <div
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="bg-white rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-200 max-h-[82vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Menu &amp; Pengaturan</h3>
                <p className="text-xs text-slate-500">
                  Login sebagai: <strong>{isAdmin ? 'Admin' : currentUser.roomName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExportExcel();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Ekspor Laporan ke Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onPrint();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Laporan / Simpan PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBackupData();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Cadangkan Data (JSON)</span>
              </button>

              {isAdmin && onOpenManageIndicators && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenManageIndicators();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-teal-700" />
                  <span>Tambah / Edit / Hapus Indikator</span>
                </button>
              )}

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Impor Berkas Excel / JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span>Pengaturan Identitas &amp; Kop RS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDeleteModal();
                    }}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-sm flex items-center gap-3 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Kosongkan / Hapus Data</span>
                  </button>
                </>
              )}

              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar / Ganti Akun Ruangan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};