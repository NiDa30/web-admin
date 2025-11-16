/**
 * Excel & CSV Import Service
 * Handles importing data from Excel and CSV files to Firebase
 */

/**
 * Generate Excel template file
 * Note: Requires xlsx package
 */
export async function generateExcelTemplate(headers, collectionName) {
  try {
    const XLSX = await import("xlsx");
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with headers
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws["!cols"] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    
    // Generate Excel file
    XLSX.writeFile(wb, `${collectionName}_template.xlsx`);
    
    return true;
  } catch (error) {
    console.error("Error generating Excel template:", error);
    throw new Error(`Excel template generation failed: ${error.message}. Please install xlsx: npm install xlsx`);
  }
}

/**
 * Read Excel file and convert to JSON
 */
export async function readExcelFile(file) {
  try {
    const XLSX = await import("xlsx");
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error("Excel file is empty"));
            return;
          }
          
          // First row is headers
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          
          // Convert to array of objects
          const dataArray = rows.map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || null;
            });
            return obj;
          });
          
          resolve({
            headers,
            data: dataArray,
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw new Error(`Excel file reading failed: ${error.message}. Please install xlsx: npm install xlsx`);
  }
}

/**
 * Read CSV file and convert to JSON
 */
export async function readCSVFile(file) {
  try {
    const Papa = (await import("papaparse")).default;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          
          // Parse CSV
          const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            transform: (value) => {
              // Try to convert to number if possible
              if (value === "" || value === null || value === undefined) {
                return null;
              }
              const numValue = Number(value);
              if (!isNaN(numValue) && value.trim() !== "") {
                return numValue;
              }
              return value.trim();
            },
          });
          
          if (result.errors && result.errors.length > 0) {
            console.warn("CSV parsing warnings:", result.errors);
          }
          
          if (!result.data || result.data.length === 0) {
            reject(new Error("CSV file is empty or has no data rows"));
            return;
          }
          
          // Get headers from first row
          const headers = Object.keys(result.data[0]);
          
          resolve({
            headers,
            data: result.data,
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsText(file, "UTF-8");
    });
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw new Error(`CSV file reading failed: ${error.message}. Please install papaparse: npm install papaparse`);
  }
}

/**
 * Generate CSV template file
 */
export async function generateCSVTemplate(headers, collectionName) {
  try {
    // Create CSV content with headers only
    const csvContent = headers.join(",") + "\n";
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${collectionName}_template.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error("Error generating CSV template:", error);
    throw new Error(`CSV template generation failed: ${error.message}`);
  }
}

/**
 * Validate imported data
 */
export function validateImportedData(data, requiredFields = []) {
  const errors = [];
  
  data.forEach((item, index) => {
    requiredFields.forEach((field) => {
      if (!item[field] && item[field] !== 0) {
        errors.push(`Row ${index + 2}: Missing required field "${field}"`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

