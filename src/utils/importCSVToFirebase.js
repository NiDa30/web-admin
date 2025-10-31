// import Papa from "papaparse";
// import { db } from "../firebase";
// import {
//   collection,
//   doc,
//   setDoc,
//   writeBatch,
//   Timestamp,
// } from "firebase/firestore";

// class CSVImporter {
//   constructor() {
//     this.batchSize = 500; // Firestore batch limit
//   }

//   /**
//    * Parse CSV file
//    */
//   async parseCSV(file) {
//     return new Promise((resolve, reject) => {
//       Papa.parse(file, {
//         header: true,
//         skipEmptyLines: true,
//         dynamicTyping: false, // Giữ nguyên string để xử lý sau
//         complete: (results) => {
//           resolve(results.data);
//         },
//         error: (error) => {
//           reject(error);
//         },
//       });
//     });
//   }

//   /**
//    * Transform data types
//    */
//   transformData(row, collectionName) {
//     const transformed = {};

//     for (const [key, value] of Object.entries(row)) {
//       // Skip empty values
//       if (value === "" || value === null) {
//         transformed[key] = null;
//         continue;
//       }

//       // Convert timestamps
//       if (key.includes("At") || key.includes("Time") || key === "date") {
//         try {
//           transformed[key] = Timestamp.fromDate(new Date(value));
//         } catch (e) {
//           transformed[key] = value;
//         }
//         continue;
//       }

//       // Convert booleans
//       if (value === "TRUE" || value === "FALSE") {
//         transformed[key] = value === "TRUE";
//         continue;
//       }

//       // Convert numbers
//       if (
//         key.includes("amount") ||
//         key.includes("Amount") ||
//         key.includes("income") ||
//         key.includes("Income") ||
//         key.includes("balance") ||
//         key.includes("Balance") ||
//         key.includes("threshold") ||
//         key.includes("count") ||
//         key.includes("Count") ||
//         key.includes("size") ||
//         key.includes("Size") ||
//         key.includes("confidence") ||
//         key.includes("latitude") ||
//         key.includes("longitude") ||
//         key.includes("order") ||
//         key.includes("Order")
//       ) {
//         const num = parseFloat(value);
//         transformed[key] = isNaN(num) ? value : num;
//         continue;
//       }

//       // Convert integers
//       if (key.includes("attempts") || key.includes("Attempts")) {
//         const num = parseInt(value);
//         transformed[key] = isNaN(num) ? value : num;
//         continue;
//       }

//       // Parse JSON fields
//       if (
//         key.includes("keywords") ||
//         key.includes("tags") ||
//         key.includes("allocations") ||
//         key.includes("breakdown") ||
//         key.includes("categories") ||
//         key.includes("insights") ||
//         key.includes("comparison")
//       ) {
//         try {
//           transformed[key] = JSON.parse(value);
//         } catch (e) {
//           transformed[key] = value;
//         }
//         continue;
//       }

//       // Default: keep as string
//       transformed[key] = value;
//     }

//     return transformed;
//   }

//   /**
//    * Import single collection
//    */
//   async importCollection(collectionName, data, onProgress) {
//     const totalDocs = data.length;
//     let imported = 0;
//     const batches = [];

//     // Split into batches
//     for (let i = 0; i < totalDocs; i += this.batchSize) {
//       const batch = writeBatch(db);
//       const chunk = data.slice(i, i + this.batchSize);

//       for (const row of chunk) {
//         const transformed = this.transformData(row, collectionName);

//         // Get document ID from first column
//         const docId = Object.values(row)[0];
//         const docRef = doc(db, collectionName, docId);

//         batch.set(docRef, transformed);
//       }

//       batches.push(batch);
//     }

//     // Commit all batches
//     for (const batch of batches) {
//       await batch.commit();
//       imported += this.batchSize;

//       if (onProgress) {
//         onProgress({
//           collection: collectionName,
//           imported: Math.min(imported, totalDocs),
//           total: totalDocs,
//           percentage: Math.round(
//             (Math.min(imported, totalDocs) / totalDocs) * 100
//           ),
//         });
//       }
//     }

//     return { collection: collectionName, count: totalDocs };
//   }

//   /**
//    * Import all collections from multiple CSV files
//    */
//   async importAllCollections(files, onProgress, onComplete, onError) {
//     const results = [];

//     try {
//       for (const fileInfo of files) {
//         const { file, collectionName } = fileInfo;

//         // Parse CSV
//         const data = await this.parseCSV(file);

//         // Import to Firestore
//         const result = await this.importCollection(
//           collectionName,
//           data,
//           onProgress
//         );

//         results.push(result);
//       }

//       if (onComplete) {
//         onComplete(results);
//       }

//       return results;
//     } catch (error) {
//       console.error("Import error:", error);
//       if (onError) {
//         onError(error);
//       }
//       throw error;
//     }
//   }

//   /**
//    * Verify import
//    */
//   async verifyImport(collectionName, expectedCount) {
//     const snapshot = await getDocs(collection(db, collectionName));
//     const actualCount = snapshot.size;

//     return {
//       collection: collectionName,
//       expected: expectedCount,
//       actual: actualCount,
//       success: actualCount === expectedCount,
//     };
//   }
// }

// export default new CSVImporter();
// {/* Results */}
//         {results && (
//           <div className="results-section">
//             <h3>✅ Import Completed Successfully!</h3>

//             <table className="results-table">
//               <thead>
//                 <tr>
//                   <th>Collection</th>
//                   <th>Documents Imported</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {results.map((result) => (
//                   <tr key={result.collection}>
//                     <td>{result.collection}</td>
//                     <td>{result.count}</td>
//                     <td><span className="status-success">✓ Success</span></td>
//                   </tr>
//                 ))}
//               </tbody>
//               <tfoot>
//                 <tr>
//                   <td><strong>Total:</strong></td>
//                   <td><strong>{results.reduce((sum, r) => sum + r.count, 0)}</strong></td>
//                   <td></td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         )}

//         {/* Error */}
//         {error && (
//           <div className="error-section">
//             <h3>❌ Import Failed</h3>
//             <p className="error-message">{error}</p>
//           </div>
//         )}

//         {/* Actions */}
//         <div className="actions">
//           <button
//             onClick={handleImport}
//             disabled={isImporting || Object.keys(files).length === 0}
//             className="btn btn-primary"
//           >
//             {isImporting ? 'Importing...' : 'Import All'}
//           </button>

//           <button
//             onClick={handleClearAll}
//             disabled={isImporting}
//             className="btn btn-secondary"
//           >
//             Clear All
//           </button>

//           <div className="file-count">
//             {Object.keys(files).length} / {COLLECTIONS.length} collections selected
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
