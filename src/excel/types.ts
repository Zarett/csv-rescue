export const EXCEL_LIMITS = { bytes: 5 * 1024 * 1024, expanded: 32 * 1024 * 1024, entries: 2048, sheets: 50, rows: 100_000, columns: 256, fields: 200_000, output: 20 * 1024 * 1024 } as const;
export type ValueMode = 'formatted' | 'raw';
export type SheetInfo = { name: string; hidden: boolean };
export type SheetResult = { rows: number; columns: number; preview: string[][]; formulas: number; missingResults: number; errors: number; merges: number; risky: number; changed: number; csv: string; empty: boolean };
export function validateExcelFile(file: Pick<File, 'name' | 'size'>) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error('Choose an XLSX or Excel 97–2003 XLS workbook. Other formats are not supported.');
  if (!file.size) throw new Error('This file is empty. Choose an Excel workbook.');
  if (file.size > EXCEL_LIMITS.bytes) throw new Error('Excel conversion supports workbooks up to 5 MB. No partial CSV was created.');
}
