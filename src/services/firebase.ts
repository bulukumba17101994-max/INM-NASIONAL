import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';
import { HospitalConfig, MonthlyRecord, UnitCode } from '../types/inm';
import { createEmptyRecord } from '../data/inmConfig';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfigRaw) : getApp();

// Target provisioned database ID or default
const databaseId = firebaseConfigRaw.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);

export const RECORD_COLLECTION = 'inm_records';
export const HOSPITAL_COLLECTION = 'hospital_config';
export const HOSPITAL_DOC_ID = 'main';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore cloud connection at startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, RECORD_COLLECTION, 'test_connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
      return false;
    }
    // Not found is normal for test doc; means we connected to Firestore
    return true;
  }
}
testConnection().catch(() => {});

export function getRecordDocId(year: number, month: number): string {
  return `${year}_${month}`;
}

/**
 * Deeply sanitizes a MonthlyRecord before saving to Firestore.
 * Prevents Firestore's "Unsupported field value: undefined" fatal error.
 * Strips NaN, converts numbers cleanly, and enforces schema compliance.
 */
export function sanitizeRecordForCloud(record: MonthlyRecord): Record<string, any> {
  const cleanData: Record<string, Record<string, { numerator: number | null; denominator: number | null; percent: number | null }>> = {};

  if (record.data && typeof record.data === 'object') {
    for (const indKey in record.data) {
      const indId = parseInt(indKey, 10);
      if (isNaN(indId) || indId < 1 || indId > 20) continue;
      const unitMap = record.data[indId];
      if (!unitMap || typeof unitMap !== 'object') continue;

      cleanData[String(indId)] = {};
      for (const unitKey in unitMap) {
        const cell = unitMap[unitKey as UnitCode];
        if (!cell || typeof cell !== 'object') continue;

        const num =
          cell.numerator !== undefined && cell.numerator !== null && !isNaN(Number(cell.numerator)) && isFinite(Number(cell.numerator))
            ? Math.max(0, Math.round(Number(cell.numerator) * 100) / 100)
            : null;

        const den =
          cell.denominator !== undefined && cell.denominator !== null && !isNaN(Number(cell.denominator)) && isFinite(Number(cell.denominator))
            ? Math.max(0, Math.round(Number(cell.denominator) * 100) / 100)
            : null;

        const pct =
          cell.percent !== undefined && cell.percent !== null && !isNaN(Number(cell.percent)) && isFinite(Number(cell.percent))
            ? Math.max(0, Math.min(100, Math.round(Number(cell.percent) * 100) / 100))
            : null;

        cleanData[String(indId)][unitKey] = {
          numerator: num,
          denominator: den,
          percent: pct,
        };
      }
    }
  }

  const payload: Record<string, any> = {
    month: Math.max(1, Math.min(12, Number(record.month) || 1)),
    year: Math.max(2000, Math.min(2100, Number(record.year) || new Date().getFullYear())),
    data: cleanData,
    lastUpdated: record.lastUpdated || new Date().toISOString(),
  };

  if (record.notes && typeof record.notes === 'string' && record.notes.trim() !== '') {
    payload.notes = record.notes.trim();
  }

  return payload;
}

/**
 * Normalizes data retrieved from Firestore back into a robust MonthlyRecord,
 * filling in defaults so components never encounter undefined or missing fields.
 */
export function sanitizeRecordFromCloud(raw: any, fallbackMonth: number, fallbackYear: number): MonthlyRecord {
  if (!raw || typeof raw !== 'object') {
    return createEmptyRecord(fallbackMonth, fallbackYear);
  }

  const month = typeof raw.month === 'number' && raw.month >= 1 && raw.month <= 12 ? raw.month : fallbackMonth;
  const year = typeof raw.year === 'number' && raw.year >= 2000 && raw.year <= 2100 ? raw.year : fallbackYear;
  const rawData = raw.data && typeof raw.data === 'object' ? raw.data : {};
  const normalizedData: MonthlyRecord['data'] = {};

  for (const indKey in rawData) {
    const indId = parseInt(indKey, 10);
    if (isNaN(indId)) continue;
    const unitMap = rawData[indKey];
    if (!unitMap || typeof unitMap !== 'object') continue;

    normalizedData[indId] = {};
    for (const unitCode in unitMap) {
      const cell = unitMap[unitCode];
      if (!cell || typeof cell !== 'object') continue;

      normalizedData[indId][unitCode as UnitCode] = {
        numerator: cell.numerator != null && !isNaN(Number(cell.numerator)) ? Number(cell.numerator) : null,
        denominator: cell.denominator != null && !isNaN(Number(cell.denominator)) ? Number(cell.denominator) : null,
        percent: cell.percent != null && !isNaN(Number(cell.percent)) ? Number(cell.percent) : null,
      };
    }
  }

  return {
    month,
    year,
    data: normalizedData,
    lastUpdated: typeof raw.lastUpdated === 'string' ? raw.lastUpdated : new Date().toISOString(),
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  };
}

/**
 * Cleans HospitalConfig object to ensure safe persistence.
 */
export function sanitizeHospitalConfig(config: HospitalConfig): HospitalConfig {
  return {
    name: (config.name || '').trim() || 'RUMAH SAKIT UMUM DAERAH',
    subTitle: (config.subTitle || '').trim() || 'KOMITE MUTU & KESELAMATAN PASIEN',
    address: (config.address || '').trim(),
    city: (config.city || '').trim(),
    leadQualityName: (config.leadQualityName || '').trim(),
    leadQualityNip: (config.leadQualityNip || '').trim(),
    directorName: (config.directorName || '').trim(),
    directorNip: (config.directorNip || '').trim(),
  };
}

/**
 * Real-time subscription to a specific monthly record from Cloud Firestore.
 * Automatically receives live updates whenever any device alters the data.
 */
export function subscribeToMonthlyRecord(
  year: number,
  month: number,
  onUpdate: (record: MonthlyRecord | null, hasPendingWrites: boolean) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docId = getRecordDocId(year, month);
  const docRef = doc(db, RECORD_COLLECTION, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;
      if (snapshot.exists()) {
        const record = sanitizeRecordFromCloud(snapshot.data(), month, year);
        onUpdate(record, hasPendingWrites);
      } else {
        onUpdate(null, hasPendingWrites);
      }
    },
    (err) => {
      console.error(`Error syncing monthly record ${docId}:`, err);
      if (onError) {
        try {
          handleFirestoreError(err, OperationType.GET, `${RECORD_COLLECTION}/${docId}`);
        } catch (wrapped) {
          onError(wrapped as Error);
        }
      }
    }
  );
}

/**
 * Real-time subscription to all monthly records for a given year in Cloud Firestore.
 */
export function subscribeToYearRecords(
  year: number,
  onUpdate: (records: Record<number, MonthlyRecord>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, RECORD_COLLECTION);
  const q = query(colRef, where('year', '==', year));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: Record<number, MonthlyRecord> = {};
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        const m = Number(raw.month);
        if (m >= 1 && m <= 12) {
          records[m] = sanitizeRecordFromCloud(raw, m, year);
        }
      });
      onUpdate(records);
    },
    (err) => {
      console.warn(`Error syncing year records for ${year}:`, err);
      if (onError) {
        try {
          handleFirestoreError(err, OperationType.LIST, RECORD_COLLECTION);
        } catch (wrapped) {
          onError(wrapped as Error);
        }
      }
    }
  );
}

/**
 * Saves or updates a monthly record in Cloud Firestore atomically.
 * Uses { merge: false } so deleted cells or reset values do not leave orphan keys.
 */
export async function saveRecordToCloud(record: MonthlyRecord): Promise<void> {
  const docId = getRecordDocId(record.year, record.month);
  const docRef = doc(db, RECORD_COLLECTION, docId);
  const payload = sanitizeRecordForCloud(record);

  try {
    await setDoc(docRef, payload, { merge: false });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RECORD_COLLECTION}/${docId}`);
  }
}

/**
 * Deletes a single monthly record from Cloud Firestore.
 */
export async function deleteRecordFromCloud(year: number, month: number): Promise<void> {
  const docId = getRecordDocId(year, month);
  const docRef = doc(db, RECORD_COLLECTION, docId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RECORD_COLLECTION}/${docId}`);
  }
}

/**
 * Deletes all INM records from Cloud Firestore.
 */
export async function deleteAllRecordsFromCloud(): Promise<void> {
  const colRef = collection(db, RECORD_COLLECTION);
  try {
    const snapshot = await getDocs(colRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, RECORD_COLLECTION);
  }
}

/**
 * Real-time subscription to Hospital Configuration in Cloud Firestore.
 */
export function subscribeToHospitalConfig(
  onUpdate: (config: HospitalConfig | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = doc(db, HOSPITAL_COLLECTION, HOSPITAL_DOC_ID);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(sanitizeHospitalConfig(data as HospitalConfig));
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Error syncing hospital config:', err);
      if (onError) {
        try {
          handleFirestoreError(err, OperationType.GET, `${HOSPITAL_COLLECTION}/${HOSPITAL_DOC_ID}`);
        } catch (wrapped) {
          onError(wrapped as Error);
        }
      }
    }
  );
}

/**
 * Saves Hospital Configuration in Cloud Firestore.
 */
export async function saveHospitalConfigToCloud(config: HospitalConfig): Promise<void> {
  const docRef = doc(db, HOSPITAL_COLLECTION, HOSPITAL_DOC_ID);
  const cleanConfig = sanitizeHospitalConfig(config);
  try {
    await setDoc(docRef, cleanConfig, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${HOSPITAL_COLLECTION}/${HOSPITAL_DOC_ID}`);
  }
}

/**
 * Fetches all saved monthly records from Cloud Firestore (for full backups).
 */
export async function fetchAllCloudRecords(): Promise<Record<string, MonthlyRecord>> {
  const colRef = collection(db, RECORD_COLLECTION);
  try {
    const snapshot = await getDocs(colRef);
    const records: Record<string, MonthlyRecord> = {};

    snapshot.forEach((d) => {
      const raw = d.data();
      const m = Number(raw.month) || 1;
      const y = Number(raw.year) || 2025;
      records[d.id] = sanitizeRecordFromCloud(raw, m, y);
    });

    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RECORD_COLLECTION);
  }
}