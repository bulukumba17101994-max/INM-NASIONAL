import { INDICATORS, UNITS } from '../data/inmConfig';
import {
  AnnualIndicatorSummary,
  AnnualReportSummary,
  ComprehensiveIndicatorSummary,
  ComprehensiveReportSummary,
  PeriodSummary,
  IndicatorDefinition,
  IndicatorRowData,
  IndicatorSummary,
  MonthlyRecord,
  UnitCode
} from '../types/inm';

export function calculatePercent(numerator?: number | null, denominator?: number | null): number | null {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return null;
  }
  if (denominator <= 0) {
    return null; // Equivalent to #DIV/0! in Excel
  }
  return (numerator / denominator) * 100;
}

export function isTargetMet(value: number | null, operator: string, target: number): boolean | null {
  if (value === null || isNaN(value)) return null;

  const roundedVal = Math.round(value * 100) / 100;
  const roundedTarget = Math.round(target * 100) / 100;

  switch (operator) {
    case '>=':
      return roundedVal >= roundedTarget;
    case '>':
      return roundedVal > roundedTarget;
    case '<=':
      return roundedVal <= roundedTarget;
    case '<':
      return roundedVal < roundedTarget;
    case '=':
      return Math.abs(roundedVal - roundedTarget) < 0.01;
    default:
      return roundedVal >= roundedTarget;
  }
}

export function formatNumber(val?: number | null, decimals = 2, emptyPlaceholder = '-'): string {
  if (val === null || val === undefined || isNaN(val)) {
    return emptyPlaceholder;
  }
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(val?: number | null, decimals = 2, emptyPlaceholder = '-'): string {
  if (val === null || val === undefined || isNaN(val)) {
    return emptyPlaceholder;
  }
  return `${val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Returns exact cell value as rendered in Excel template (e.g. "91.94" or "#DIV/0!")
 */
export function getExcelCellDisplay(
  num?: number | null,
  den?: number | null,
  decimals = 2
): string {
  if (num === null || num === undefined || den === null || den === undefined || den === 0) {
    return '#DIV/0!';
  }
  const pct = (num / den) * 100;
  return pct.toFixed(decimals);
}

export function computeIndicatorSummary(
  indicator: IndicatorDefinition,
  rowData?: IndicatorRowData
): IndicatorSummary {
  const unitValues: IndicatorSummary['unitValues'] = {};
  let sumN = 0;
  let countN = 0;
  let sumD = 0;
  let countD = 0;
  let sumPct = 0;
  let countPct = 0;

  UNITS.forEach((u) => {
    const cell = rowData?.[u.code];
    let num: number | null = null;
    let den: number | null = null;
    let pct: number | null = null;

    if (indicator.type === 'PERCENT_ONLY') {
      if (cell?.percent !== undefined && cell?.percent !== null && !isNaN(cell.percent)) {
        pct = Number(cell.percent);
        sumPct += pct;
        countPct++;
      }
    } else {
      if (cell?.numerator !== undefined && cell?.numerator !== null && !isNaN(cell.numerator)) {
        num = Number(cell.numerator);
        sumN += num;
        countN++;
      }
      if (cell?.denominator !== undefined && cell?.denominator !== null && !isNaN(cell.denominator)) {
        den = Number(cell.denominator);
        sumD += den;
        countD++;
      }
      if (num !== null && den !== null && den > 0) {
        pct = (num / den) * 100;
        sumPct += pct;
        countPct++;
      }
    }

    const met = pct !== null ? isTargetMet(pct, indicator.targetOperator, indicator.targetValue) : null;

    unitValues[u.code] = {
      numerator: num,
      denominator: den,
      percent: pct,
      isMet: met,
    };
  });

  const avgNumerator = countN > 0 ? sumN / countN : null;
  const avgDenominator = countD > 0 ? sumD / countD : null;
  const avgPercent = countPct > 0 ? sumPct / countPct : null;
  const aggregatePercent = sumD > 0 ? (sumN / sumD) * 100 : null;

  const isMetAverage =
    avgPercent !== null
      ? isTargetMet(avgPercent, indicator.targetOperator, indicator.targetValue)
      : null;

  return {
    id: indicator.id,
    title: indicator.title,
    targetLabel: indicator.targetLabel,
    targetValue: indicator.targetValue,
    targetOperator: indicator.targetOperator,
    type: indicator.type,
    unitValues,
    avgNumerator,
    avgDenominator,
    avgPercent,
    aggregatePercent,
    isMetAverage,
    activeUnitCount: countPct,
  };
}

export function computeMonthlySummaries(record: MonthlyRecord): IndicatorSummary[] {
  return INDICATORS.map((ind) => computeIndicatorSummary(ind, record.data[ind.id]));
}

export function computeOverallStats(summaries: IndicatorSummary[]) {
  let totalWithData = 0;
  let totalMet = 0;
  let totalNotMet = 0;

  summaries.forEach((s) => {
    if (s.avgPercent !== null) {
      totalWithData++;
      if (s.isMetAverage) {
        totalMet++;
      } else {
        totalNotMet++;
      }
    }
  });

  const complianceRate = totalWithData > 0 ? (totalMet / totalWithData) * 100 : 0;

  return {
    totalIndicators: summaries.length,
    totalWithData,
    totalMet,
    totalNotMet,
    complianceRate,
  };
}

/**
 * Computes the Annual Average (Rata-Rata Tahunan) for each of the 13 indicators
 * across all 12 months for a specified year.
 */
export function computeAnnualSummaries(
  year: number,
  recordsByMonth: Record<number, MonthlyRecord>
): AnnualReportSummary {
  let totalMet = 0;
  let totalNotMet = 0;
  let totalWithData = 0;

  const indicators: AnnualIndicatorSummary[] = INDICATORS.map((ind) => {
    const monthlyPercents: (number | null)[] = [];
    let sumMonthlyPct = 0;
    let activeMonthsCount = 0;

    let sumMonthlyNum = 0;
    let countNum = 0;
    let sumMonthlyDen = 0;
    let countDen = 0;

    let bestMonth: { month: number; percent: number } | null = null;
    let lowestMonth: { month: number; percent: number } | null = null;

    for (let m = 1; m <= 12; m++) {
      const record = recordsByMonth[m];
      if (record && record.data && record.data[ind.id]) {
        const summary = computeIndicatorSummary(ind, record.data[ind.id]);
        const pct = summary.avgPercent;
        monthlyPercents.push(pct);

        if (pct !== null) {
          sumMonthlyPct += pct;
          activeMonthsCount++;

          if (bestMonth === null || pct > bestMonth.percent) {
            bestMonth = { month: m, percent: pct };
          }
          if (lowestMonth === null || pct < lowestMonth.percent) {
            lowestMonth = { month: m, percent: pct };
          }
        }

        if (summary.avgNumerator !== null) {
          sumMonthlyNum += summary.avgNumerator;
          countNum++;
        }
        if (summary.avgDenominator !== null) {
          sumMonthlyDen += summary.avgDenominator;
          countDen++;
        }
      } else {
        monthlyPercents.push(null);
      }
    }

    const annualAvgPercent = activeMonthsCount > 0 ? sumMonthlyPct / activeMonthsCount : null;
    const annualAvgNumerator = countNum > 0 ? sumMonthlyNum / countNum : null;
    const annualAvgDenominator = countDen > 0 ? sumMonthlyDen / countDen : null;

    const isMetAnnual =
      annualAvgPercent !== null
        ? isTargetMet(annualAvgPercent, ind.targetOperator, ind.targetValue)
        : null;

    if (annualAvgPercent !== null) {
      totalWithData++;
      if (isMetAnnual === true) {
        totalMet++;
      } else if (isMetAnnual === false) {
        totalNotMet++;
      }
    }

    return {
      id: ind.id,
      title: ind.title,
      code: ind.code,
      targetLabel: ind.targetLabel,
      targetValue: ind.targetValue,
      targetOperator: ind.targetOperator,
      type: ind.type,
      monthlyPercents,
      activeMonthsCount,
      annualAvgPercent,
      annualAvgNumerator,
      annualAvgDenominator,
      isMetAnnual,
      bestMonth,
      lowestMonth,
    };
  });

  const overallAnnualComplianceRate =
    totalWithData > 0 ? (totalMet / totalWithData) * 100 : 0;

  return {
    year,
    indicators,
    overallAnnualComplianceRate,
    totalMet,
    totalNotMet,
    totalWithData,
  };
}

/**
 * Computes average summary (N, D, %) for a custom set of months (e.g. Triwulan or Semester).
 */
export function computePeriodSummary(
  ind: IndicatorDefinition,
  months: number[],
  recordsByMonth: Record<number, MonthlyRecord>
): PeriodSummary {
  let sumPct = 0;
  let countPct = 0;
  let sumNum = 0;
  let countNum = 0;
  let sumDen = 0;
  let countDen = 0;

  for (const m of months) {
    const record = recordsByMonth[m];
    if (record && record.data && record.data[ind.id]) {
      const summary = computeIndicatorSummary(ind, record.data[ind.id]);
      if (summary.avgPercent !== null) {
        sumPct += summary.avgPercent;
        countPct++;
      }
      if (summary.avgNumerator !== null) {
        sumNum += summary.avgNumerator;
        countNum++;
      }
      if (summary.avgDenominator !== null) {
        sumDen += summary.avgDenominator;
        countDen++;
      }
    }
  }

  const percent = countPct > 0 ? sumPct / countPct : null;
  const numerator = countNum > 0 ? sumNum / countNum : null;
  const denominator = countDen > 0 ? sumDen / countDen : null;
  const isMet = percent !== null ? isTargetMet(percent, ind.targetOperator, ind.targetValue) : null;

  return {
    numerator,
    denominator,
    percent,
    isMet,
    activeMonthsCount: countPct,
  };
}

/**
 * Computes Comprehensive Summaries across Monthly, Triwulan (TW 1-4),
 * Semester (S 1-2), and Tahunan (Annual) for all 13 indicators.
 */
export function computeComprehensiveSummaries(
  year: number,
  recordsByMonth: Record<number, MonthlyRecord>
): ComprehensiveReportSummary {
  let totalMetAnnual = 0;
  let totalNotMetAnnual = 0;
  let totalWithDataAnnual = 0;

  let totalMetTw1 = 0, totalWithDataTw1 = 0;
  let totalMetTw2 = 0, totalWithDataTw2 = 0;
  let totalMetTw3 = 0, totalWithDataTw3 = 0;
  let totalMetTw4 = 0, totalWithDataTw4 = 0;

  let totalMetS1 = 0, totalWithDataS1 = 0;
  let totalMetS2 = 0, totalWithDataS2 = 0;

  const indicators: ComprehensiveIndicatorSummary[] = INDICATORS.map((ind) => {
    const monthlyPercents: (number | null)[] = [];
    let bestMonth: { month: number; percent: number } | null = null;
    let lowestMonth: { month: number; percent: number } | null = null;

    for (let m = 1; m <= 12; m++) {
      const record = recordsByMonth[m];
      if (record && record.data && record.data[ind.id]) {
        const summary = computeIndicatorSummary(ind, record.data[ind.id]);
        const pct = summary.avgPercent;
        monthlyPercents.push(pct);
        if (pct !== null) {
          if (bestMonth === null || pct > bestMonth.percent) {
            bestMonth = { month: m, percent: pct };
          }
          if (lowestMonth === null || pct < lowestMonth.percent) {
            lowestMonth = { month: m, percent: pct };
          }
        }
      } else {
        monthlyPercents.push(null);
      }
    }

    const tw1 = computePeriodSummary(ind, [1, 2, 3], recordsByMonth);
    const tw2 = computePeriodSummary(ind, [4, 5, 6], recordsByMonth);
    const tw3 = computePeriodSummary(ind, [7, 8, 9], recordsByMonth);
    const tw4 = computePeriodSummary(ind, [10, 11, 12], recordsByMonth);

    const s1 = computePeriodSummary(ind, [1, 2, 3, 4, 5, 6], recordsByMonth);
    const s2 = computePeriodSummary(ind, [7, 8, 9, 10, 11, 12], recordsByMonth);

    const annual = computePeriodSummary(ind, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], recordsByMonth);

    if (annual.percent !== null) {
      totalWithDataAnnual++;
      if (annual.isMet) totalMetAnnual++;
      else totalNotMetAnnual++;
    }

    if (tw1.percent !== null) {
      totalWithDataTw1++;
      if (tw1.isMet) totalMetTw1++;
    }
    if (tw2.percent !== null) {
      totalWithDataTw2++;
      if (tw2.isMet) totalMetTw2++;
    }
    if (tw3.percent !== null) {
      totalWithDataTw3++;
      if (tw3.isMet) totalMetTw3++;
    }
    if (tw4.percent !== null) {
      totalWithDataTw4++;
      if (tw4.isMet) totalMetTw4++;
    }

    if (s1.percent !== null) {
      totalWithDataS1++;
      if (s1.isMet) totalMetS1++;
    }
    if (s2.percent !== null) {
      totalWithDataS2++;
      if (s2.isMet) totalMetS2++;
    }

    return {
      id: ind.id,
      title: ind.title,
      code: ind.code,
      targetLabel: ind.targetLabel,
      targetValue: ind.targetValue,
      targetOperator: ind.targetOperator,
      type: ind.type,
      monthlyPercents,
      tw1,
      tw2,
      tw3,
      tw4,
      s1,
      s2,
      annual,
      bestMonth,
      lowestMonth,
    };
  });

  const overallAnnualComplianceRate = totalWithDataAnnual > 0 ? (totalMetAnnual / totalWithDataAnnual) * 100 : 0;

  return {
    year,
    indicators,
    overallAnnualComplianceRate,
    overallTwComplianceRates: {
      tw1: totalWithDataTw1 > 0 ? (totalMetTw1 / totalWithDataTw1) * 100 : 0,
      tw2: totalWithDataTw2 > 0 ? (totalMetTw2 / totalWithDataTw2) * 100 : 0,
      tw3: totalWithDataTw3 > 0 ? (totalMetTw3 / totalWithDataTw3) * 100 : 0,
      tw4: totalWithDataTw4 > 0 ? (totalMetTw4 / totalWithDataTw4) * 100 : 0,
    },
    overallSemesterComplianceRates: {
      s1: totalWithDataS1 > 0 ? (totalMetS1 / totalWithDataS1) * 100 : 0,
      s2: totalWithDataS2 > 0 ? (totalMetS2 / totalWithDataS2) * 100 : 0,
    },
    totalMetAnnual,
    totalNotMetAnnual,
    totalWithDataAnnual,
  };
}