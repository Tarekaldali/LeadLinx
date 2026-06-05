import * as XLSX from 'xlsx';

/**
 * Export a single sheet to an XLSX file
 * @param {Array<Object>} data - The data array to export
 * @param {string} filename - The filename (without extension)
 * @param {string} sheetName - The name of the sheet
 */
export function exportToXLSX(data, filename = 'export', sheetName = 'Data') {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to a single XLSX file
 * @param {Object} sheetsData - An object where keys are sheet names and values are data arrays
 * @param {string} filename - The filename (without extension)
 */
export function exportMultipleSheetsToXLSX(sheetsData, filename = 'export') {
  const workbook = XLSX.utils.book_new();
  let hasData = false;
  
  Object.entries(sheetsData).forEach(([sheetName, data]) => {
    if (data && data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      hasData = true;
    }
  });
  
  if (!hasData) {
    alert("No data available to export.");
    return;
  }
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
