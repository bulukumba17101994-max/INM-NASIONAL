import * as XLSX from 'xlsx';
import { INDICATORS, MONTH_NAMES, UNITS } from '../data/inmConfig';
import { HospitalConfig, MonthlyRecord } from '../types/inm';
import { computeAnnualSummaries, computeComprehensiveSummaries, computeMonthlySummaries } from './calculations';

/**
 * Exports monthly, quarterly, semester, and annual records into an Excel workbook.
 * Sheet 1: Rekapitulasi Rata-Rata Mutu (Bulan, TW 1-4, Semester 1-2, Tahunan)
 * Sheet 2: Matriks 12 Bulan (Januari s/d Desember)
 * Sheet 3: Rincian Data Per Unit (Matrix 9 units)
 */
export function exportToExcel(
  record: MonthlyRecord,
  hospital: HospitalConfig,
  yearRecords?: Record<number, MonthlyRecord>
) {
  const summaries = computeMonthlySummaries(record);
  const monthName = MONTH_NAMES[record.month - 1];
  const comprehensive = computeComprehensiveSummaries(
    record.year,
    yearRecords || { [record.month]: record }
  );

  const wb = XLSX.utils.book_new();

  // SHEET 1: REKAPITULASI NILAI RATA-RATA MUTU (BULAN, TRIWULAN, SEMESTER & TAHUNAN)
  const avgRows: (string | number)[][] = [
    [hospital.name],
    [hospital.subTitle],
    [`LAPORAN REKAPITULASI NILAI RATA-RATA INDIKATOR NASIONAL MUTU (INM)`],
    [`PERIODE: BULAN ${monthName.toUpperCase()} & REKAPITULASI TAHUN ${record.year}`],
    [],
    [
      'NO.',
      'INDIKATOR NASIONAL MUTU',
      'STANDAR / TARGET',
      `RATA BULAN ${monthName.toUpperCase()} (%)`,
      'TW 1 (JAN-MAR) (%)',
      'TW 2 (APR-JUN) (%)',
      'TW 3 (JUL-SEP) (%)',
      'TW 4 (OKT-DES) (%)',
      'SEMESTER 1 (%)',
      'SEMESTER 2 (%)',
      `RATA TAHUN ${record.year} (%)`,
      'STATUS CAPAIAN TAHUNAN',
    ],
  ];

  comprehensive.indicators.forEach((ind) => {
    const monthlySum = summaries.find((s) => s.id === ind.id);
    const mVal = monthlySum?.avgPercent !== null && monthlySum?.avgPercent !== undefined
      ? Number(monthlySum.avgPercent.toFixed(2))
      : '-';

    const statusAnnual =
      ind.annual.isMet === true
        ? 'TERCAPAI'
        : ind.annual.isMet === false
        ? 'BELUM TERCAPAI'
        : 'BELUM LENGKAP';

    avgRows.push([
      ind.id,
      ind.title,
      ind.targetLabel,
      mVal,
      ind.tw1.percent !== null ? Number(ind.tw1.percent.toFixed(2)) : '-',
      ind.tw2.percent !== null ? Number(ind.tw2.percent.toFixed(2)) : '-',
      ind.tw3.percent !== null ? Number(ind.tw3.percent.toFixed(2)) : '-',
      ind.tw4.percent !== null ? Number(ind.tw4.percent.toFixed(2)) : '-',
      ind.s1.percent !== null ? Number(ind.s1.percent.toFixed(2)) : '-',
      ind.s2.percent !== null ? Number(ind.s2.percent.toFixed(2)) : '-',
      ind.annual.percent !== null ? Number(ind.annual.percent.toFixed(2)) : '-',
      statusAnnual,
    ]);
  });

  const wsAvg = XLSX.utils.aoa_to_sheet(avgRows);
  wsAvg['!cols'] = [
    { wch: 6 },  // NO
    { wch: 45 }, // INDIKATOR
    { wch: 18 }, // STANDAR
    { wch: 22 }, // BULAN
    { wch: 20 }, // TW1
    { wch: 20 }, // TW2
    { wch: 20 }, // TW3
    { wch: 20 }, // TW4
    { wch: 18 }, // S1
    { wch: 18 }, // S2
    { wch: 22 }, // TAHUNAN
    { wch: 22 }, // STATUS
  ];

  XLSX.utils.book_append_sheet(wb, wsAvg, `Rekap_TW_Semester_INM`);

  // SHEET 2: RINCIAN PER UNIT (Lampiran)
  const unitRows: (string | number)[][] = [
    ['LAMPIRAN RINCIAN DATA INDIKATOR MUTU PER UNIT PELAYANAN'],
    [`PERIODE: ${monthName.toUpperCase()} ${record.year}`],
    [],
    ['NO.', 'INDIKATOR', '', 'N/D/%', ...UNITS.map(u => u.code), 'RATA-RATA'],
  ];

  summaries.forEach((summary) => {
    if (summary.type === 'PERCENT_ONLY') {
      unitRows.push([
        summary.id,
        summary.title,
        '',
        '%',
        ...UNITS.map(u => {
          const val = summary.unitValues[u.code]?.percent;
          return val !== null && val !== undefined ? Number(val.toFixed(2)) : '';
        }),
        summary.avgPercent !== null ? Number(summary.avgPercent.toFixed(2)) : ''
      ]);
    } else {
      // N
      unitRows.push([
        summary.id,
        summary.title,
        '',
        'N',
        ...UNITS.map(u => {
          const val = summary.unitValues[u.code]?.numerator;
          return val !== null && val !== undefined ? val : '';
        }),
        summary.avgNumerator !== null ? Number(summary.avgNumerator.toFixed(2)) : ''
      ]);

      // D
      unitRows.push([
        '',
        '',
        '',
        'D',
        ...UNITS.map(u => {
          const val = summary.unitValues[u.code]?.denominator;
          return val !== null && val !== undefined ? val : '';
        }),
        summary.avgDenominator !== null ? Number(summary.avgDenominator.toFixed(2)) : ''
      ]);

      // %
      unitRows.push([
        '',
        '',
        '',
        '%',
        ...UNITS.map(u => {
          const val = summary.unitValues[u.code]?.percent;
          return val !== null && val !== undefined ? Number(val.toFixed(2)) : '';
        }),
        summary.avgPercent !== null ? Number(summary.avgPercent.toFixed(2)) : ''
      ]);
    }
  });

  const wsUnits = XLSX.utils.aoa_to_sheet(unitRows);
  wsUnits['!cols'] = [
    { wch: 6 },
    { wch: 45 },
    { wch: 4 },
    { wch: 6 },
    ...UNITS.map(() => ({ wch: 10 })),
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, wsUnits, `Rincian_Unit_Pelayanan`);

  // SHEET 3: REKAP TAHUNAN 12 BULAN & RATA-RATA TAHUNAN
  const annualRows: (string | number)[][] = [
    [hospital.name],
    [hospital.subTitle],
    [`REKAPITULASI RATA-RATA TAHUNAN INDIKATOR NASIONAL MUTU (INM)`],
    [`TAHUN PELAPORAN: ${record.year}`],
    [],
    [
      'NO.',
      'INDIKATOR NASIONAL MUTU',
      'TARGET',
      ...MONTH_NAMES.map((m) => m.substring(0, 3).toUpperCase()),
      `RATA-RATA PER TAHUN ${record.year} (%)`,
      'STATUS TAHUNAN',
    ],
  ];

  comprehensive.indicators.forEach((annInd) => {
    const monthlyCols = annInd.monthlyPercents.map((pct) =>
      pct !== null && pct !== undefined ? Number(pct.toFixed(2)) : '-'
    );
    const annAvgPct =
      annInd.annual.percent !== null && annInd.annual.percent !== undefined
        ? Number(annInd.annual.percent.toFixed(2))
        : '-';
    const statusAnnual =
      annInd.annual.isMet === true
        ? 'TERCAPAI'
        : annInd.annual.isMet === false
        ? 'BELUM TERCAPAI'
        : 'BELUM ADA DATA';

    annualRows.push([
      annInd.id,
      annInd.title,
      annInd.targetLabel,
      ...monthlyCols,
      annAvgPct,
      statusAnnual,
    ]);
  });

  const wsAnnual = XLSX.utils.aoa_to_sheet(annualRows);
  wsAnnual['!cols'] = [
    { wch: 6 },  // NO
    { wch: 45 }, // INDIKATOR
    { wch: 18 }, // TARGET
    ...MONTH_NAMES.map(() => ({ wch: 10 })), // 12 Months
    { wch: 26 }, // RATA TAHUNAN
    { wch: 18 }, // STATUS
  ];

  XLSX.utils.book_append_sheet(wb, wsAnnual, `Rekap_Tahunan_${record.year}`);

  // Download workbook
  XLSX.writeFile(wb, `Laporan_Mutu_Nasional_${monthName}_dan_Tahunan_${record.year}.xlsx`);
}

/**
 * Exports directly to CSV format matching the exact structure from the user's attachment.
 */
export function exportToCSV(record: MonthlyRecord) {
  const summaries = computeMonthlySummaries(record);

  const lines: string[] = [
    ',,,,,,,,,,,,,',
    'NO.,INDIKATOR,,,IRNA,RAJAL,LAB,RAD,GIZI,IGD,BDRS,OK,FARM,RATA-RATA',
  ];

  summaries.forEach((summary) => {
    if (summary.type === 'PERCENT_ONLY') {
      const vals = UNITS.map(u => {
        const p = summary.unitValues[u.code]?.percent;
        return p !== null && p !== undefined ? p.toFixed(2) : '';
      }).join(',');
      const avg = summary.avgPercent !== null ? summary.avgPercent.toFixed(2) : '';
      lines.push(`${summary.id},"${summary.title}",,%,${vals},${avg}`);
    } else {
      // N
      const nVals = UNITS.map(u => {
        const v = summary.unitValues[u.code]?.numerator;
        return v !== null && v !== undefined ? String(v) : '';
      }).join(',');
      const nAvg = summary.avgNumerator !== null ? summary.avgNumerator.toFixed(2) : '#DIV/0!';
      lines.push(`${summary.id},"${summary.title}",,N,${nVals},${nAvg}`);

      // D
      const dVals = UNITS.map(u => {
        const v = summary.unitValues[u.code]?.denominator;
        return v !== null && v !== undefined ? String(v) : '';
      }).join(',');
      const dAvg = summary.avgDenominator !== null ? summary.avgDenominator.toFixed(2) : '#DIV/0!';
      lines.push(`,,,D,${dVals},${dAvg}`);

      // %
      let hasDiv0 = false;
      const pVals = UNITS.map(u => {
        const n = summary.unitValues[u.code]?.numerator;
        const d = summary.unitValues[u.code]?.denominator;
        if (n !== null && n !== undefined && d !== null && d !== undefined && d > 0) {
          return ((n / d) * 100).toFixed(2);
        }
        hasDiv0 = true;
        return '#DIV/0!';
      }).join(',');
      const pAvg = !hasDiv0 && summary.avgPercent !== null ? summary.avgPercent.toFixed(2) : '#DIV/0!';
      lines.push(`,,,%,${pVals},${pAvg}`);
    }
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Mutu_Nasional_${record.month}_${record.year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses uploaded CSV / Excel file and merges values into target monthly record.
 */
export async function parseImportFile(file: File, baseRecord: MonthlyRecord): Promise<MonthlyRecord> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const updatedData = JSON.parse(JSON.stringify(baseRecord.data));

  // Find header row containing IRNA, RAJAL, etc.
  let headerRowIndex = -1;
  const unitColMap: { [colIdx: number]: string } = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim().toUpperCase();
      const matchUnit = UNITS.find(u => u.code === cellVal);
      if (matchUnit) {
        headerRowIndex = r;
        unitColMap[c] = matchUnit.code;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  if (headerRowIndex === -1) {
    throw new Error('Format file tidak dikenali. Pastikan terdapat kolom unit (IRNA, RAJAL, LAB, dll).');
  }

  // Parse rows following header
  let currentIndicatorId: number | null = null;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const noCell = row[0];
    const indTitleCell = row[1];
    let typeCell = '';

    // Search for N, D, % in cells 2, 3, or 4
    for (let c = 1; c <= 4; c++) {
      const v = String(row[c] || '').trim().toUpperCase();
      if (v === 'N' || v === 'D' || v === '%') {
        typeCell = v;
        break;
      }
    }

    if (noCell && !isNaN(Number(noCell)) && Number(noCell) >= 1 && Number(noCell) <= 13) {
      currentIndicatorId = Number(noCell);
    } else if (indTitleCell) {
      // Try to find indicator matching title
      const found = INDICATORS.find(ind =>
        String(indTitleCell).toLowerCase().includes(ind.code.toLowerCase()) ||
        String(indTitleCell).toLowerCase().includes(ind.title.toLowerCase().substring(0, 10))
      );
      if (found) currentIndicatorId = found.id;
    }

    if (!currentIndicatorId) continue;
    const indId = currentIndicatorId;
    if (!updatedData[indId]) {
      updatedData[indId] = {};
    }

    Object.entries(unitColMap).forEach(([colStr, unitCode]) => {
      const colIdx = Number(colStr);
      const valRaw = row[colIdx];
      const valNum = valRaw !== undefined && valRaw !== '' && !isNaN(Number(valRaw)) ? Number(valRaw) : null;

      if (!updatedData[indId][unitCode]) {
        updatedData[indId][unitCode] = {};
      }

      if (typeCell === 'N') {
        updatedData[indId][unitCode].numerator = valNum;
      } else if (typeCell === 'D') {
        updatedData[indId][unitCode].denominator = valNum;
      } else if (typeCell === '%' && indId === 13) {
        updatedData[indId][unitCode].percent = valNum;
      }
    });
  }

  return {
    ...baseRecord,
    lastUpdated: new Date().toISOString(),
    data: updatedData,
  };
}