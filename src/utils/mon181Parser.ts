export interface SlsRowData {
  kodeKab: string;
  namaKab: string;
  kodeKec: string;
  namaKec: string;
  kodeDesa: string;
  namaDesa: string;
  kodeSls: string;
  namaSls: string;
  namaPetugas: string;
  emailPetugas: string;
  noTelpPetugas: string;
  targetAssignment: number;
  open: number;
  draft: number;
  submittedByPpl: number;
  approvedByPml: number;
  rejectedPml: number;
  revokedPml: number;
  submittedByResponden: number;
  editedPml: number;
  rejectedAdm: number;
  realisasi: number;
  progresPercent: number;
}

export interface SummaryPetugas {
  namaPetugas: string;
  emailPetugas: string;
  noTelpPetugas: string;
  totalSls: number;
  targetAssignment: number;
  open: number;
  draft: number;
  submittedByPpl: number;
  approvedByPml: number;
  rejectedPml: number;
  revokedPml: number;
  submittedByResponden: number;
  editedPml: number;
  rejectedAdm: number;
  realisasi: number;
  progresPercent: number;
  slsList: SlsRowData[];
}

export interface Mon181ParsedResult {
  type: 'PPL' | 'PML' | 'UNKNOWN';
  fileName: string;
  totalRows: number;
  totalTarget: number;
  totalRealisasi: number;
  overallProgres: number;
  summaryPetugasList: SummaryPetugas[];
  rawRows: SlsRowData[];
}

const parseNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const cleanString = (val: any): string => {
  if (!val) return '';
  return String(val).trim().replace(/^"|"$/g, '');
};

export function parseMon181CsvContent(content: string, fileName: string = ''): Mon181ParsedResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return {
      type: 'UNKNOWN',
      fileName,
      totalRows: 0,
      totalTarget: 0,
      totalRealisasi: 0,
      overallProgres: 0,
      summaryPetugasList: [],
      rawRows: [],
    };
  }

  // Parse CSV line handling quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cleanString(cur));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cleanString(cur));
    return result;
  };

  const header = parseCsvLine(lines[0]);
  const headerUpper = header.map(h => h.toUpperCase());

  // Determine if file is PPL or PML
  let isPpl = headerUpper.some(h => h.includes('PPL'));
  let isPml = headerUpper.some(h => h.includes('PML')) && !isPpl;

  if (!isPpl && !isPml) {
    if (fileName.toUpperCase().includes('PPL')) isPpl = true;
    if (fileName.toUpperCase().includes('PML')) isPml = true;
  }

  const type: 'PPL' | 'PML' | 'UNKNOWN' = isPpl ? 'PPL' : isPml ? 'PML' : 'UNKNOWN';

  // Find column indices
  const getIdx = (keywords: string[]) => {
    return headerUpper.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxKabCode = getIdx(['KODE KAB']);
  const idxKabName = getIdx(['NAMA KAB']);
  const idxKecCode = getIdx(['KODE KEC']);
  const idxKecName = getIdx(['NAMA KEC']);
  const idxDesaCode = getIdx(['KODE DESA']);
  const idxDesaName = getIdx(['NAMA DESA']);
  const idxSlsCode = getIdx(['KODE SLS']);
  const idxSlsName = getIdx(['NAMA SLS']);
  
  const idxNama = getIdx(isPpl ? ['NAMA PPL', 'PETUGAS'] : ['NAMA PML', 'PETUGAS']);
  const idxEmail = getIdx(isPpl ? ['EMAIL PPL', 'EMAIL'] : ['EMAIL PML', 'EMAIL']);
  const idxTelp = getIdx(isPpl ? ['TELP PPL', 'NO TELP', 'NO HP'] : ['TELP PML', 'NO TELP', 'NO HP']);

  const idxTarget = getIdx(['TARGET ASSIGNMENT', 'TARGET']);
  const idxOpen = getIdx(['OPEN']);
  const idxDraft = getIdx(['DRAFT']);
  const idxSubmittedPpl = getIdx(['SUBMITTED BY PPL', 'SUBMITTED']);
  const idxApprovedPml = getIdx(['APPROVED BY PML', 'APPROVED']);
  const idxRejectedPml = getIdx(['REJECTED PML']);
  const idxRevokedPml = getIdx(['REVOKED PML']);
  const idxSubmittedResponden = getIdx(['SUBMITTED BY RESPONDEN']);
  const idxEditedPml = getIdx(['EDITED PML']);
  const idxRejectedAdm = getIdx(['REJECTED ADM']);
  const idxRealisasi = getIdx(['REALISASI']);

  const rawRows: SlsRowData[] = [];
  const petugasMap: Map<string, SummaryPetugas> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) continue;

    const namaPetugas = (idxNama >= 0 ? cols[idxNama] : '') || 'Tanpa Nama';
    const targetAssignment = parseNumber(idxTarget >= 0 ? cols[idxTarget] : 0);
    const open = parseNumber(idxOpen >= 0 ? cols[idxOpen] : 0);
    const draft = parseNumber(idxDraft >= 0 ? cols[idxDraft] : 0);
    const submittedByPpl = parseNumber(idxSubmittedPpl >= 0 ? cols[idxSubmittedPpl] : 0);
    const approvedByPml = parseNumber(idxApprovedPml >= 0 ? cols[idxApprovedPml] : 0);
    const rejectedPml = parseNumber(idxRejectedPml >= 0 ? cols[idxRejectedPml] : 0);
    const revokedPml = parseNumber(idxRevokedPml >= 0 ? cols[idxRevokedPml] : 0);
    const submittedByResponden = parseNumber(idxSubmittedResponden >= 0 ? cols[idxSubmittedResponden] : 0);
    const editedPml = parseNumber(idxEditedPml >= 0 ? cols[idxEditedPml] : 0);
    const rejectedAdm = parseNumber(idxRejectedAdm >= 0 ? cols[idxRejectedAdm] : 0);
    const realisasi = parseNumber(idxRealisasi >= 0 ? cols[idxRealisasi] : 0);

    const progresPercent = targetAssignment > 0 ? parseFloat(((realisasi / targetAssignment) * 100).toFixed(2)) : 0;

    const row: SlsRowData = {
      kodeKab: idxKabCode >= 0 ? cols[idxKabCode] : '',
      namaKab: idxKabName >= 0 ? cols[idxKabName] : '',
      kodeKec: idxKecCode >= 0 ? cols[idxKecCode] : '',
      namaKec: idxKecName >= 0 ? cols[idxKecName] : '',
      kodeDesa: idxDesaCode >= 0 ? cols[idxDesaCode] : '',
      namaDesa: idxDesaName >= 0 ? cols[idxDesaName] : '',
      kodeSls: idxSlsCode >= 0 ? cols[idxSlsCode] : '',
      namaSls: idxSlsName >= 0 ? cols[idxSlsName] : '',
      namaPetugas,
      emailPetugas: idxEmail >= 0 ? cols[idxEmail] : '',
      noTelpPetugas: idxTelp >= 0 ? cols[idxTelp] : '',
      targetAssignment,
      open,
      draft,
      submittedByPpl,
      approvedByPml,
      rejectedPml,
      revokedPml,
      submittedByResponden,
      editedPml,
      rejectedAdm,
      realisasi,
      progresPercent,
    };

    rawRows.push(row);

    // Aggregate by Petugas
    if (!petugasMap.has(namaPetugas)) {
      petugasMap.set(namaPetugas, {
        namaPetugas,
        emailPetugas: row.emailPetugas,
        noTelpPetugas: row.noTelpPetugas,
        totalSls: 0,
        targetAssignment: 0,
        open: 0,
        draft: 0,
        submittedByPpl: 0,
        approvedByPml: 0,
        rejectedPml: 0,
        revokedPml: 0,
        submittedByResponden: 0,
        editedPml: 0,
        rejectedAdm: 0,
        realisasi: 0,
        progresPercent: 0,
        slsList: [],
      });
    }

    const p = petugasMap.get(namaPetugas)!;
    p.totalSls += 1;
    p.targetAssignment += row.targetAssignment;
    p.open += row.open;
    p.draft += row.draft;
    p.submittedByPpl += row.submittedByPpl;
    p.approvedByPml += row.approvedByPml;
    p.rejectedPml += row.rejectedPml;
    p.revokedPml += row.revokedPml;
    p.submittedByResponden += row.submittedByResponden;
    p.editedPml += row.editedPml;
    p.rejectedAdm += row.rejectedAdm;
    p.realisasi += row.realisasi;
    if (row.emailPetugas && !p.emailPetugas) p.emailPetugas = row.emailPetugas;
    if (row.noTelpPetugas && !p.noTelpPetugas) p.noTelpPetugas = row.noTelpPetugas;
    p.slsList.push(row);
  }

  // Calculate percentages for each petugas
  const summaryPetugasList = Array.from(petugasMap.values()).map(p => {
    p.progresPercent = p.targetAssignment > 0 ? parseFloat(((p.realisasi / p.targetAssignment) * 100).toFixed(2)) : 0;
    return p;
  }).sort((a, b) => b.progresPercent - a.progresPercent);

  const totalTarget = summaryPetugasList.reduce((acc, curr) => acc + curr.targetAssignment, 0);
  const totalRealisasi = summaryPetugasList.reduce((acc, curr) => acc + curr.realisasi, 0);
  const overallProgres = totalTarget > 0 ? parseFloat(((totalRealisasi / totalTarget) * 100).toFixed(2)) : 0;

  return {
    type,
    fileName,
    totalRows: rawRows.length,
    totalTarget,
    totalRealisasi,
    overallProgres,
    summaryPetugasList,
    rawRows,
  };
}
