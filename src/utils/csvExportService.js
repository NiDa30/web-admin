/**
 * CSV Export Service
 * Exports Firestore data to CSV files for SQLite import
 */

import syncService from "../services/syncService";
import { COLLECTIONS } from "../constants/collections";

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(",") + "\n";
  }

  // Use provided headers or get from first object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV rows
  const rows = data.map((item) => {
    return csvHeaders.map((header) => {
      const value = item[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return "";
      }
      
      // Handle arrays and objects (convert to JSON string)
      if (Array.isArray(value) || typeof value === "object") {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      
      // Handle strings with commas, quotes, or newlines
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
  });

  // Combine headers and rows
  const csvContent = [
    csvHeaders.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Export collection to CSV file content
 */
export async function exportCollectionToCSV(collectionName) {
  try {
    const data = await syncService.exportCollectionToJSON(collectionName);
    
    if (data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]);
    return arrayToCSV(data, headers);
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName} to CSV:`, error);
    throw error;
  }
}

/**
 * Export all collections to CSV
 */
export async function exportAllCollectionsToCSV() {
  const collections = Object.values(COLLECTIONS);
  const results = {};

  for (const collectionName of collections) {
    try {
      console.log(`📄 Exporting ${collectionName} to CSV...`);
      results[collectionName] = await exportCollectionToCSV(collectionName);
      console.log(`✅ Exported ${collectionName} to CSV`);
    } catch (error) {
      console.error(`❌ Failed to export ${collectionName}:`, error.message);
      results[collectionName] = null;
    }
  }

  return results;
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export and download all collections as CSV files
 */
export async function exportAndDownloadAllCSV() {
  const csvData = await exportAllCollectionsToCSV();
  
  for (const [collectionName, csvContent] of Object.entries(csvData)) {
    if (csvContent) {
      const filename = `${collectionName}.csv`;
      downloadCSV(csvContent, filename);
      // Add delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  
  return csvData;
}

export default {
  exportCollectionToCSV,
  exportAllCollectionsToCSV,
  downloadCSV,
  exportAndDownloadAllCSV,
};

