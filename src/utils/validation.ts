import { INDICATORS, UNITS } from '../data/inmConfig';
import { IndicatorDefinition, IndicatorSummary, MonthlyRecord, ThresholdAlert, UnitCode, ValidationError } from '../types/inm';

/**
 * Validates a single cell's data according to hospital INM rules.
 */
export function validateCell(
  indicator: IndicatorDefinition,
  unitCode: UnitCode,
  num?: number | null,
  den?: number | null,
  pct?: number | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (indicator.type === 'PERCENT_ONLY') {
    if (pct !== null && pct !== undefined) {
      if (isNaN(pct)) {
        errors.push({
          indicatorId: indicator.id,
          indicatorTitle: indicator.title,
          unitCode,
          field: 'percent',
          message: 'Nilai harus berupa angka yang valid.',
          severity: 'error',
        });
      } else if (pct < 0 || pct > 100) {
        errors.push({
          indicatorId: indicator.id,
          indicatorTitle: indicator.title,
          unitCode,
          field: 'percent',
          message: 'Nilai persentase kepuasan harus berada dalam rentang 0% hingga 100%.',
          severity: 'error',
        });
      }
    }
    return errors;
  }

  // N & D validation
  if (num !== null && num !== undefined) {
    if (isNaN(num)) {
      errors.push({
        indicatorId: indicator.id,
        indicatorTitle: indicator.title,
        unitCode,
        field: 'numerator',
        message: 'Numerator (N) harus berupa angka.',
        severity: 'error',
      });
    } else if (num < 0) {
      errors.push({
        indicatorId: indicator.id,
        indicatorTitle: indicator.title,
        unitCode,
        field: 'numerator',
        message: 'Numerator (N) tidak boleh bernilai negatif.',
        severity: 'error',
      });
    }
  }

  if (den !== null && den !== undefined) {
    if (isNaN(den)) {
      errors.push({
        indicatorId: indicator.id,
        indicatorTitle: indicator.title,
        unitCode,
        field: 'denominator',
        message: 'Denominator (D) harus berupa angka.',
        severity: 'error',
      });
    } else if (den < 0) {
      errors.push({
        indicatorId: indicator.id,
        indicatorTitle: indicator.title,
        unitCode,
        field: 'denominator',
        message: 'Denominator (D) tidak boleh bernilai negatif.',
        severity: 'error',
      });
    }
  }

  // Denominator zero division check
  if (num !== null && num !== undefined && num > 0 && den === 0) {
    errors.push({
      indicatorId: indicator.id,
      indicatorTitle: indicator.title,
      unitCode,
      field: 'denominator',
      message: 'Denominator tidak boleh 0 jika Numerator terisi.',
      severity: 'error',
    });
  }

  // Numerator cannot exceed denominator
  if (
    num !== null &&
    num !== undefined &&
    den !== null &&
    den !== undefined &&
    num > den
  ) {
    errors.push({
      indicatorId: indicator.id,
      indicatorTitle: indicator.title,
      unitCode,
      field: 'numerator',
      message: `Numerator (${num}) tidak boleh lebih besar dari Denominator (${den}).`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validates the entire monthly record and aggregates all validation issues.
 */
export function validateMonthlyRecord(
  record: MonthlyRecord,
  indicatorsList: IndicatorDefinition[] = INDICATORS
): ValidationError[] {
  const allErrors: ValidationError[] = [];

  (indicatorsList || INDICATORS).forEach((ind) => {
    const rowData = record.data[ind.id] || {};
    UNITS.forEach((u) => {
      const cell = rowData[u.code];
      const errors = validateCell(
        ind,
        u.code,
        cell?.numerator,
        cell?.denominator,
        cell?.percent
      );
      allErrors.push(...errors);
    });
  });

  return allErrors;
}

/**
 * Detects threshold breaches for all indicators based on national targets.
 */
export function getThresholdAlerts(summaries: IndicatorSummary[]): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = [];

  summaries.forEach((s) => {
    if (s.avgPercent !== null && s.isMetAverage === false) {
      let gap = 0;
      if (s.targetOperator === '<' || s.targetOperator === '<=') {
        gap = s.avgPercent - s.targetValue;
      } else {
        gap = s.targetValue - s.avgPercent;
      }

      const isCritical = gap >= 5 || s.targetValue === 100;
      const severity: 'critical' | 'warning' = isCritical ? 'critical' : 'warning';

      let recommendation = '';
      if (s.id === 1) {
        recommendation = 'Tingkatkan ketersediaan handrub dan lakukan audit kepatuhan cuci tangan 5 momen di unit dengan capaian terendah.';
      } else if (s.id === 2) {
        recommendation = 'Pastikan ketersediaan APD lengkap di setiap shift dan lakukan supervisi rutin oleh Tim PPI.';
      } else if (s.id === 3) {
        recommendation = 'Lakukan re-sosialisasi SOP identifikasi minimal 2 identitas sebelum pemberian obat/tindakan klinis.';
      } else if (s.id === 6) {
        recommendation = 'Evaluasi kesiapan pra-operasi dan penjadwalan kamar operasi bedah sentral (OK).';
      } else if (s.id === 7) {
        recommendation = 'Komunikasikan dengan komite medik terkait kepatuhan jam visite spesialis (06.00 - 14.00).';
      } else {
        recommendation = 'Lakukan peninjauan alur pelayanan dan buat rencana perbaikan terpadu (PDCA).';
      }

      alerts.push({
        indicatorId: s.id,
        indicatorTitle: s.title,
        targetLabel: s.targetLabel,
        targetValue: s.targetValue,
        currentValue: s.avgPercent,
        gap: Math.abs(gap),
        severity,
        message: `Rata-rata capaian RS (${s.avgPercent.toFixed(2)}%) berada di bawah target nasional (${s.targetLabel}) dengan gap selisih ${Math.abs(gap).toFixed(2)}%.`,
        recommendation,
      });
    }
  });

  return alerts;
}