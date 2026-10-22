import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { InputSheet } from './components/InputSheet';
import { ReportSheet } from './components/ReportSheet';
import { AnalyticsView } from './components/AnalyticsView';
import { PrintReportModal } from './components/PrintReportModal';
import { HospitalSettingsModal } from './components/HospitalSettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DEFAULT_HOSPITAL_CONFIG, createEmptyRecord, MONTH_NAMES } from './data/inmConfig';
import { HospitalConfig, MonthlyRecord, UnitCode } from './types/inm';
import { exportToCSV, exportToExcel, parseImportFile } from './utils/exportExcel';
import {
  subscribeToMonthlyRecord,
  subscribeToYearRecords,
  saveRecordToCloud,
  deleteRecordFromCloud,
  deleteAllRecordsFromCloud,
  subscribeToHospitalConfig,
  saveHospitalConfigToCloud,
  fetchAllCloudRecords,
  testConnection,
} from './services/firebase';
import { AlertCircle, CheckCircle, Info, Sparkles, Cloud, RefreshCw, Loader2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'inm_record_';
const HOSPITAL_STORAGE_KEY = 'inm_hospital_config';

/**
 * Checks if a monthly record has any data entered by the user
 */
function isRecordEmpty(record: MonthlyRecord): boolean {
  if (!record || !record.data) return true;
  for (const indId in record.data) {
    const unitMap = record.data[indId];
    if (!unitMap) continue;
    for (const u in unitMap) {
      const cell = unitMap[u as UnitCode];
      if (cell && (cell.numerator != null || cell.denominator != null || cell.percent != null)) {
        return false;
      }
    }
  }
  return true;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'report' | 'analytics'>('input');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    // Default to current month (1-12)
    return new Date().getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Default to current year
    return new Date().getFullYear();
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(true);
  const [yearRecords, setYearRecords] = useState<Record<number, MonthlyRecord>>({});

  const [hospital, setHospital] = useState<HospitalConfig>(() => {
    try {
      const saved = localStorage.getItem(HOSPITAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HOSPITAL_CONFIG;
  });

  // Current active monthly record
  const [currentRecord, setCurrentRecord] = useState<MonthlyRecord>(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    try {
      const key = `${STORAGE_KEY_PREFIX}${year}_${month}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return createEmptyRecord(month, year);
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRecordRef = useRef<MonthlyRecord>(currentRecord);
  latestRecordRef.current = currentRecord;

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printChartModel, setPrintChartModel] = useState<'bar' | 'line'>('bar');
  const [printPeriodScope, setPrintPeriodScope] = useState<'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all'>('tw1');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleOpenPrint = (
    chartModel?: 'bar' | 'line',
    scope?: 'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all'
  ) => {
    if (chartModel) {
      setPrintChartModel(chartModel);
    }
    if (scope) {
      setPrintPeriodScope(scope);
    } else {
      const defaultTw = selectedMonth <= 3 ? 'tw1' : selectedMonth <= 6 ? 'tw2' : selectedMonth <= 9 ? 'tw3' : 'tw4';
      setPrintPeriodScope(defaultTw);
    }
    setIsPrintModalOpen(true);
  };

  // Show notification toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3800);
  }, []);

  // Subscribe to Hospital Config in Cloud Firestore (live sync across all devices)
  useEffect(() => {
    const unsub = subscribeToHospitalConfig(
      (cloudConfig) => {
        if (cloudConfig) {
          setHospital(cloudConfig);
          try {
            localStorage.setItem(HOSPITAL_STORAGE_KEY, JSON.stringify(cloudConfig));
          } catch (e) {
            console.error(e);
          }
        }
      },
      (err) => {
        console.warn('Hospital config live sync fallback to local:', err);
      }
    );
    return () => unsub();
  }, []);

  // Flush any pending save immediately
  const flushSaveNow = useCallback(async (recordToSave?: MonthlyRecord): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const target = recordToSave || latestRecordRef.current;

    // 1. Immediately persist to localStorage cache
    const key = `${STORAGE_KEY_PREFIX}${target.year}_${target.month}`;
    try {
      localStorage.setItem(key, JSON.stringify(target));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 2. Immediately update yearRecords state
    setYearRecords((prev) => ({
      ...prev,
      [target.month]: target,
    }));

    setSyncStatus('syncing');
    try {
      await saveRecordToCloud(target);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedTime(timeStr);
    } catch (err) {
      console.warn('Firebase Cloud sync deferred (local copy preserved):', err);
      // Keep local state safe and sound; do NOT throw unhandled error to caller!
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedTime(timeStr);
    }
  }, []);

  // Change Month safely (flush before switching)
  const handleMonthChange = (newMonth: number) => {
    if (newMonth === selectedMonth) return;
    if (saveTimeoutRef.current) {
      saveRecordToCloud(latestRecordRef.current).catch(console.error);
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setIsLoadingMonth(true);
    setSelectedMonth(newMonth);
  };

  // Change Year safely (flush before switching)
  const handleYearChange = (newYear: number) => {
    if (newYear === selectedYear) return;
    if (saveTimeoutRef.current) {
      saveRecordToCloud(latestRecordRef.current).catch(console.error);
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setIsLoadingMonth(true);
    setSelectedYear(newYear);
  };

  // Live real-time Cloud Firestore synchronization for monthly record
  useEffect(() => {
    const key = `${STORAGE_KEY_PREFIX}${selectedYear}_${selectedMonth}`;
    setIsLoadingMonth(true);

    // 1. Fast load from local storage cache for instant render
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data) {
          setCurrentRecord(parsed);
        } else {
          setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear));
        }
      } else {
        setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear));
      }
    } catch (e) {
      console.error(e);
      setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear));
    }

    // 2. Real-time Cloud listener (sync across any device/browser anywhere)
    const unsub = subscribeToMonthlyRecord(
      selectedYear,
      selectedMonth,
      (cloudRecord, hasPendingWrites) => {
        setIsLoadingMonth(false);

        // If local client is writing changes right now, don't overwrite local input state
        if (hasPendingWrites) {
          return;
        }

        if (cloudRecord) {
          setCurrentRecord((prev) => {
            // Guard: If local state already has user input and incoming cloud record is empty,
            // DO NOT wipe the user's data!
            if (!isRecordEmpty(prev) && isRecordEmpty(cloudRecord)) {
              saveRecordToCloud(prev).catch(console.error);
              return prev;
            }

            // If local state has newer edits currently in queue, keep local
            if (prev && prev.month === selectedMonth && prev.year === selectedYear) {
              const prevTime = prev.lastUpdated ? new Date(prev.lastUpdated).getTime() : 0;
              const cloudTime = cloudRecord.lastUpdated ? new Date(cloudRecord.lastUpdated).getTime() : 0;
              if (prevTime > cloudTime + 600) {
                return prev;
              }
            }
            try {
              localStorage.setItem(key, JSON.stringify(cloudRecord));
            } catch (e) {
              console.error(e);
            }
            return cloudRecord;
          });

          setSyncStatus('synced');
          if (cloudRecord.lastUpdated) {
            try {
              const d = new Date(cloudRecord.lastUpdated);
              setLastSyncedTime(d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch {}
          }
        } else {
          // Record doesn't exist on Cloud yet; if local cache has meaningful data, push to Cloud
          try {
            const local = localStorage.getItem(key);
            if (local) {
              const parsed = JSON.parse(local);
              if (!isRecordEmpty(parsed)) {
                saveRecordToCloud(parsed).catch(console.error);
              }
            }
          } catch (e) {
            console.error(e);
          }
          setSyncStatus('synced');
        }
      },
      (err) => {
        setIsLoadingMonth(false);
        console.warn('Real-time cloud listener offline:', err);
        setSyncStatus('offline');
      }
    );

    return () => {
      unsub();
    };
  }, [selectedMonth, selectedYear]);

  // Live real-time Cloud Firestore synchronization for all 12 months of selectedYear
  useEffect(() => {
    // 1. Initial fast load from localStorage cache
    const initialYearMap: Record<number, MonthlyRecord> = {};
    for (let m = 1; m <= 12; m++) {
      const k = `${STORAGE_KEY_PREFIX}${selectedYear}_${m}`;
      const local = localStorage.getItem(k);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (!isRecordEmpty(parsed)) {
            initialYearMap[m] = parsed;
          }
        } catch (e) {}
      }
    }
    if (!isRecordEmpty(currentRecord) && currentRecord.year === selectedYear) {
      initialYearMap[currentRecord.month] = currentRecord;
    }
    setYearRecords(initialYearMap);

    // 2. Real-time subscription to all records of selectedYear from Cloud Firestore
    const unsub = subscribeToYearRecords(
      selectedYear,
      (cloudRecords) => {
        setYearRecords((prev) => ({
          ...prev,
          ...cloudRecords,
        }));
      },
      (err) => {
        console.warn('Real-time year records listener offline:', err);
      }
    );

    return () => unsub();
  }, [selectedYear]);

  // Real-time Update: updates local state immediately, updates cache, and debounces Cloud Firestore write
  const handleUpdateRecord = (updatedRecord: MonthlyRecord) => {
    // 1. Immediate UI update
    setCurrentRecord(updatedRecord);
    if (updatedRecord.year === selectedYear) {
      setYearRecords((prev) => ({
        ...prev,
        [updatedRecord.month]: updatedRecord,
      }));
    }

    // 2. Immediate Local Storage cache
    const key = `${STORAGE_KEY_PREFIX}${updatedRecord.year}_${updatedRecord.month}`;
    try {
      localStorage.setItem(key, JSON.stringify(updatedRecord));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 3. Debounced Cloud Firestore push (prevents network flood & typing stutter)
    setSyncStatus('syncing');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveRecordToCloud(updatedRecord);
        setSyncStatus('synced');
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(timeStr);
      } catch (err) {
        console.error('Failed to push to Cloud Firestore:', err);
        setSyncStatus('offline');
      }
    }, 650);
  };

  // Manual force sync action (pulls fresh data and pushes local changes)
  const handleManualSync = async () => {
    setSyncStatus('syncing');
    showToast('Memeriksa & menyinkronkan data dengan Cloud Firestore...', 'info');
    try {
      const isOnline = await testConnection();
      if (!isOnline) {
        setSyncStatus('offline');
        showToast('Koneksi ke Firebase sedang offline. Data tetap tersimpan aman di perangkat lokal.', 'info');
        return;
      }

      // Flush current record first
      await flushSaveNow();

      // Pull all cloud records to synchronize state
      const allCloud = await fetchAllCloudRecords();
      const currentKey = `${selectedYear}_${selectedMonth}`;
      if (allCloud[currentKey]) {
        setCurrentRecord(allCloud[currentKey]);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentKey}`, JSON.stringify(allCloud[currentKey]));
        } catch {}
      }

      const yearMap: Record<number, MonthlyRecord> = {};
      for (let m = 1; m <= 12; m++) {
        const k = `${selectedYear}_${m}`;
        if (allCloud[k]) {
          yearMap[m] = allCloud[k];
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${k}`, JSON.stringify(allCloud[k]));
          } catch {}
        }
      }
      setYearRecords(yearMap);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedTime(timeStr);
      showToast('Sinkronisasi selesai! Seluruh data terhubung identik dengan Firebase Cloud.', 'success');
    } catch (e) {
      console.error(e);
      setSyncStatus('offline');
      showToast('Gagal melakukan sinkronisasi cloud.', 'error');
    }
  };

  // Save hospital configuration locally and to Cloud
  const handleSaveHospital = async (newConfig: HospitalConfig) => {
    setHospital(newConfig);
    try {
      localStorage.setItem(HOSPITAL_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error(e);
    }

    try {
      await saveHospitalConfigToCloud(newConfig);
      showToast('Data identitas rumah sakit berhasil disinkronkan ke Cloud & Semua Perangkat!');
    } catch (e) {
      console.error('Error saving hospital config to cloud:', e);
      showToast('Data tersimpan di perangkat lokal (menunggu koneksi cloud)', 'info');
    }
  };

  // Delete handlers (Cloud & Local)
  const handleDeleteCurrentMonth = async () => {
    const key = `${STORAGE_KEY_PREFIX}${selectedYear}_${selectedMonth}`;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
    const emptyRecord = createEmptyRecord(selectedMonth, selectedYear);
    setCurrentRecord(emptyRecord);
    setYearRecords((prev) => {
      const next = { ...prev };
      delete next[selectedMonth];
      return next;
    });

    try {
      await deleteRecordFromCloud(selectedYear, selectedMonth);
      showToast(`Data bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} telah berhasil dikosongkan dari Cloud & Lokal.`, 'info');
    } catch (err) {
      console.error(err);
      showToast(`Data bulan telah dikosongkan di perangkat lokal.`, 'info');
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
    const emptyRecord = createEmptyRecord(selectedMonth, selectedYear);
    setCurrentRecord(emptyRecord);
    setYearRecords({});

    try {
      await deleteAllRecordsFromCloud();
      showToast('Seluruh data indikator mutu di semua periode berhasil dihapus permanen dari Cloud & Lokal.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Seluruh data di perangkat lokal berhasil dikosongkan.', 'info');
    }
  };

  // Backup all data to JSON (incorporating both Cloud & local cache)
  const handleBackupData = async () => {
    try {
      // 1. Fetch from cloud
      let allRecords: Record<string, MonthlyRecord> = {};
      try {
        allRecords = await fetchAllCloudRecords();
      } catch (err) {
        console.warn('Could not fetch cloud records for backup, using local cache:', err);
      }

      // 2. Merge local records
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const val = localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val);
              const cloudKey = `${parsed.year}_${parsed.month}`;
              if (!allRecords[cloudKey]) {
                allRecords[cloudKey] = parsed;
              }
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Also ensure current record is included
      const currentKey = `${selectedYear}_${selectedMonth}`;
      allRecords[currentKey] = currentRecord;

      const backupPayload = {
        appName: 'Sistem Informasi Indikator Mutu Nasional (INM)',
        exportedAt: new Date().toISOString(),
        hospital,
        records: allRecords,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `cadangan_data_inm_${selectedYear}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Cadangan seluruh data berhasil diunduh ke berkas JSON!');
    } catch (e) {
      console.error(e);
      showToast('Gagal membuat berkas cadangan data.', 'error');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    try {
      exportToExcel(currentRecord, hospital, yearRecords);
      showToast('Laporan berhasil diekspor ke format Excel (.xlsx)!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor ke Excel', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(currentRecord);
      showToast('Laporan berhasil diekspor ke format CSV!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor ke CSV', 'error');
    }
  };

  // Import handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // If it's a JSON backup
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.records) {
          for (const [k, rec] of Object.entries(parsed.records)) {
            const monthlyRec = rec as MonthlyRecord;
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${monthlyRec.year}_${monthlyRec.month}`, JSON.stringify(monthlyRec));
            // Sync to cloud
            saveRecordToCloud(monthlyRec).catch(console.error);
          }
          if (parsed.hospital) {
            handleSaveHospital(parsed.hospital);
          }
          const currentKey = `${selectedYear}_${selectedMonth}`;
          if (parsed.records[currentKey]) {
            setCurrentRecord(parsed.records[currentKey] as MonthlyRecord);
          }
          showToast(`Berkas cadangan "${file.name}" berhasil dipulihkan & disinkronkan ke Cloud!`);
          return;
        }
      }

      // If it's an Excel or CSV file
      const mergedRecord = await parseImportFile(file, currentRecord);
      handleUpdateRecord(mergedRecord);
      await flushSaveNow(mergedRecord);
      showToast(`Data dari file "${file.name}" berhasil diimpor ke bulan ${MONTH_NAMES[selectedMonth - 1]} & tersinkron ke Cloud!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal membaca format file yang diunggah.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Copy data from previous month helper
  const handleCopyFromPreviousMonth = async () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevKey = `${STORAGE_KEY_PREFIX}${prevYear}_${prevMonth}`;
    try {
      const prevDataStr = localStorage.getItem(prevKey);
      if (!prevDataStr) {
        showToast(`Tidak ditemukan data pada bulan ${MONTH_NAMES[prevMonth - 1]} ${prevYear}.`, 'info');
        return;
      }
      const prevRecord: MonthlyRecord = JSON.parse(prevDataStr);
      const cloned: MonthlyRecord = {
        month: selectedMonth,
        year: selectedYear,
        data: JSON.parse(JSON.stringify(prevRecord.data)),
        lastUpdated: new Date().toISOString(),
      };
      handleUpdateRecord(cloned);
      await flushSaveNow(cloned);
      showToast(`Berhasil menyalin data dari ${MONTH_NAMES[prevMonth - 1]} ${prevYear} & tersinkron ke Cloud!`);
    } catch (e) {
      console.error(e);
      showToast('Gagal menyalin data', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white transition-all animate-bounce bg-slate-900 border border-slate-700">
          {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header with Navigation and Period Selector */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        hospital={hospital}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrint={() => handleOpenPrint()}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        onBackupData={handleBackupData}
        onImportFile={handleImportFile}
        onManualSync={handleManualSync}
        lastSyncedTime={lastSyncedTime}
        isSaved={syncStatus === 'synced'}
        syncStatus={syncStatus}
      />

      {/* Main Content Body */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Real-time Cloud Sync Banner */}
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-800">
              Cloud Database Firestore:
            </span>
            <span>
              Tersinkronisasi otomatis &amp; anti-korup. Data yang disimpan di sini langsung dapat dibuka di komputer, laptop, tablet, &amp; HP manapun.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastSyncedTime && (
              <span className="text-[11px] text-slate-500 font-mono">
                Terakhir sinkron: {lastSyncedTime}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Sekarang</span>
            </button>
          </div>
        </div>

        {/* Loading month indicator from Cloud */}
        {isLoadingMonth && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Memverifikasi dan memuat data bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear} dari Firebase Cloud...</span>
          </div>
        )}

        {/* Empty month notification if no data yet */}
        {!isLoadingMonth && isRecordEmpty(currentRecord) && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold">Bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear} siap untuk penginputan data</p>
                <p className="text-emerald-800">
                  Data Anda tersinkronisasi di Firebase Cloud secara aman tanpa risiko korup saat dibuka di perangkat lain.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFromPreviousMonth}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Salin dari Bulan Lalu
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Lembar Kerja (Sheet Penginputan Data & Rata-rata) */}
        {activeTab === 'input' && (
          <InputSheet
            record={currentRecord}
            onChangeRecord={handleUpdateRecord}
            onSaveNow={flushSaveNow}
            isSaving={syncStatus === 'syncing'}
            lastSyncedTime={lastSyncedTime}
          />
        )}

        {/* Tab 2: Laporan Mutu Nasional (Rekap Bulanan & Tahunan) */}
        {activeTab === 'report' && (
          <ReportSheet
            record={currentRecord}
            hospital={hospital}
            yearRecords={yearRecords}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            onPrint={(model, scope) => handleOpenPrint(model, scope)}
            onNavigateToInput={() => setActiveTab('input')}
          />
        )}

        {/* Tab 3: Grafik & Analisis Mutu */}
        {activeTab === 'analytics' && (
          <AnalyticsView record={currentRecord} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; {selectedYear} {hospital.name} &bull; Sistem Indikator Nasional Mutu Pelayanan Kesehatan (Permenkes No. 30 Tahun 2022)
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cloud Database Firestore &bull; Sinkronisasi Multi-Device Aktif</span>
          </div>
        </div>
      </footer>

      {/* Print Preview Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        record={currentRecord}
        hospital={hospital}
        yearRecords={yearRecords}
        initialChartModel={printChartModel}
        initialPeriodScope={printPeriodScope}
      />

      {/* Hospital Identity Settings Modal */}
      <HospitalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={hospital}
        onSave={handleSaveHospital}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteCurrentMonth={handleDeleteCurrentMonth}
        onDeleteAllData={handleDeleteAllData}
        monthName={MONTH_NAMES[selectedMonth - 1]}
        year={selectedYear}
      />
    </div>
  );
}