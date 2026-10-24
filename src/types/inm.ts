export type UnitCode = 'IRNA' | 'RAJAL' | 'LAB' | 'RAD' | 'GIZI' | 'IGD' | 'BDRS' | 'OK' | 'FARM';

export type UserRole = 'ADMIN' | UnitCode;

export interface UserAccount {
  id: string;
  role: UserRole;
  unitCode: UnitCode | null; // null for ADMIN, specific UnitCode for room accounts
  roomName: string;
  fullName: string;
  username: string;
  password: string;
  aliases: string[];
}

export interface UnitInfo {
  code: UnitCode;
  name: string;
  fullName: string;
  description: string;
}

export type IndicatorType = 'N_D' | 'PERCENT_ONLY';

export interface IndicatorDefinition {
  id: number;
  code: string;
  title: string;
  targetLabel: string;
  targetValue: number;
  targetOperator: '>=' | '>' | '<=' | '<' | '=';
  type: IndicatorType;
  numeratorLabel?: string;
  denominatorLabel?: string;
  relevantUnits?: UnitCode[]; // if undefined, applies to all
  description: string;
  standardReference: string;
}

export interface UnitCellData {
  numerator?: number | null;
  denominator?: number | null;
  percent?: number | null; // for PERCENT_ONLY or cached
}

export type IndicatorRowData = {
  [key in UnitCode]?: UnitCellData;
};

export interface MonthlyRecord {
  month: number; // 1-12
  year: number;
  data: {
    [indicatorId: number]: IndicatorRowData;
  };
  notes?: string;
  lastUpdated?: string;
}

export interface IndicatorSummary {
  id: number;
  title: string;
  targetLabel: string;
  targetValue: number;
  targetOperator: string;
  type: IndicatorType;
  unitValues: {
    [key in UnitCode]?: {
      numerator: number | null;
      denominator: number | null;
      percent: number | null;
      isMet: boolean | null;
    };
  };
  avgNumerator: number | null;
  avgDenominator: number | null;
  avgPercent: number | null;
  aggregatePercent: number | null;
  isMetAverage: boolean | null;
  activeUnitCount: number;
}

export interface HospitalConfig {
  name: string;
  subTitle: string;
  address: string;
  city: string;
  leadQualityName: string;
  leadQualityNip: string;
  directorName: string;
  directorNip: string;
}

export interface ValidationError {
  indicatorId: number;
  indicatorTitle: string;
  unitCode: UnitCode;
  field: 'numerator' | 'denominator' | 'percent';
  message: string;
  severity: 'error' | 'warning';
}

export interface ThresholdAlert {
  indicatorId: number;
  indicatorTitle: string;
  targetLabel: string;
  targetValue: number;
  currentValue: number;
  gap: number;
  severity: 'critical' | 'warning';
  message: string;
  recommendation: string;
}

export interface AnnualIndicatorSummary {
  id: number;
  title: string;
  code: string;
  targetLabel: string;
  targetValue: number;
  targetOperator: string;
  type: IndicatorType;
  monthlyPercents: (number | null)[]; // Index 0 = Jan, ..., 11 = Dec
  activeMonthsCount: number;
  annualAvgPercent: number | null;
  annualAvgNumerator: number | null;
  annualAvgDenominator: number | null;
  isMetAnnual: boolean | null;
  bestMonth?: { month: number; percent: number } | null;
  lowestMonth?: { month: number; percent: number } | null;
}

export interface AnnualReportSummary {
  year: number;
  indicators: AnnualIndicatorSummary[];
  overallAnnualComplianceRate: number;
  totalMet: number;
  totalNotMet: number;
  totalWithData: number;
}

export interface PeriodSummary {
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  isMet: boolean | null;
  activeMonthsCount: number;
}

export interface ComprehensiveIndicatorSummary {
  id: number;
  title: string;
  code: string;
  targetLabel: string;
  targetValue: number;
  targetOperator: string;
  type: IndicatorType;
  monthlyPercents: (number | null)[]; // 12 months
  // Triwulan (Quarters)
  tw1: PeriodSummary; // Jan - Mar
  tw2: PeriodSummary; // Apr - Jun
  tw3: PeriodSummary; // Jul - Sep
  tw4: PeriodSummary; // Okt - Des
  // Semester
  s1: PeriodSummary; // Semester 1 (Jan - Jun)
  s2: PeriodSummary; // Semester 2 (Jul - Des)
  // Tahunan (Annual)
  annual: PeriodSummary; // Jan - Des
  bestMonth?: { month: number; percent: number } | null;
  lowestMonth?: { month: number; percent: number } | null;
}

export interface ComprehensiveReportSummary {
  year: number;
  indicators: ComprehensiveIndicatorSummary[];
  overallAnnualComplianceRate: number;
  overallTwComplianceRates: {
    tw1: number;
    tw2: number;
    tw3: number;
    tw4: number;
  };
  overallSemesterComplianceRates: {
    s1: number;
    s2: number;
  };
  totalMetAnnual: number;
  totalNotMetAnnual: number;
  totalWithDataAnnual: number;
}