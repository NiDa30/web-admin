/**
 * Generate CSV Files from Firestore
 * This script exports all Firestore collections to CSV files
 * and saves them to public/data directory
 */

import { writeFileSync } from "fs";
import { join } from "path";
import syncService from "../services/syncService";
import { COLLECTIONS } from "../constants/collections";
import { exportCollectionToCSV } from "./csvExportService";

/**
 * Generate CSV files from Firestore and save to public/data
 */
export async function generateCSVFiles(outputDir = "public/data") {
  const collections = Object.values(COLLECTIONS);
  const results = [];

  console.log("🔄 Starting CSV file generation from Firestore...");

  for (const collectionName of collections) {
    try {
      console.log(`📄 Generating CSV for ${collectionName}...`);

      const csvContent = await exportCollectionToCSV(collectionName);
      
      if (!csvContent) {
        console.warn(`⚠️ No data for ${collectionName}`);
        results.push({
          collection: collectionName,
          status: "empty",
          file: null,
        });
        continue;
      }

      // Create filename
      const filename = `${collectionName}.csv`;
      const filepath = join(outputDir, filename);

      // Write file
      writeFileSync(filepath, csvContent, "utf-8");

      console.log(`✅ Generated ${filename}`);
      results.push({
        collection: collectionName,
        status: "success",
        file: filepath,
        rows: csvContent.split("\n").length - 1, // Subtract header
      });
    } catch (error) {
      console.error(`❌ Error generating CSV for ${collectionName}:`, error);
      results.push({
        collection: collectionName,
        status: "error",
        error: error.message,
      });
    }
  }

  console.log("✅ CSV file generation completed!");
  return results;
}

/**
 * Generate CSV files for Node.js environment
 * Usage: node -r esm src/utils/generateCSVFiles.js
 */
if (typeof require !== "undefined" && require.main === module) {
  (async () => {
    try {
      const results = await generateCSVFiles();
      console.log("\n📊 Generation Summary:");
      results.forEach((result) => {
        if (result.status === "success") {
          console.log(`  ✅ ${result.collection}: ${result.rows} rows -> ${result.file}`);
        } else if (result.status === "empty") {
          console.log(`  ⚠️  ${result.collection}: No data`);
        } else {
          console.log(`  ❌ ${result.collection}: ${result.error}`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to generate CSV files:", error);
      process.exit(1);
    }
  })();
}

export default generateCSVFiles;

