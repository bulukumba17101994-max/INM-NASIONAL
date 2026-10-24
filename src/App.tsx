import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { InputSheet } from './components/InputSheet';
import { ReportSheet } from './components/ReportSheet';
import { AnalyticsView } from './components/AnalyticsView';
import { PrintReportModal } from './components/PrintReportModal';
import { HospitalSettingsModal } from './components/HospitalSettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { IndicatorManagerModal } from './components/IndicatorManagerModal';
import {
  DEFAULT_HOSPITAL_CONFIG,
  DEFAULT_INDICATORS,
  createEmptyRecord,
  getAccountById,
  MONTH_NAMES,
} from './data/inmConfig';
import {
  HospitalConfig,
  IndicatorDefinition,
  MonthlyRecord,
  UnitCode,
  UserAccount,
} from './types/inm';
import { exportToCSV, exportToExcel, parseImportFile } from './utils/exportExcel';
import {
  subscribeToMonthlyRecord,
  subscribeToYearRecords,
  saveRecordToCloud,
  mergeMonthlyRecords,
  deleteRecordFromCloud,
  deleteAllRecordsFromCloud,
  subscribeToHospitalConfig,
  saveHospitalConfigToCloud,
  subscribeToIndicators,
  saveIndicatorsToCloud,
  fetchAllCloudRecords,
  testConnection,
} from './services/firebase';
import { AlertCircle, CheckCircle, Info, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'inm_record_';
const HOSPITAL_STORAGE_KEY = 'inm_hospital_config';
const INDICATORS_STORAGE_KEY = 'inm_indicators_config';
const AUTH_SESSION_KEY = 'inm_auth_session_id';

/**
 * Checks if a monthly record has any data entered (optionally scoped to a specific unit)
 */
function isRecordEmpty(record: MonthlyRecord | undefined, unitFilter?: UnitCode | null): boolean {
  if (!record || !record.data) return true;
  for (const indId in record.data) {
    const unitMap = record.data[indId];
    if (!unitMap) continue;
    if (unitFilter) {
      const cell = unitMap[unitFilter];
      if (cell && (cell.numerator != null || cell.denominator != null || cell.percent != null)) {
        return false;
      }
    } else {
      for (const u in unitMap) {
        const cell = unitMap[u as UnitCode];
        if (cell && (cell.numerator != null || cell.denominator != null || cell.percent != null)) {
          return false;
        }
      }
    }
  }
  return true;
}

export default function App() {
  // Authentication state (9 Rooms + Admin)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedId = localStorage.getItem(AUTH_SESSION_KEY);
      return getAccountById(savedId);
    } catch {
      return null;
    }
  });

  const currentUserRef = useRef<UserAccount | null>(currentUser);
  currentUserRef.current = currentUser;

  const [activeTab, setActiveTab] = useState<'input' | 'report' | 'analytics'>('input');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
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

  const [indicators, setIndicators] = useState<IndicatorDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(INDICATORS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_INDICATORS;
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
  const [printChartModel, setPrintChartModel] = useState<'bar' | 'line'>('line');
  const [printPeriodScope, setPrintPeriodScope] = useState<
    'tw1' | 'tw2' | 'tw3' | 'tw4' | 's1' | 's2' | 'annual' | 'monthly' | 'all'
  >('tw1');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [indicatorModalState, setIndicatorModalState] = useState<{
    isOpen: boolean;
    mode: 'list' | 'add' | 'edit';
    editItem: IndicatorDefinition | null;
  }>({
    isOpen: false,
    mode: 'list',
    editItem: null,
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const lockedUnit: UnitCode | null = currentUser && !isAdmin ? currentUser.unitCode : null;

  // Show notification toast
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setNotification({ message, type });
      setTimeout(() => {
        setNotification((curr) => (curr?.message === message ? null : curr));
      }, 3800);
    },
    []
  );

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
      const defaultTw =
        selectedMonth <= 3
          ? 'tw1'
          : selectedMonth <= 6
          ? 'tw2'
          : selectedMonth <= 9
          ? 'tw3'
          : 'tw4';
      setPrintPeriodScope(defaultTw);
    }
    setIsPrintModalOpen(true);
  };

  // Subscribe to Hospital Config in Cloud Firestore
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

  // Subscribe to Indicators Config in Cloud Firestore
  useEffect(() => {
    const unsub = subscribeToIndicators(
      (cloudIndicators) => {
        if (cloudIndicators && cloudIndicators.length > 0) {
          setIndicators(cloudIndicators);
          try {
            localStorage.setItem(INDICATORS_STORAGE_KEY, JSON.stringify(cloudIndicators));
          } catch (e) {
            console.error(e);
          }
        }
      },
      (err) => {
        console.warn('Indicators config live sync fallback to local:', err);
      }
    );
    return () => unsub();
  }, []);

  // Save indicators list locally and to Cloud (Admin only)
  const handleSaveIndicators = async (nextIndicators: IndicatorDefinition[]) => {
    if (!isAdmin) return;
    setIndicators(nextIndicators);
    try {
      localStorage.setItem(INDICATORS_STORAGE_KEY, JSON.stringify(nextIndicators));
    } catch (e) {
      console.error(e);
    }
    await saveIndicatorsToCloud(nextIndicators);
    showToast(`Daftar indikator mutu berhasil diperbarui (${nextIndicators.length} indikator aktif)!`);
  };

  const handleDirectDeleteIndicator = async (target: IndicatorDefinition) => {
    if (!isAdmin) return;
    if (indicators.length <= 1) {
      showToast('Minimal harus terdapat 1 indikator mutu aktif.', 'error');
      return;
    }
    const updated = indicators.filter((ind) => ind.id !== target.id);
    await handleSaveIndicators(updated);
  };

  // Flush any pending save immediately (respecting unit-level merge for room accounts)
  const flushSaveNow = useCallback(async (recordToSave?: MonthlyRecord): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const target = recordToSave || latestRecordRef.current;
    const activeAcc = currentUserRef.current;
    const unitScope: UnitCode | null =
      activeAcc && activeAcc.role !== 'ADMIN' ? activeAcc.unitCode : null;

    // 1. Immediately persist to localStorage cache per year_month
    const key = `${STORAGE_KEY_PREFIX}${target.year}_${target.month}`;
    try {
      const existingRaw = localStorage.getItem(key);
      const mergedLocal = existingRaw
        ? mergeMonthlyRecords(JSON.parse(existingRaw), target, unitScope)
        : target;
      localStorage.setItem(key, JSON.stringify(mergedLocal));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 2. Immediately update yearRecords state
    if (target.year === selectedYear) {
      setYearRecords((prev) => ({
        ...prev,
        [target.month]: prev[target.month]
          ? mergeMonthlyRecords(prev[target.month], target, unitScope)
          : target,
      }));
    }

    setSyncStatus('syncing');
    try {
      await saveRecordToCloud(target, unitScope);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedTime(timeStr);
    } catch (err) {
      console.warn('Firebase Cloud sync deferred (local copy preserved):', err);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedTime(timeStr);
    }
  }, [selectedYear]);

  // Login & Logout Handlers
  const handleLoginSuccess = (account: UserAccount) => {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, account.id);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(account);
    setActiveTab('input');
    showToast(
      account.role === 'ADMIN'
        ? 'Berhasil masuk sebagai Admin (Akses Semua 9 Ruangan).'
        : `Berhasil masuk ke Akun Ruangan ${account.roomName} (${account.unitCode}).`,
      'success'
    );
  };

  const handleLogout = async () => {
    if (saveTimeoutRef.current) {
      await flushSaveNow(latestRecordRef.current);
    }
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
  };

  // Change Month safely (flush pending edits first so monthly data is NEVER lost)
  const handleMonthChange = (newMonth: number) => {
    if (newMonth === selectedMonth) return;
    if (saveTimeoutRef.current) {
      const activeAcc = currentUserRef.current;
      const unitScope = activeAcc && activeAcc.role !== 'ADMIN' ? activeAcc.unitCode : null;
      saveRecordToCloud(latestRecordRef.current, unitScope).catch(console.error);
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
      const activeAcc = currentUserRef.current;
      const unitScope = activeAcc && activeAcc.role !== 'ADMIN' ? activeAcc.unitCode : null;
      saveRecordToCloud(latestRecordRef.current, unitScope).catch(console.error);
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

    // 1. Fast load from localStorage / yearRecords cache for instant render when switching months
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data) {
          setCurrentRecord(parsed);
        } else {
          setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear, indicators));
        }
      } else {
        setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear, indicators));
      }
    } catch (e) {
      console.error(e);
      setCurrentRecord(createEmptyRecord(selectedMonth, selectedYear, indicators));
    }

    // 2. Real-time Cloud listener (merges multi-room inputs cleanly)
    const unsub = subscribeToMonthlyRecord(
      selectedYear,
      selectedMonth,
      (cloudRecord, hasPendingWrites) => {
        setIsLoadingMonth(false);
        if (hasPendingWrites) {
          return;
        }

        if (cloudRecord) {
          setCurrentRecord((prev) => {
            if (!isRecordEmpty(prev) && isRecordEmpty(cloudRecord)) {
              saveRecordToCloud(prev).catch(console.error);
              return prev;
            }

            let preferLocalUnit: UnitCode | null = null;
            if (prev && prev.month === selectedMonth && prev.year === selectedYear) {
              const prevTime = prev.lastUpdated ? new Date(prev.lastUpdated).getTime() : 0;
              const cloudTime = cloudRecord.lastUpdated
                ? new Date(cloudRecord.lastUpdated).getTime()
                : 0;
              if (prevTime > cloudTime + 600) {
                const activeAcc = currentUserRef.current;
                if (activeAcc && activeAcc.role !== 'ADMIN') {
                  preferLocalUnit = activeAcc.unitCode;
                } else {
                  return prev;
                }
              }
            }

            const merged =
              prev && prev.month === selectedMonth && prev.year === selectedYear
                ? mergeMonthlyRecords(prev, cloudRecord, preferLocalUnit)
                : cloudRecord;

            try {
              localStorage.setItem(key, JSON.stringify(merged));
            } catch (e) {
              console.error(e);
            }
            return merged;
          });

          setSyncStatus('synced');
          if (cloudRecord.lastUpdated) {
            try {
              const d = new Date(cloudRecord.lastUpdated);
              setLastSyncedTime(
                d.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
            } catch {}
          }
        } else {
          // Record doesn't exist on Cloud yet; if local cache has data for this month, push to Cloud
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
        } catch {}
      }
    }
    if (!isRecordEmpty(currentRecord) && currentRecord.year === selectedYear) {
      initialYearMap[currentRecord.month] = currentRecord;
    }
    setYearRecords(initialYearMap);

    const unsub = subscribeToYearRecords(
      selectedYear,
      (cloudRecords) => {
        setYearRecords((prev) => {
          const next = { ...prev };
          for (const [mStr, cloudRec] of Object.entries(cloudRecords)) {
            const m = Number(mStr);
            next[m] = next[m] ? mergeMonthlyRecords(next[m], cloudRec) : cloudRec;
            try {
              localStorage.setItem(
                `${STORAGE_KEY_PREFIX}${selectedYear}_${m}`,
                JSON.stringify(next[m])
              );
            } catch {}
          }
          return next;
        });
      },
      (err) => {
        console.warn('Real-time year records listener offline:', err);
      }
    );

    return () => unsub();
  }, [selectedYear]);

  // Real-time Update: updates local state immediately, updates monthly localStorage cache, and debounces Cloud Firestore write
  const handleUpdateRecord = (updatedRecord: MonthlyRecord) => {
    const activeAcc = currentUserRef.current;
    const unitScope: UnitCode | null =
      activeAcc && activeAcc.role !== 'ADMIN' ? activeAcc.unitCode : null;

    // 1. Immediate UI update
    setCurrentRecord(updatedRecord);
    if (updatedRecord.year === selectedYear) {
      setYearRecords((prev) => ({
        ...prev,
        [updatedRecord.month]: updatedRecord,
      }));
    }

    // 2. Immediate Local Storage cache keyed by year_month
    const key = `${STORAGE_KEY_PREFIX}${updatedRecord.year}_${updatedRecord.month}`;
    try {
      localStorage.setItem(key, JSON.stringify(updatedRecord));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 3. Debounced Cloud Firestore push (merges per-room safely)
    setSyncStatus('syncing');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveRecordToCloud(updatedRecord, unitScope);
        setSyncStatus('synced');
        const timeStr = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncedTime(timeStr);
      } catch (err) {
        console.error('Failed to push to Cloud Firestore:', err);
        setSyncStatus('offline');
      }
    }, 600);
  };

  // Manual force sync action
  const handleManualSync = async () => {
    setSyncStatus('syncing');
    showToast('Menyinkronkan data dengan Cloud Firestore...', 'info');
    try {
      const isOnline = await testConnection();
      if (!isOnline) {
        setSyncStatus('offline');
        showToast(
          'Koneksi sedang offline. Data bulanan tetap tersimpan aman di perangkat lokal.',
          'info'
        );
        return;
      }

      await flushSaveNow();

      const allCloud = await fetchAllCloudRecords();
      const currentKey = `${selectedYear}_${selectedMonth}`;
      if (allCloud[currentKey]) {
        const mergedCurr = mergeMonthlyRecords(latestRecordRef.current, allCloud[currentKey]);
        setCurrentRecord(mergedCurr);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentKey}`, JSON.stringify(mergedCurr));
        } catch {}
      }

      const yearMap: Record<number, MonthlyRecord> = {};
      for (let m = 1; m <= 12; m++) {
        const k = `${selectedYear}_${m}`;
        const localStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}${k}`);
        const localRec = localStr ? (JSON.parse(localStr) as MonthlyRecord) : null;
        if (allCloud[k] && localRec) {
          yearMap[m] = mergeMonthlyRecords(localRec, allCloud[k]);
        } else if (allCloud[k]) {
          yearMap[m] = allCloud[k];
        } else if (localRec && !isRecordEmpty(localRec)) {
          yearMap[m] = localRec;
        }
        if (yearMap[m]) {
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${k}`, JSON.stringify(yearMap[m]));
          } catch {}
        }
      }
      setYearRecords(yearMap);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedTime(timeStr);
      showToast('Sinkronisasi selesai! Seluruh data bulanan telah diperbarui.', 'success');
    } catch (e) {
      console.error(e);
      setSyncStatus('offline');
      showToast('Gagal melakukan sinkronisasi cloud.', 'error');
    }
  };

  // Save hospital configuration locally and to Cloud (Admin only)
  const handleSaveHospital = async (newConfig: HospitalConfig) => {
    if (!isAdmin) return;
    setHospital(newConfig);
    try {
      localStorage.setItem(HOSPITAL_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error(e);
    }

    try {
      await saveHospitalConfigToCloud(newConfig);
      showToast('Data identitas rumah sakit berhasil disinkronkan!');
    } catch (e) {
      console.error('Error saving hospital config to cloud:', e);
      showToast('Data tersimpan di perangkat lokal', 'info');
    }
  };

  // Delete handlers (Admin only)
  const handleDeleteCurrentMonth = async () => {
    if (!isAdmin) return;
    const key = `${STORAGE_KEY_PREFIX}${selectedYear}_${selectedMonth}`;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
    const emptyRecord = createEmptyRecord(selectedMonth, selectedYear, indicators);
    setCurrentRecord(emptyRecord);
    setYearRecords((prev) => {
      const next = { ...prev };
      delete next[selectedMonth];
      return next;
    });

    try {
      await deleteRecordFromCloud(selectedYear, selectedMonth);
      showToast(
        `Data bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} telah dikosongkan.`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Data bulan telah dikosongkan di perangkat lokal.', 'info');
    }
  };

  const handleDeleteAllData = async () => {
    if (!isAdmin) return;
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
    const emptyRecord = createEmptyRecord(selectedMonth, selectedYear, indicators);
    setCurrentRecord(emptyRecord);
    setYearRecords({});

    try {
      await deleteAllRecordsFromCloud();
      showToast('Seluruh data indikator mutu di semua periode berhasil dihapus.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Seluruh data di perangkat lokal berhasil dikosongkan.', 'info');
    }
  };

  // Backup all data to JSON
  const handleBackupData = async () => {
    try {
      let allRecords: Record<string, MonthlyRecord> = {};
      try {
        allRecords = await fetchAllCloudRecords();
      } catch (err) {
        console.warn('Could not fetch cloud records for backup, using local cache:', err);
      }

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

      const currentKey = `${selectedYear}_${selectedMonth}`;
      allRecords[currentKey] = currentRecord;

      const backupPayload = {
        appName: 'Sistem Informasi Indikator Mutu Nasional (INM)',
        exportedAt: new Date().toISOString(),
        hospital,
        indicators,
        records: allRecords,
      };

      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `cadangan_data_inm_${selectedYear}_${new Date().toISOString().slice(0, 10)}.json`
      );
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
      exportToExcel(currentRecord, hospital, yearRecords, indicators);
      showToast('Laporan berhasil diekspor ke format Excel (.xlsx)!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor ke Excel', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(currentRecord, indicators);
      showToast('Laporan berhasil diekspor ke format CSV!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor ke CSV', 'error');
    }
  };

  // Import handler (Admin only)
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.records) {
          for (const [, rec] of Object.entries(parsed.records)) {
            const monthlyRec = rec as MonthlyRecord;
            localStorage.setItem(
              `${STORAGE_KEY_PREFIX}${monthlyRec.year}_${monthlyRec.month}`,
              JSON.stringify(monthlyRec)
            );
            saveRecordToCloud(monthlyRec).catch(console.error);
          }
          if (parsed.hospital) {
            handleSaveHospital(parsed.hospital);
          }
          if (Array.isArray(parsed.indicators) && parsed.indicators.length > 0) {
            handleSaveIndicators(parsed.indicators);
          }
          const currentKey = `${selectedYear}_${selectedMonth}`;
          if (parsed.records[currentKey]) {
            setCurrentRecord(parsed.records[currentKey] as MonthlyRecord);
          }
          showToast(`Berkas cadangan "${file.name}" berhasil dipulihkan!`);
          return;
        }
      }

      const mergedRecord = await parseImportFile(file, currentRecord, indicators);
      handleUpdateRecord(mergedRecord);
      await flushSaveNow(mergedRecord);
      showToast(
        `Data dari file "${file.name}" berhasil diimpor ke bulan ${MONTH_NAMES[selectedMonth - 1]}!`
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal membaca format file yang diunggah.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Copy data from previous month helper (scoped to room if logged in as room, or all units if Admin)
  const handleCopyFromPreviousMonth = async () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevKey = `${STORAGE_KEY_PREFIX}${prevYear}_${prevMonth}`;
    try {
      const prevDataStr = localStorage.getItem(prevKey);
      if (!prevDataStr) {
        showToast(
          `Tidak ditemukan data pada bulan ${MONTH_NAMES[prevMonth - 1]} ${prevYear}.`,
          'info'
        );
        return;
      }
      const prevRecord: MonthlyRecord = JSON.parse(prevDataStr);

      let nextData: MonthlyRecord['data'];
      if (lockedUnit) {
        // Room user: copy ONLY their own room's cells from previous month
        nextData = JSON.parse(JSON.stringify(currentRecord.data || {}));
        for (const indKey in prevRecord.data) {
          const indId = Number(indKey);
          const prevCell = prevRecord.data[indId]?.[lockedUnit];
          if (prevCell) {
            if (!nextData[indId]) nextData[indId] = {};
            nextData[indId][lockedUnit] = { ...prevCell };
          }
        }
      } else {
        // Admin: copy all rooms from previous month
        nextData = JSON.parse(JSON.stringify(prevRecord.data || {}));
      }

      const cloned: MonthlyRecord = {
        month: selectedMonth,
        year: selectedYear,
        data: nextData,
        lastUpdated: new Date().toISOString(),
      };
      handleUpdateRecord(cloned);
      await flushSaveNow(cloned);
      showToast(
        lockedUnit
          ? `Berhasil menyalin data ruang ${currentUser?.roomName} dari ${MONTH_NAMES[prevMonth - 1]} ${prevYear}!`
          : `Berhasil menyalin data semua ruangan dari ${MONTH_NAMES[prevMonth - 1]} ${prevYear}!`
      );
    } catch (e) {
      console.error(e);
      showToast('Gagal menyalin data bulan sebelumnya', 'error');
    }
  };

  // Gate: Render Login Screen when no user session is active
  if (!currentUser) {
    return (
      <>
        {notification && (
          <div className="fixed bottom-5 right-5 left-5 sm:left-auto z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white bg-slate-900 border border-slate-700">
            {notification.type === 'success' && (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {notification.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {notification.type === 'info' && (
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
        <LoginPage hospital={hospital} onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const isCurrentUnitEmpty = isRecordEmpty(currentRecord, lockedUnit);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Toast Notification (Positioned above mobile bottom nav bar) */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white bg-slate-900 border border-slate-700">
          {notification.type === 'success' && (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {notification.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          {notification.type === 'info' && (
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header with Role Identity, Navigation & Period Selector */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        hospital={hospital}
        indicatorsCount={indicators.length}
        onOpenManageIndicators={
          isAdmin
            ? () => setIndicatorModalState({ isOpen: true, mode: 'list', editItem: null })
            : undefined
        }
        onOpenSettings={() => isAdmin && setIsSettingsModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrint={() => handleOpenPrint()}
        onOpenDeleteModal={() => isAdmin && setIsDeleteModalOpen(true)}
        onBackupData={handleBackupData}
        onImportFile={handleImportFile}
        onManualSync={handleManualSync}
        lastSyncedTime={lastSyncedTime}
        isSaved={syncStatus === 'synced'}
        syncStatus={syncStatus}
      />

      {/* Main Content Body */}
      <main className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1">
        {/* Cloud Sync Bar (Desktop & Tablet concise bar) */}
        <div className="hidden sm:flex mb-4 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full h-2.5 w-2.5 shrink-0 ${
                syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
            />
            <span className="font-semibold text-slate-800">Penyimpanan Bulanan Cloud &amp; Lokal:</span>
            <span>
              Semua data inputan tersimpan permanen sesuai bulannya di menu Lembar Kerja &amp; sinkron di HP maupun komputer.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastSyncedTime && (
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                Sinkron: {lastSyncedTime}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 text-emerald-600 ${
                  syncStatus === 'syncing' ? 'animate-spin' : ''
                }`}
              />
              <span>Sinkronkan</span>
            </button>
          </div>
        </div>

        {/* Loading month indicator */}
        {isLoadingMonth && (
          <div className="mb-4 p-3 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
            <span>
              Memuat data bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
            </span>
          </div>
        )}

        {/* Empty month helper */}
        {!isLoadingMonth && isCurrentUnitEmpty && activeTab === 'input' && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold">
                  {isAdmin
                    ? `Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} siap untuk penginputan`
                    : `Data ruang ${currentUser.roomName} bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} belum diisi`}
                </p>
                <p className="text-emerald-800 mt-0.5">
                  Setiap angka yang Anda isi otomatis tersimpan sesuai bulannya di Lembar Kerja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyFromPreviousMonth}
              className="min-h-[42px] sm:min-h-0 w-full sm:w-auto px-3.5 py-2 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl sm:rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Salin dari Bulan Lalu
            </button>
          </div>
        )}

        {/* Tab 1: Lembar Kerja */}
        {activeTab === 'input' && (
          <InputSheet
            currentUser={currentUser}
            record={currentRecord}
            yearRecords={yearRecords}
            onMonthChange={handleMonthChange}
            indicators={indicators}
            onChangeRecord={handleUpdateRecord}
            onSaveNow={flushSaveNow}
            onOpenAddIndicator={
              isAdmin
                ? () => setIndicatorModalState({ isOpen: true, mode: 'add', editItem: null })
                : undefined
            }
            onOpenEditIndicator={
              isAdmin
                ? (ind) => setIndicatorModalState({ isOpen: true, mode: 'edit', editItem: ind })
                : undefined
            }
            onDeleteIndicator={isAdmin ? handleDirectDeleteIndicator : undefined}
            onOpenManageIndicators={
              isAdmin
                ? () => setIndicatorModalState({ isOpen: true, mode: 'list', editItem: null })
                : undefined
            }
            isSaving={syncStatus === 'syncing'}
            lastSyncedTime={lastSyncedTime}
          />
        )}

        {/* Tab 2: Laporan Mutu Nasional */}
        {activeTab === 'report' && (
          <ReportSheet
            record={currentRecord}
            hospital={hospital}
            yearRecords={yearRecords}
            indicators={indicators}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            onPrint={(model, scope) => handleOpenPrint(model, scope)}
            onNavigateToInput={() => setActiveTab('input')}
          />
        )}

        {/* Tab 3: Grafik & Analisis Mutu */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            record={currentRecord}
            yearRecords={yearRecords}
            indicators={indicators}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; {selectedYear} {hospital.name} &bull; Sistem Indikator Nasional Mutu Pelayanan Kesehatan
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Tersimpan Sesuai Bulan &bull; Sinkron Mobile &amp; Desktop</span>
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
        indicators={indicators}
        initialChartModel={printChartModel}
        initialPeriodScope={printPeriodScope}
      />

      {/* Admin-Only Modals */}
      {isAdmin && (
        <>
          <IndicatorManagerModal
            isOpen={indicatorModalState.isOpen}
            onClose={() =>
              setIndicatorModalState((prev) => ({ ...prev, isOpen: false }))
            }
            indicators={indicators}
            onSaveIndicators={handleSaveIndicators}
            initialMode={indicatorModalState.mode}
            initialEditIndicator={indicatorModalState.editItem}
          />

          <HospitalSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            config={hospital}
            onSave={handleSaveHospital}
          />

          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDeleteCurrentMonth={handleDeleteCurrentMonth}
            onDeleteAllData={handleDeleteAllData}
            monthName={MONTH_NAMES[selectedMonth - 1]}
            year={selectedYear}
          />
        </>
      )}
    </div>
  );
}