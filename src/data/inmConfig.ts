import { HospitalConfig, IndicatorDefinition, MonthlyRecord, UnitInfo } from '../types/inm';

export const UNITS: UnitInfo[] = [
  { code: 'IRNA', name: 'Rawat Inap', fullName: 'Instalasi Rawat Inap (IRNA)', description: 'Pelayanan perawatan pasien rawat inap' },
  { code: 'RAJAL', name: 'Rawat Jalan', fullName: 'Instalasi Rawat Jalan (Poliklinik)', description: 'Pelayanan poliklinik dan konsultasi spesialis' },
  { code: 'LAB', name: 'Laboratorium', fullName: 'Instalasi Laboratorium Patologi', description: 'Pemeriksaan darah, urine, kimia klinik & patologi' },
  { code: 'RAD', name: 'Radiologi', fullName: 'Instalasi Radiologi', description: 'Pelayanan rontgen, USG, CT-scan, dan imaging' },
  { code: 'GIZI', name: 'Gizi', fullName: 'Instalasi Gizi & Dietetik', description: 'Pelayanan gizi rawat inap dan konsultasi gizi' },
  { code: 'IGD', name: 'IGD', fullName: 'Instalasi Gawat Darurat (IGD)', description: 'Pelayanan penanganan kegawatdaruratan 24 jam' },
  { code: 'BDRS', name: 'BDRS', fullName: 'Bank Darah Rumah Sakit (BDRS)', description: 'Penyediaan dan pengelolaan transfusi darah' },
  { code: 'OK', name: 'Kamar Operasi', fullName: 'Instalasi Bedah Sentral (OK)', description: 'Tindakan operasi bedah elektif dan cito/emergency' },
  { code: 'FARM', name: 'Farmasi', fullName: 'Instalasi Farmasi RS', description: 'Pengelolaan obat, formularium, dan dispensing resep' },
];

export const INDICATORS: IndicatorDefinition[] = [
  {
    id: 1,
    code: 'INM-01',
    title: 'Kepatuhan Kebersihan Tangan (>= 85%)',
    targetLabel: '≥ 85%',
    targetValue: 85,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Jumlah tindakan kebersihan tangan yang dilakukan',
    denominatorLabel: 'Jumlah total peluang kebersihan tangan yang diamati',
    description: 'Kepatuhan petugas kesehatan dalam melakukan cuci tangan sesuai 5 momen WHO dengan 6 langkah standar.',
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 2,
    code: 'INM-02',
    title: 'Kepatuhan Alat Pelindung Diri (100%)',
    targetLabel: '100%',
    targetValue: 100,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Petugas patuh APD lengkap sesuai indikasi',
    denominatorLabel: 'Total petugas yang diobservasi dalam tindakan',
    description: 'Kepatuhan penggunaan APD yang tepat sesuai dengan tingkat risiko paparan bahaya dan transmisi infeksi.',
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 3,
    code: 'INM-03',
    title: 'Kepatuhan Identifikasi Pasien (100%)',
    targetLabel: '100%',
    targetValue: 100,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Proses identifikasi benar minimal 2 identitas',
    denominatorLabel: 'Total kesempatan proses identifikasi pasien diamati',
    description: 'Proses identifikasi pasien secara konsisten menggunakan minimal 2 identitas (nama lengkap & tanggal lahir/no RM) sebelum tindakan, obat, atau pengambilan sampel.',
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 4,
    code: 'INM-04',
    title: 'Waktu Tanggap SC Emergency (> 80 %)',
    targetLabel: '> 80%',
    targetValue: 80,
    targetOperator: '>',
    type: 'N_D',
    numeratorLabel: 'SC emergency kategori 1 terlaksana ≤ 30 menit',
    denominatorLabel: 'Total keputusan SC emergency kategori 1',
    description: 'Waktu sejak diputuskan tindakan SC emergency kategori 1 sampai dimulainya insisi bedah (decision to delivery ≤ 30 menit).',
    relevantUnits: ['OK', 'IGD', 'IRNA'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 5,
    code: 'INM-05',
    title: 'Waktu Tunggu Rawat Jalan ( < = 80%)',
    targetLabel: '≤ 80%',
    targetValue: 80,
    targetOperator: '<=',
    type: 'N_D',
    numeratorLabel: 'Pasien rawat jalan dengan waktu tunggu ≤ 60 menit',
    denominatorLabel: 'Total sampel pasien rawat jalan yang disurvei',
    description: 'Waktu tunggu pasien sejak mendaftar di loket sampai diperiksa dokter spesialis di poliklinik.',
    relevantUnits: ['RAJAL'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 6,
    code: 'INM-06',
    title: 'Penundaan Operasi Elektif (< 5 %)',
    targetLabel: '< 5%',
    targetValue: 5,
    targetOperator: '<',
    type: 'N_D',
    numeratorLabel: 'Operasi elektif tertunda > 1 jam dari jadwal',
    denominatorLabel: 'Total seluruh operasi elektif yang terjadwal',
    description: 'Perubahan jadwal operasi yang tertunda lebih dari 1 jam dari waktu rencana operasi elektif yang telah disepakati.',
    relevantUnits: ['OK'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 7,
    code: 'INM-07',
    title: 'Kepatuhan Waktu Visite Dokter ( > = 80%)',
    targetLabel: '≥ 80%',
    targetValue: 80,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Pasien rawat inap divisite jam 06.00 - 14.00',
    denominatorLabel: 'Total sampel pasien rawat inap yang diobservasi',
    description: 'Kepatuhan dokter penanggung jawab pelayanan (DPJP) melakukan visitasi pasien rawat inap pada jam reguler.',
    relevantUnits: ['IRNA'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 8,
    code: 'INM-08',
    title: 'Pelaporan Hasil Kritis Laboratorium ( 100% )',
    targetLabel: '100%',
    targetValue: 100,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Hasil kritis dilaporkan ≤ 30 menit ke DPJP/ruangan',
    denominatorLabel: 'Total hasil pemeriksaan kritis yang teridentifikasi',
    description: 'Kecepatan pelaporan nilai kritis laboratorium yang mengancam jiwa kepada dokter atau perawat ruangan.',
    relevantUnits: ['LAB'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 9,
    code: 'INM-09',
    title: 'Kepatuhan Penggunaan Fornas/Formularium RS (> = 80%)',
    targetLabel: '≥ 80%',
    targetValue: 80,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Lembar resep yang sesuai Formularium Nasional / RS',
    denominatorLabel: 'Total seluruh sampel lembar resep yang dievaluasi',
    description: 'Peresepan obat oleh dokter yang mengacu pada Formularium Nasional (Fornas) dan Formularium Rumah Sakit.',
    relevantUnits: ['FARM', 'RAJAL', 'IRNA'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 10,
    code: 'INM-10',
    title: 'Kepatuhan Terhadap Clinical Pathway (100%)',
    targetLabel: '100%',
    targetValue: 100,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Pasien 5 penyakit terpilih patuh alur clinical pathway',
    denominatorLabel: 'Total pasien kasus 5 penyakit terpilih yang dirawat',
    description: 'Kepatuhan pemberian asuhan medis multidisiplin terintegrasi sesuai alur klinis (clinical pathway) yang telah ditetapkan.',
    relevantUnits: ['IRNA', 'OK'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 11,
    code: 'INM-11',
    title: 'Kepatuhan Upaya Pencegahan Resiko Pasien Jatuh (100%)',
    targetLabel: '100%',
    targetValue: 100,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Pasien risiko jatuh yang diintervensi pencegahan lengkap',
    denominatorLabel: 'Total pasien rawat inap yang berisiko jatuh',
    description: 'Penerapan intervensi keselamatan pencegahan jatuh (penanda segitiga kuning/kancing kuning, pengaman tempat tidur, edukasi).',
    relevantUnits: ['IRNA', 'IGD', 'RAJAL'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 12,
    code: 'INM-12',
    title: 'Kecepatan Waktu Tanggap Terhadap Komplain (> = 80%)',
    targetLabel: '≥ 80%',
    targetValue: 80,
    targetOperator: '>=',
    type: 'N_D',
    numeratorLabel: 'Komplain ditanggapi sesuai standar batas waktu (merah/kuning/hijau)',
    denominatorLabel: 'Total seluruh komplain masyarakat/pasien yang diterima',
    description: 'Kecepatan tindak lanjut komplain pasien sesuai grading: Merah ≤ 1x24 jam, Kuning ≤ 3x24 jam, Hijau ≤ 7x24 jam.',
    relevantUnits: ['IRNA', 'RAJAL', 'IGD', 'FARM', 'LAB', 'RAD', 'GIZI', 'OK', 'BDRS'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  },
  {
    id: 13,
    code: 'INM-13',
    title: 'Kepuasan pasien (≥ 76,61%)',
    targetLabel: '≥ 76,61%',
    targetValue: 76.61,
    targetOperator: '>=',
    type: 'PERCENT_ONLY',
    description: 'Tingkat kepuasan pasien terhadap mutu pelayanan kesehatan berdasarkan survei indeks kepuasan masyarakat (IKM).',
    relevantUnits: ['IRNA', 'RAJAL', 'IGD', 'FARM', 'LAB', 'RAD', 'GIZI'],
    standardReference: 'Permenkes No. 30 Tahun 2022'
  }
];

export const DEFAULT_HOSPITAL_CONFIG: HospitalConfig = {
  name: 'RUMAH SAKIT UMUM DAERAH',
  subTitle: 'KOMITE MUTU DAN KESELAMATAN PASIEN',
  address: 'Jl. Kesehatan No. 10, Kompleks RS Medika',
  city: 'Jakarta',
  leadQualityName: 'dr. Hj. Siti Rahmawati, Sp.PK, MARS',
  leadQualityNip: '19780512 200501 2 004',
  directorName: 'dr. H. Bambang Setiawan, Sp.B, FInaCS',
  directorNip: '19700315 199803 1 002'
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Creates a clean, empty record for a given month and year.
 * No sample data - purely for live, permanent operational hospital data.
 */
export function createEmptyRecord(month: number, year: number): MonthlyRecord {
  const emptyData: MonthlyRecord['data'] = {};
  INDICATORS.forEach((ind) => {
    emptyData[ind.id] = {};
  });

  return {
    month,
    year,
    lastUpdated: new Date().toISOString(),
    data: emptyData,
  };
}

export const INITIAL_SAMPLE_RECORD: MonthlyRecord = createEmptyRecord(1, 2025);