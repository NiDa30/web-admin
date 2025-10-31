import admin from "firebase-admin";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";

// Lấy __dirname trong ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc Service Account Key - TỰ ĐỘNG TÌM FILE
const serviceAccountFiles = fs
  .readdirSync(__dirname + "/..")
  .filter(
    (file) => file.includes("firebase-adminsdk") && file.endsWith(".json")
  );

if (serviceAccountFiles.length === 0) {
  throw new Error(
    "❌ Không tìm thấy file Service Account Key! Vui lòng tải từ Firebase Console."
  );
}

const serviceAccountPath = path.join(__dirname, "..", serviceAccountFiles[0]);
console.log(`🔑 Sử dụng Service Account: ${serviceAccountFiles[0]}\n`);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Khởi tạo Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Sanitize data to ensure Firestore compatibility
 */
function sanitizeFirestoreData(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string") {
    // Remove invalid characters and trim
    return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  }
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  return String(value).trim(); // Convert to string as fallback
}

/**
 * Validate document data before adding to batch
 */
function validateDocument(doc) {
  for (const [key, value] of Object.entries(doc)) {
    if (typeof value === "string" && value.length > 1048576) {
      throw new Error(`Field ${key} exceeds Firestore's 1 MiB limit`);
    }
    if (value === undefined) {
      throw new Error(`Field ${key} is undefined`);
    }
  }
  return true;
}

/**
 * Upload CSV file to Firestore
 */
async function uploadCSVToFirestore(
  csvFilePath,
  collectionName,
  batchSize = 50 // Further reduced batch size
) {
  const data = [];
  let headers = null;

  return new Promise((resolve, reject) => {
    console.log(`📖 Đang đọc file: ${csvFilePath}`);

    fs.createReadStream(csvFilePath)
      .pipe(
        csv({
          skipEmptyLines: true,
          mapHeaders: ({ header, index }) => {
            const trimmed = header.trim();
            if (!trimmed) {
              return null; // Skip empty headers
            }
            if (!headers) headers = [];
            headers.push(trimmed);
            return trimmed;
          },
        })
      )
      .on("data", (row) => {
        const processedRow = {};
        for (const [key, value] of Object.entries(row)) {
          if (!key || key.trim() === "" || key === null) {
            continue; // Skip empty or null keys
          }
          const cleanKey = key.trim();
          processedRow[cleanKey] = sanitizeFirestoreData(value);
        }

        if (Object.keys(processedRow).length > 0) {
          data.push(processedRow);
        }
      })
      .on("end", async () => {
        console.log(`✅ Đọc xong ${data.length} dòng dữ liệu`);
        console.log(
          `📋 Headers: ${headers ? headers.join(", ") : "No headers"}`
        );
        console.log(`🚀 Bắt đầu upload vào collection: ${collectionName}`);

        try {
          await uploadInBatches(db, collectionName, data, batchSize);
          console.log(`✅ Hoàn thành upload ${data.length} documents!`);
          resolve(data.length);
        } catch (error) {
          console.error("❌ Lỗi khi upload dữ liệu:", error);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("❌ Lỗi khi đọc CSV:", error);
        reject(error);
      });
  });
}

/**
 * Upload dữ liệu theo batch để tránh vượt quá giới hạn Firestore
 */
async function uploadInBatches(db, collectionName, data, batchSize) {
  const totalBatches = Math.ceil(data.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = db.batch();
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);

    console.log(
      `📦 Đang xử lý batch ${i + 1}/${totalBatches} (${start + 1}-${end})`
    );

    for (let j = start; j < end; j++) {
      try {
        validateDocument(data[j]);
        const docRef = db.collection(collectionName).doc();
        batch.set(docRef, {
          ...data[j],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`❌ Lỗi khi thêm document ${j + 1} vào batch:`, error);
        throw error;
      }
    }

    // Retry logic for batch commit
    let retries = 3;
    let delay = 2000;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await batch.commit();
        console.log(`✅ Batch ${i + 1} uploaded thành công`);
        break;
      } catch (error) {
        console.error(
          `❌ Lỗi khi commit batch ${i + 1} (thử ${attempt}):`,
          error
        );
        if (error.code === 8 || error.message.includes("Resource exhausted")) {
          console.error(
            "🚫 Đã đạt giới hạn đọc/ghi của Firestore. Vui lòng kiểm tra quota trong Firebase Console hoặc thử lại sau."
          );
        }
        if (attempt === retries) {
          throw error;
        }
        console.warn(`⚠️ Thử lại batch ${i + 1} sau ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    // Delay giữa các batch
    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Main function - Upload tất cả CSV files
 */
async function main() {
  try {
    console.log("🔥 Bắt đầu quá trình upload CSV lên Firestore...\n");

    const csvFiles = [
      // {
      //   path: path.join(__dirname, "../public/data/family_info.csv"),
      //   collection: "family_info",
      // },
      // {
      //   path: path.join(__dirname, "../public/data/household_expenses.csv"),
      //   collection: "household_expenses",
      // },
      // {
      //   path: path.join(__dirname, "../public/data/house_utilities.csv"),
      //   collection: "house_utilities",
      // },
      {
        path: path.join(__dirname, "../public/data/USER.csv"), //1
        collection: "USER",
      },
      {
        path: path.join(__dirname, "../public/data/TRANSACTION.csv"), //2
        collection: "TRANSACTION",
      },
      {
        path: path.join(__dirname, "../public/data/CATEGORY.csv"), //4
        collection: "CATEGORY",
      },
      {
        path: path.join(__dirname, "../public/data/BUDGET.csv"), //5
        collection: "BUDGET",
      },
      {
        path: path.join(__dirname, "../public/data/GOAL.csv"), //6
        collection: "GOAL",
      },
      {
        path: path.join(__dirname, "../public/data/RECURRING_TXN.csv"), //7
        collection: "RECURRING_TXN",
      },
      {
        path: path.join(__dirname, "../public/data/SYNC_LOG.csv"), //8
        collection: "SYNC_LOG",
      },
      {
        path: path.join(__dirname, "../public/data/NOTIFICATION.csv"), //9
        collection: "NOTIFICATION",
      },
      {
        path: path.join(__dirname, "../public/data/DEVICE.csv"), //10
        collection: "DEVICE",
      },
      {
        path: path.join(__dirname, "../public/data/ATTACHMENT.csv"), //11
        collection: "ATTACHMENT",
      },
      {
        path: path.join(__dirname, "../public/data/BUDGET_HISTORY.csv"), //12
        collection: "BUDGET_HISTORY",
      },
      {
        path: path.join(__dirname, "../public/data/GOAL_CONTRIBUTION.csv"), //13
        collection: "GOAL_CONTRIBUTION",
      },
      {
        path: path.join(__dirname, "../public/data/PAYMENT_METHHOD.csv"), //14
        collection: "PAYMENT_METHHOD",
      },
      {
        path: path.join(__dirname, "../public/data/MERCHART.csv"), //15
        collection: "MERCHART",
      },
      {
        path: path.join(__dirname, "../public/data/TAG.csv"), //16
        collection: "TAG",
      },
      {
        path: path.join(__dirname, "../public/data/TRANSACTION_TAG.csv"), //17
        collection: "TRANSACTION_TAG",
      },
      {
        path: path.join(__dirname, "../public/data/SPLIT_TRANSACTION.csv"), // 18
        collection: "SPLIT_TRANSACTION",
      },
      {
        path: path.join(__dirname, "../public/data/REPORT.csv"), //19
        collection: "REPORT",
      },
      {
        path: path.join(__dirname, "../public/data/APP_SETTINGS.csv"), //20
        collection: "APP_SETTINGS",
      },
      {
        path: path.join(
          __dirname,
          "../public/data/CATEGORY_BUDGET_TEMPLATE.csv"
        ),
        collection: "CATEGORY_BUDGET_TEMPLATE", //19
      },
    ];

    let totalUploaded = 0;

    for (const file of csvFiles) {
      console.log(`\n${"=".repeat(60)}`);

      if (!fs.existsSync(file.path)) {
        console.warn(`⚠️  File không tồn tại: ${file.path}`);
        continue;
      }

      const count = await uploadCSVToFirestore(file.path, file.collection);
      totalUploaded += count;
      console.log(
        `✅ Uploaded ${count} documents vào collection "${file.collection}"`
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `🎉 HOÀN THÀNH! Tổng cộng ${totalUploaded} documents đã được upload.`
    );
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ LỖI:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Chạy script
main();
