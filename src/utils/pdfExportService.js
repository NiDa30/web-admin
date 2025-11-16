/**
 * PDF Export Service
 * Exports Firestore data to PDF files
 */

/**
 * Export data to PDF using jsPDF
 * Note: Requires jspdf and jspdf-autotable packages
 */
export async function exportCollectionToPDF(data, collectionName, headers) {
  try {
    // Dynamic import to avoid errors if package is not installed
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(collectionName, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleString("vi-VN")}`, 14, 22);
    
    // Prepare table data
    const tableData = data.map((item) => {
      return headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return "";
        if (Array.isArray(value) || typeof value === "object") {
          return JSON.stringify(value);
        }
        return String(value);
      });
    });

    // Add table (autoTable is added to jsPDF prototype by jspdf-autotable)
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Save PDF
    doc.save(`${collectionName}_${new Date().toISOString().split("T")[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    throw new Error(`PDF export failed: ${error.message}. Please install jspdf and jspdf-autotable: npm install jspdf jspdf-autotable`);
  }
}

/**
 * Download PDF file
 */
export function downloadPDF(pdfBlob, filename) {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

