/**
 * Export utilities — shared CSV/Excel helpers.
 * Import from here; do not re-implement export logic in individual pages.
 */

import * as XLSX from 'xlsx';
import { Prospect } from '../types';

/** Format a date string for display in exports (or empty string). */
const formatTS = (val: unknown): string => {
  if (!val) return '';
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

/**
 * Export a list of prospects to an .xlsx file and trigger a browser download.
 * @param prospects  The array of prospects to export.
 * @param filename   Optional filename override (defaults to a dated VistaQ_ name).
 */
export const exportProspectsToExcel = (prospects: Prospect[], filename?: string): void => {
  const rows = prospects.map(p => {
    let outcomeLabel = 'Ongoing';
    if (p.sales_outcome === 'successful') outcomeLabel = 'Won';
    else if (p.sales_outcome === 'unsuccessful') outcomeLabel = 'Lost';
    else if (p.sales_outcome === 'kiv') outcomeLabel = 'KIV';

    const totalAce =
      p.sales_outcome === 'successful'
        ? (p.products_sold || []).reduce((sum: number, prod: any) => sum + (prod.amount || 0), 0)
        : 0;

    const productNames = (p.products_sold || [])
      .map((prod: any) => prod.productName)
      .filter(Boolean)
      .join(', ');

    return {
      'Prospect ID': p.id,
      'Name': p.prospect_name,
      'Email': p.prospect_email || '',
      'Phone': p.prospect_phone || '',
      'Stage': p.current_stage || '',
      'Appointment Status': p.appointment_status || '',
      'Appointment Date': formatTS(p.appointment_date),
      'Sales Outcome': outcomeLabel,
      'Lost Reason': p.unsuccessful_reason || '',
      'Products': productNames,
      'ACE Amount (MYR)': totalAce,
      'Created': formatTS(p.created_at),
      'Last Updated': formatTS(p.updated_at),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
  XLSX.writeFile(wb, filename ?? `VistaQ_Prospects_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Parse CSV text into an array of row arrays.
 * Handles quoted fields (including commas inside quotes) and CRLF/LF line endings.
 */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside a quoted field
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }

  return rows;
};
