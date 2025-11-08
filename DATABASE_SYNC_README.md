# Database Synchronization - Complete Guide

## 📋 Overview

This project implements a unified database structure across:

- **Firestore** (Web Admin - Source of Truth)
- **SQLite** (React Native App - Offline Support)

Both databases use identical naming conventions:

- **Tables/Collections**: UPPERCASE (e.g., `USER`, `TRANSACTION`)
- **Fields**: camelCase (e.g., `userID`, `createdAt`)

## 🗂️ Project Structure

### Web Admin (`web-admin/`)

```
src/
├── constants/
│   ├── collections.js          # Firestore collection names
│   └── databaseMapping.js      # SQLite ↔ Firestore mapping
├── services/
│   └── syncService.js          # Firestore sync service
├── utils/
│   ├── csvExportService.js     # CSV export utilities
│   ├── generateCSVFiles.js     # Generate CSV from Firestore
│   ├── syncHelper.js           # Sync helper functions
│   └── validateDatabaseStructure.js  # Structure validation
└── docs/
    └── DATABASE_SYNC.md        # Detailed sync documentation
```

### React Native App (`FamilyBudgetExpo/`)

```
src/
├── database/
│   └── database.js             # SQLite database schema
├── services/
│   └── syncService.js          # SQLite sync service
└── constants/
    └── collections.js          # Collection names (matches web-admin)
```

## 🚀 Quick Start

### 1. Web Admin - Export Firestore to CSV

```javascript
import { exportAllCollectionsToCSV } from "@/utils/csvExportService";

// Export all collections
const csvData = await exportAllCollectionsToCSV();

// CSV files will be generated in memory
// Use downloadCSV() to save to filesystem
```

### 2. React Native - Sync from Firestore

```javascript
import syncService from "@/services/syncService";

// Fetch data from Firestore
const firestoreData = await fetchFromFirestore("USER");

// Sync to SQLite
await syncService.syncFromFirestore("USER", firestoreData);
```

### 3. React Native - Sync to Firestore

```javascript
// Get unsynced records
const unsynced = await syncService.getUnsyncedRecords("TRANSACTION");

// Upload to Firestore
await uploadToFirestore("TRANSACTION", unsynced);

// Mark as synced
const recordIds = unsynced.map((r) => r.transactionID);
await syncService.markRecordsAsSynced(
  "TRANSACTION",
  "transactionID",
  recordIds
);
```

## 📊 Database Tables

### Core Entities

- `USER` - User accounts
- `CATEGORY` - Transaction categories
- `TRANSACTION` - Financial transactions
- `BUDGET` - Budget plans
- `GOAL` - Savings goals

### Supporting Tables

- `RECURRING_TXN` - Recurring transactions
- `BUDGET_HISTORY` - Budget change history
- `GOAL_CONTRIBUTION` - Goal contributions
- `SYNC_LOG` - Synchronization logs
- `NOTIFICATION` - User notifications
- `DEVICE` - Device information
- `ATTACHMENT` - Transaction attachments
- `PAYMENT_METHOD` - Payment methods
- `MERCHANT` - Merchant information
- `TAG` - Transaction tags
- `TRANSACTION_TAG` - Tag relationships
- `SPLIT_TRANSACTION` - Split transactions
- `REPORT` - Generated reports
- `APP_SETTINGS` - Application settings
- `CATEGORY_BUDGET_TEMPLATE` - Budget templates

## 📋 Collection Structure & Attributes

### 1. USER Collection

**Primary Key**: `userID` (TEXT)

| Field                 | Type    | Required | Default              | Description                                          |
| --------------------- | ------- | -------- | -------------------- | ---------------------------------------------------- |
| `userID`              | TEXT    | ✅       | -                    | Unique user identifier                               |
| `email`               | TEXT    | ✅       | -                    | User email address (UNIQUE)                          |
| `passwordHash`        | TEXT    | ✅       | -                    | Hashed password (bcrypt)                             |
| `name`                | TEXT    | ❌       | -                    | User's full name                                     |
| `role`                | TEXT    | ❌       | `'USER'`             | User role: `'USER'`, `'ADMIN'`                       |
| `accountStatus`       | TEXT    | ❌       | `'ACTIVE'`           | Account status: `'ACTIVE'`, `'LOCKED'`, `'INACTIVE'` |
| `monthlyIncome`       | REAL    | ❌       | `0`                  | Monthly income amount                                |
| `currentBalance`      | REAL    | ❌       | `0`                  | Current account balance                              |
| `failedLoginAttempts` | INTEGER | ❌       | `0`                  | Number of failed login attempts                      |
| `lastLoginTime`       | TEXT    | ❌       | -                    | Last login timestamp (ISO 8601)                      |
| `currency`            | TEXT    | ❌       | `'VND'`              | Currency code (VND, USD, etc.)                       |
| `language`            | TEXT    | ❌       | `'vi'`               | Language code (vi, en, etc.)                         |
| `timezone`            | TEXT    | ❌       | `'Asia/Ho_Chi_Minh'` | User timezone                                        |
| `emailVerified`       | BOOLEAN | ❌       | `FALSE`              | Email verification status                            |
| `phoneNumber`         | TEXT    | ❌       | -                    | Phone number                                         |
| `avatarURL`           | TEXT    | ❌       | -                    | Avatar image URL                                     |
| `budgetRule`          | TEXT    | ❌       | `'50-30-20'`         | Budget allocation rule                               |
| `createdAt`           | TEXT    | ❌       | -                    | Creation timestamp (ISO 8601)                        |
| `updatedAt`           | TEXT    | ❌       | -                    | Last update timestamp (ISO 8601)                     |

**Indexes**: `email` (UNIQUE)

---

### 2. CATEGORY Collection

**Primary Key**: `categoryID` (TEXT)

| Field              | Type    | Required | Default | Description                            |
| ------------------ | ------- | -------- | ------- | -------------------------------------- |
| `categoryID`       | TEXT    | ✅       | -       | Unique category identifier             |
| `name`             | TEXT    | ✅       | -       | Category name                          |
| `type`             | TEXT    | ❌       | -       | Category type: `'INCOME'`, `'EXPENSE'` |
| `isSystemDefault`  | BOOLEAN | ❌       | `FALSE` | Is system default category             |
| `keywords`         | TEXT    | ❌       | -       | Search keywords (JSON array)           |
| `icon`             | TEXT    | ❌       | -       | Icon name/identifier                   |
| `color`            | TEXT    | ❌       | -       | Category color (hex code)              |
| `parentCategoryID` | TEXT    | ❌       | -       | Parent category ID (self-reference)    |
| `displayOrder`     | INTEGER | ❌       | `0`     | Display order for sorting              |
| `isHidden`         | BOOLEAN | ❌       | `FALSE` | Is category hidden                     |
| `createdAt`        | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)          |

**Foreign Keys**:

- `parentCategoryID` → `CATEGORY.categoryID` (ON DELETE SET NULL)

**Constraints**:

- `type` IN ('INCOME', 'EXPENSE')

---

### 3. TRANSACTION Collection

**Primary Key**: `transactionID` (TEXT)

| Field                 | Type    | Required | Default | Description                                                                                |
| --------------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `transactionID`       | TEXT    | ✅       | -       | Unique transaction identifier                                                              |
| `userID`              | TEXT    | ✅       | -       | User who owns this transaction                                                             |
| `categoryID`          | TEXT    | ❌       | -       | Category of transaction                                                                    |
| `amount`              | REAL    | ✅       | -       | Transaction amount                                                                         |
| `type`                | TEXT    | ❌       | -       | Transaction type: `'INCOME'`, `'EXPENSE'`                                                  |
| `date`                | TEXT    | ✅       | -       | Transaction date (ISO 8601)                                                                |
| `description`         | TEXT    | ❌       | -       | Transaction description                                                                    |
| `paymentMethod`       | TEXT    | ❌       | -       | Payment method: `'CASH'`, `'DEBIT_CARD'`, `'CREDIT_CARD'`, `'E_WALLET'`, `'BANK_TRANSFER'` |
| `merchantName`        | TEXT    | ❌       | -       | Merchant/store name                                                                        |
| `merchantLocation`    | TEXT    | ❌       | -       | Merchant location                                                                          |
| `latitude`            | REAL    | ❌       | -       | Location latitude                                                                          |
| `longitude`           | REAL    | ❌       | -       | Location longitude                                                                         |
| `tags`                | TEXT    | ❌       | -       | Transaction tags (JSON array)                                                              |
| `isSynced`            | BOOLEAN | ❌       | `FALSE` | Sync status with Firestore                                                                 |
| `lastModifiedAt`      | TEXT    | ❌       | -       | Last modification timestamp                                                                |
| `location`            | TEXT    | ❌       | -       | Location description                                                                       |
| `isDeleted`           | BOOLEAN | ❌       | `FALSE` | Soft delete flag                                                                           |
| `deletedAt`           | TEXT    | ❌       | -       | Deletion timestamp                                                                         |
| `createdBy`           | TEXT    | ❌       | -       | Creator: `'USER'`, `'SYSTEM'`                                                              |
| `hasAttachment`       | BOOLEAN | ❌       | `FALSE` | Has attachment file                                                                        |
| `recurTxnID`          | TEXT    | ❌       | -       | Related recurring transaction ID                                                           |
| `parentTransactionID` | TEXT    | ❌       | -       | Parent transaction (for splits)                                                            |
| `createdAt`           | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                                                              |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)
- `categoryID` → `CATEGORY.categoryID` (ON DELETE SET NULL)
- `parentTransactionID` → `TRANSACTION.transactionID` (ON DELETE SET NULL)

**Indexes**:

- `userID`, `date`, `categoryID`, `isSynced`

**Constraints**:

- `type` IN ('INCOME', 'EXPENSE')

---

### 4. BUDGET Collection

**Primary Key**: `budgetID` (TEXT)

| Field              | Type    | Required | Default | Description                       |
| ------------------ | ------- | -------- | ------- | --------------------------------- |
| `budgetID`         | TEXT    | ✅       | -       | Unique budget identifier          |
| `userID`           | TEXT    | ✅       | -       | User who owns this budget         |
| `categoryID`       | TEXT    | ✅       | -       | Category for budget               |
| `monthYear`        | TEXT    | ❌       | -       | Budget period (format: `YYYY-MM`) |
| `budgetAmount`     | REAL    | ✅       | -       | Budgeted amount                   |
| `spentAmount`      | REAL    | ❌       | `0`     | Amount spent so far               |
| `warningThreshold` | INTEGER | ❌       | `80`    | Warning threshold percentage      |
| `createdAt`        | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)     |
| `updatedAt`        | TEXT    | ❌       | -       | Last update timestamp (ISO 8601)  |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)
- `categoryID` → `CATEGORY.categoryID` (ON DELETE CASCADE)

**Indexes**:

- `userID`, `monthYear`

---

### 5. GOAL Collection

**Primary Key**: `goalID` (TEXT)

| Field                 | Type | Required | Default    | Description                                           |
| --------------------- | ---- | -------- | ---------- | ----------------------------------------------------- |
| `goalID`              | TEXT | ✅       | -          | Unique goal identifier                                |
| `userID`              | TEXT | ✅       | -          | User who owns this goal                               |
| `name`                | TEXT | ✅       | -          | Goal name                                             |
| `targetAmount`        | REAL | ✅       | -          | Target amount to save                                 |
| `savedAmount`         | REAL | ❌       | `0`        | Amount saved so far                                   |
| `startDate`           | TEXT | ✅       | -          | Goal start date (ISO 8601)                            |
| `endDate`             | TEXT | ✅       | -          | Goal end date (ISO 8601)                              |
| `monthlyContribution` | REAL | ❌       | `0`        | Monthly contribution amount                           |
| `status`              | TEXT | ❌       | `'ACTIVE'` | Goal status: `'ACTIVE'`, `'COMPLETED'`, `'CANCELLED'` |
| `createdAt`           | TEXT | ❌       | -          | Creation timestamp (ISO 8601)                         |
| `updatedAt`           | TEXT | ❌       | -          | Last update timestamp (ISO 8601)                      |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`, `status`

**Constraints**:

- `status` IN ('ACTIVE', 'COMPLETED', 'CANCELLED')

---

### 6. RECURRING_TXN Collection

**Primary Key**: `recurTxnID` (TEXT)

| Field         | Type    | Required | Default | Description                                               |
| ------------- | ------- | -------- | ------- | --------------------------------------------------------- |
| `recurTxnID`  | TEXT    | ✅       | -       | Unique recurring transaction identifier                   |
| `userID`      | TEXT    | ✅       | -       | User who owns this recurring transaction                  |
| `categoryID`  | TEXT    | ❌       | -       | Category of transaction                                   |
| `amount`      | REAL    | ✅       | -       | Transaction amount                                        |
| `frequency`   | TEXT    | ❌       | -       | Frequency: `'DAILY'`, `'WEEKLY'`, `'MONTHLY'`, `'YEARLY'` |
| `startDate`   | TEXT    | ❌       | -       | Start date (ISO 8601)                                     |
| `nextDueDate` | TEXT    | ❌       | -       | Next due date (ISO 8601)                                  |
| `description` | TEXT    | ❌       | -       | Transaction description                                   |
| `type`        | TEXT    | ❌       | -       | Transaction type: `'INCOME'`, `'EXPENSE'`                 |
| `isActive`    | BOOLEAN | ❌       | `TRUE`  | Is recurring transaction active                           |
| `createdAt`   | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                             |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)
- `categoryID` → `CATEGORY.categoryID` (ON DELETE SET NULL)

**Indexes**:

- `userID`, `nextDueDate`

**Constraints**:

- `type` IN ('INCOME', 'EXPENSE')

---

### 7. BUDGET_HISTORY Collection

**Primary Key**: `historyID` (TEXT)

| Field                 | Type    | Required | Default | Description                                                                    |
| --------------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `historyID`           | TEXT    | ✅       | -       | Unique history record identifier                                               |
| `budgetID`            | TEXT    | ✅       | -       | Related budget ID                                                              |
| `userID`              | TEXT    | ✅       | -       | User who owns this budget                                                      |
| `changeType`          | TEXT    | ❌       | -       | Type of change: `'CREATE'`, `'UPDATE'`, `'DELETE'`                             |
| `oldAmount`           | REAL    | ❌       | -       | Previous budget amount                                                         |
| `newAmount`           | REAL    | ❌       | -       | New budget amount                                                              |
| `oldWarningThreshold` | INTEGER | ❌       | -       | Previous warning threshold                                                     |
| `newWarningThreshold` | INTEGER | ❌       | -       | New warning threshold                                                          |
| `reason`              | TEXT    | ❌       | -       | Reason for change: `'MONTHLY_RESET'`, `'USER_ADJUSTED'`, `'SYSTEM_SUGGESTION'` |
| `notes`               | TEXT    | ❌       | -       | Additional notes                                                               |
| `changedAt`           | TEXT    | ❌       | -       | Change timestamp (ISO 8601)                                                    |
| `changedBy`           | TEXT    | ❌       | -       | Who made the change: `'USER'`, `'SYSTEM'`                                      |

**Foreign Keys**:

- `budgetID` → `BUDGET.budgetID` (ON DELETE CASCADE)
- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `budgetID`

---

### 8. GOAL_CONTRIBUTION Collection

**Primary Key**: `contributionID` (TEXT)

| Field                 | Type | Required | Default | Description                                      |
| --------------------- | ---- | -------- | ------- | ------------------------------------------------ |
| `contributionID`      | TEXT | ✅       | -       | Unique contribution identifier                   |
| `goalID`              | TEXT | ✅       | -       | Related goal ID                                  |
| `userID`              | TEXT | ✅       | -       | User who made the contribution                   |
| `amount`              | REAL | ✅       | -       | Contribution amount                              |
| `contributionType`    | TEXT | ❌       | -       | Type: `'MANUAL'`, `'AUTO_MONTHLY'`, `'WINDFALL'` |
| `sourceTransactionID` | TEXT | ❌       | -       | Source transaction ID (if from transaction)      |
| `note`                | TEXT | ❌       | -       | Contribution note                                |
| `contributedAt`       | TEXT | ❌       | -       | Contribution timestamp (ISO 8601)                |
| `createdBy`           | TEXT | ❌       | -       | Creator: `'USER'`, `'SYSTEM'`                    |

**Foreign Keys**:

- `goalID` → `GOAL.goalID` (ON DELETE CASCADE)
- `userID` → `USER.userID` (ON DELETE CASCADE)
- `sourceTransactionID` → `TRANSACTION.transactionID` (ON DELETE SET NULL)

**Indexes**:

- `goalID`

---

### 9. SYNC_LOG Collection

**Primary Key**: `logID` (TEXT)

| Field             | Type | Required | Default | Description                                        |
| ----------------- | ---- | -------- | ------- | -------------------------------------------------- |
| `logID`           | TEXT | ✅       | -       | Unique log identifier                              |
| `userID`          | TEXT | ✅       | -       | User who triggered sync                            |
| `deviceID`        | TEXT | ❌       | -       | Device identifier                                  |
| `syncTime`        | TEXT | ❌       | -       | Sync timestamp (ISO 8601)                          |
| `status`          | TEXT | ❌       | -       | Sync status: `'SUCCESS'`, `'CONFLICT'`, `'FAILED'` |
| `conflictDetails` | TEXT | ❌       | -       | Conflict details (JSON string)                     |
| `tableName`       | TEXT | ❌       | -       | Table/collection name                              |
| `recordID`        | TEXT | ❌       | -       | Record identifier                                  |
| `action`          | TEXT | ❌       | -       | Action: `'CREATE'`, `'UPDATE'`, `'DELETE'`         |
| `createdAt`       | TEXT | ❌       | -       | Creation timestamp (ISO 8601)                      |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)
- `deviceID` → `DEVICE.deviceID` (ON DELETE SET NULL)

**Indexes**:

- `userID`, `status`

**Constraints**:

- `status` IN ('SUCCESS', 'CONFLICT', 'FAILED')

---

### 10. NOTIFICATION Collection

**Primary Key**: `notificationID` (TEXT)

| Field               | Type    | Required | Default | Description                                                                           |
| ------------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| `notificationID`    | TEXT    | ✅       | -       | Unique notification identifier                                                        |
| `userID`            | TEXT    | ✅       | -       | User who receives notification                                                        |
| `type`              | TEXT    | ❌       | -       | Notification type: `'BUDGET_ALERT'`, `'GOAL_REMINDER'`, `'RECURRING_DUE'`, `'SYSTEM'` |
| `title`             | TEXT    | ✅       | -       | Notification title                                                                    |
| `message`           | TEXT    | ❌       | -       | Notification message                                                                  |
| `isRead`            | BOOLEAN | ❌       | `FALSE` | Is notification read                                                                  |
| `priority`          | TEXT    | ❌       | -       | Priority: `'LOW'`, `'NORMAL'`, `'HIGH'`, `'URGENT'`                                   |
| `relatedEntityType` | TEXT    | ❌       | -       | Related entity type: `'BUDGET'`, `'GOAL'`, `'TRANSACTION'`, `'RECURRING_TXN'`         |
| `relatedEntityID`   | TEXT    | ❌       | -       | Related entity ID                                                                     |
| `actionURL`         | TEXT    | ❌       | -       | Action URL for navigation                                                             |
| `createdAt`         | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                                                         |
| `readAt`            | TEXT    | ❌       | -       | Read timestamp (ISO 8601)                                                             |
| `expiresAt`         | TEXT    | ❌       | -       | Expiration timestamp (ISO 8601)                                                       |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`, `isRead`

---

### 11. DEVICE Collection

**Primary Key**: `deviceID` (TEXT)

| Field          | Type    | Required | Default | Description                                |
| -------------- | ------- | -------- | ------- | ------------------------------------------ |
| `deviceID`     | TEXT    | ✅       | -       | Unique device identifier                   |
| `userID`       | TEXT    | ✅       | -       | User who owns this device                  |
| `deviceUUID`   | TEXT    | ❌       | -       | Device UUID                                |
| `deviceName`   | TEXT    | ❌       | -       | Device name                                |
| `deviceType`   | TEXT    | ❌       | -       | Device type: `'IOS'`, `'ANDROID'`, `'WEB'` |
| `osVersion`    | TEXT    | ❌       | -       | Operating system version                   |
| `appVersion`   | TEXT    | ❌       | -       | Application version                        |
| `fcmToken`     | TEXT    | ❌       | -       | Firebase Cloud Messaging token             |
| `isActive`     | BOOLEAN | ❌       | `TRUE`  | Is device active                           |
| `lastSyncAt`   | TEXT    | ❌       | -       | Last sync timestamp (ISO 8601)             |
| `lastActiveAt` | TEXT    | ❌       | -       | Last active timestamp (ISO 8601)           |
| `createdAt`    | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)              |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`

---

### 12. ATTACHMENT Collection

**Primary Key**: `attachmentID` (TEXT)

| Field           | Type    | Required | Default | Description                                 |
| --------------- | ------- | -------- | ------- | ------------------------------------------- |
| `attachmentID`  | TEXT    | ✅       | -       | Unique attachment identifier                |
| `transactionID` | TEXT    | ✅       | -       | Related transaction ID                      |
| `fileURL`       | TEXT    | ❌       | -       | File URL in storage                         |
| `fileName`      | TEXT    | ❌       | -       | Original file name                          |
| `fileType`      | TEXT    | ❌       | -       | File type: `'IMAGE'`, `'PDF'`, `'DOCUMENT'` |
| `fileSize`      | INTEGER | ❌       | -       | File size in bytes                          |
| `mimeType`      | TEXT    | ❌       | -       | MIME type (e.g., `'image/jpeg'`)            |
| `thumbnailURL`  | TEXT    | ❌       | -       | Thumbnail image URL                         |
| `ocrRawText`    | TEXT    | ❌       | -       | OCR extracted text                          |
| `ocrConfidence` | REAL    | ❌       | -       | OCR confidence score (0-1)                  |
| `wasEdited`     | BOOLEAN | ❌       | `FALSE` | Was OCR text edited                         |
| `uploadedAt`    | TEXT    | ❌       | -       | Upload timestamp (ISO 8601)                 |
| `uploadedBy`    | TEXT    | ❌       | -       | Uploader: `'USER'`, `'SYSTEM'`              |
| `createdAt`     | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)               |

**Foreign Keys**:

- `transactionID` → `TRANSACTION.transactionID` (ON DELETE CASCADE)

**Indexes**:

- `transactionID`

---

### 13. PAYMENT_METHOD Collection

**Primary Key**: `methodID` (TEXT)

**Note**: Firestore uses `PAYMENT_METHHOD` (typo), SQLite uses `PAYMENT_METHOD` (correct spelling)

| Field            | Type    | Required | Default | Description                                                                              |
| ---------------- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `methodID`       | TEXT    | ✅       | -       | Unique payment method identifier                                                         |
| `userID`         | TEXT    | ✅       | -       | User who owns this payment method                                                        |
| `methodType`     | TEXT    | ❌       | -       | Payment type: `'CASH'`, `'DEBIT_CARD'`, `'CREDIT_CARD'`, `'E_WALLET'`, `'BANK_TRANSFER'` |
| `name`           | TEXT    | ✅       | -       | Payment method name                                                                      |
| `lastFourDigits` | TEXT    | ❌       | -       | Last 4 digits of card (if applicable)                                                    |
| `icon`           | TEXT    | ❌       | -       | Icon name/identifier                                                                     |
| `color`          | TEXT    | ❌       | -       | Display color (hex code)                                                                 |
| `isDefault`      | BOOLEAN | ❌       | `FALSE` | Is default payment method                                                                |
| `isActive`       | BOOLEAN | ❌       | `TRUE`  | Is payment method active                                                                 |
| `displayOrder`   | INTEGER | ❌       | `0`     | Display order for sorting                                                                |
| `balance`        | REAL    | ❌       | -       | Current balance (if applicable)                                                          |
| `notes`          | TEXT    | ❌       | -       | Additional notes                                                                         |
| `createdAt`      | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                                                            |
| `updatedAt`      | TEXT    | ❌       | -       | Last update timestamp (ISO 8601)                                                         |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`

---

### 14. MERCHANT Collection

**Primary Key**: `merchantID` (TEXT)

**Note**: Firestore uses `MERCHART` (typo), SQLite uses `MERCHANT` (correct spelling)

| Field               | Type    | Required | Default | Description                       |
| ------------------- | ------- | -------- | ------- | --------------------------------- |
| `merchantID`        | TEXT    | ✅       | -       | Unique merchant identifier        |
| `name`              | TEXT    | ✅       | -       | Merchant name                     |
| `category`          | TEXT    | ❌       | -       | Merchant category                 |
| `defaultCategoryID` | TEXT    | ❌       | -       | Default category for transactions |
| `logo`              | TEXT    | ❌       | -       | Logo URL                          |
| `address`           | TEXT    | ❌       | -       | Merchant address                  |
| `latitude`          | REAL    | ❌       | -       | Location latitude                 |
| `longitude`         | REAL    | ❌       | -       | Location longitude                |
| `phone`             | TEXT    | ❌       | -       | Contact phone number              |
| `website`           | TEXT    | ❌       | -       | Website URL                       |
| `keywords`          | TEXT    | ❌       | -       | Search keywords (JSON array)      |
| `usageCount`        | INTEGER | ❌       | `0`     | Number of times used              |
| `isVerified`        | BOOLEAN | ❌       | `FALSE` | Is merchant verified              |
| `createdAt`         | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)     |

**Foreign Keys**:

- `defaultCategoryID` → `CATEGORY.categoryID` (ON DELETE SET NULL)

**Indexes**:

- `usageCount`, `isVerified`

---

### 15. TAG Collection

**Primary Key**: `tagID` (TEXT)

| Field         | Type    | Required | Default | Description                   |
| ------------- | ------- | -------- | ------- | ----------------------------- |
| `tagID`       | TEXT    | ✅       | -       | Unique tag identifier         |
| `userID`      | TEXT    | ✅       | -       | User who owns this tag        |
| `name`        | TEXT    | ✅       | -       | Tag name                      |
| `color`       | TEXT    | ❌       | -       | Tag color (hex code)          |
| `icon`        | TEXT    | ❌       | -       | Tag icon name                 |
| `description` | TEXT    | ❌       | -       | Tag description               |
| `usageCount`  | INTEGER | ❌       | `0`     | Number of times used          |
| `createdAt`   | TEXT    | ❌       | -       | Creation timestamp (ISO 8601) |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`

---

### 16. TRANSACTION_TAG Collection

**Primary Key**: `id` (TEXT)

**Purpose**: Many-to-many relationship between transactions and tags

| Field           | Type | Required | Default | Description                    |
| --------------- | ---- | -------- | ------- | ------------------------------ |
| `id`            | TEXT | ✅       | -       | Unique relationship identifier |
| `transactionID` | TEXT | ✅       | -       | Transaction ID                 |
| `tagID`         | TEXT | ✅       | -       | Tag ID                         |
| `taggedAt`      | TEXT | ❌       | -       | Tagging timestamp (ISO 8601)   |

**Foreign Keys**:

- `transactionID` → `TRANSACTION.transactionID` (ON DELETE CASCADE)
- `tagID` → `TAG.tagID` (ON DELETE CASCADE)

**Indexes**:

- `transactionID`, `tagID`

---

### 17. SPLIT_TRANSACTION Collection

**Primary Key**: `splitID` (TEXT)

| Field                 | Type | Required | Default | Description                                             |
| --------------------- | ---- | -------- | ------- | ------------------------------------------------------- |
| `splitID`             | TEXT | ✅       | -       | Unique split identifier                                 |
| `parentTransactionID` | TEXT | ✅       | -       | Parent transaction ID                                   |
| `childTransactionID`  | TEXT | ❌       | -       | Child transaction ID (if split creates new transaction) |
| `splitAmount`         | REAL | ✅       | -       | Split amount                                            |
| `splitPercentage`     | REAL | ❌       | -       | Split percentage                                        |
| `participantName`     | TEXT | ❌       | -       | Participant name                                        |
| `notes`               | TEXT | ❌       | -       | Split notes                                             |
| `createdAt`           | TEXT | ❌       | -       | Creation timestamp (ISO 8601)                           |

**Foreign Keys**:

- `parentTransactionID` → `TRANSACTION.transactionID` (ON DELETE CASCADE)

**Indexes**:

- `parentTransactionID`

---

### 18. REPORT Collection

**Primary Key**: `reportID` (TEXT)

| Field                | Type    | Required | Default | Description                                                     |
| -------------------- | ------- | -------- | ------- | --------------------------------------------------------------- |
| `reportID`           | TEXT    | ✅       | -       | Unique report identifier                                        |
| `userID`             | TEXT    | ✅       | -       | User who owns this report                                       |
| `reportType`         | TEXT    | ❌       | -       | Report type: `'MONTHLY'`, `'QUARTERLY'`, `'YEARLY'`, `'CUSTOM'` |
| `period`             | TEXT    | ❌       | -       | Report period (e.g., `'2025-01'`, `'2025-Q1'`)                  |
| `totalIncome`        | REAL    | ❌       | -       | Total income in period                                          |
| `totalExpense`       | REAL    | ❌       | -       | Total expense in period                                         |
| `balance`            | REAL    | ❌       | -       | Balance (income - expense)                                      |
| `savingsRate`        | REAL    | ❌       | -       | Savings rate percentage                                         |
| `transactionCount`   | INTEGER | ❌       | -       | Number of transactions                                          |
| `categoryBreakdown`  | TEXT    | ❌       | -       | Category breakdown (JSON object)                                |
| `topCategories`      | TEXT    | ❌       | -       | Top categories (JSON array)                                     |
| `comparisonPrevious` | TEXT    | ❌       | -       | Comparison with previous period (JSON object)                   |
| `insights`           | TEXT    | ❌       | -       | Report insights (text)                                          |
| `generatedAt`        | TEXT    | ❌       | -       | Generation timestamp (ISO 8601)                                 |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`

---

### 19. APP_SETTINGS Collection

**Primary Key**: `settingID` (TEXT)

| Field                 | Type    | Required | Default | Description                                          |
| --------------------- | ------- | -------- | ------- | ---------------------------------------------------- |
| `settingID`           | TEXT    | ✅       | -       | Unique settings identifier                           |
| `userID`              | TEXT    | ✅       | -       | User who owns these settings                         |
| `currency`            | TEXT    | ❌       | -       | Currency code (VND, USD, etc.)                       |
| `language`            | TEXT    | ❌       | -       | Language code (vi, en, etc.)                         |
| `timezone`            | TEXT    | ❌       | -       | Timezone                                             |
| `dateFormat`          | TEXT    | ❌       | -       | Date format (e.g., `'DD/MM/YYYY'`)                   |
| `theme`               | TEXT    | ❌       | -       | Theme: `'LIGHT'`, `'DARK'`, `'AUTO'`                 |
| `budgetRule`          | TEXT    | ❌       | -       | Budget rule (e.g., `'50-30-20'`)                     |
| `notificationEnabled` | BOOLEAN | ❌       | `TRUE`  | Are notifications enabled                            |
| `notificationTime`    | TEXT    | ❌       | -       | Notification time (e.g., `'20:00'`)                  |
| `reminderFrequency`   | TEXT    | ❌       | -       | Reminder frequency: `'DAILY'`, `'WEEKLY'`            |
| `biometricEnabled`    | BOOLEAN | ❌       | `FALSE` | Is biometric authentication enabled                  |
| `autoBackup`          | BOOLEAN | ❌       | `FALSE` | Is auto backup enabled                               |
| `backupFrequency`     | TEXT    | ❌       | -       | Backup frequency: `'DAILY'`, `'WEEKLY'`, `'MONTHLY'` |
| `privacyMode`         | BOOLEAN | ❌       | `FALSE` | Is privacy mode enabled                              |
| `createdAt`           | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                        |
| `updatedAt`           | TEXT    | ❌       | -       | Last update timestamp (ISO 8601)                     |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE CASCADE)

**Indexes**:

- `userID`

---

### 20. CATEGORY_BUDGET_TEMPLATE Collection

**Primary Key**: `templateID` (TEXT)

| Field             | Type    | Required | Default | Description                                             |
| ----------------- | ------- | -------- | ------- | ------------------------------------------------------- |
| `templateID`      | TEXT    | ✅       | -       | Unique template identifier                              |
| `templateName`    | TEXT    | ✅       | -       | Template name                                           |
| `description`     | TEXT    | ❌       | -       | Template description                                    |
| `isSystemDefault` | BOOLEAN | ❌       | `FALSE` | Is system default template                              |
| `userID`          | TEXT    | ❌       | -       | User who owns this template (null for system templates) |
| `allocations`     | TEXT    | ❌       | -       | Budget allocations (JSON object)                        |
| `createdAt`       | TEXT    | ❌       | -       | Creation timestamp (ISO 8601)                           |

**Foreign Keys**:

- `userID` → `USER.userID` (ON DELETE SET NULL)

**Indexes**:

- `userID`, `isSystemDefault`

---

## 📐 Data Type Mappings

### Firestore ↔ SQLite

| Firestore Type | SQLite Type         | Conversion                                 |
| -------------- | ------------------- | ------------------------------------------ |
| `string`       | `TEXT`              | Direct mapping                             |
| `number`       | `REAL` or `INTEGER` | Direct mapping                             |
| `boolean`      | `INTEGER` (0/1)     | `true` → `1`, `false` → `0`                |
| `Timestamp`    | `TEXT` (ISO 8601)   | `Timestamp.toDate().toISOString()`         |
| `GeoPoint`     | `REAL` (lat/lng)    | Separate `latitude` and `longitude` fields |
| `Reference`    | `TEXT`              | Store document ID as string                |
| `Array`        | `TEXT` (JSON)       | `JSON.stringify()`                         |
| `Map`          | `TEXT` (JSON)       | `JSON.stringify()`                         |

### Common Field Patterns

- **Timestamps**: Always stored as ISO 8601 strings (`2025-01-10T10:00:00Z`)
- **Booleans**: Stored as `INTEGER` (0 or 1) in SQLite, `boolean` in Firestore
- **JSON Fields**: Stored as JSON strings, parsed when needed
- **Amounts**: Stored as `REAL` (floating point) for currency values

## 🔄 Synchronization Flow

### Download (Firestore → SQLite)

1. App connects to Firestore
2. Fetch collections from Firestore
3. Transform Firestore data to SQLite format
4. Insert/Update records in SQLite
5. Mark records as `isSynced = true`

### Upload (SQLite → Firestore)

1. User creates/updates records offline
2. Records marked as `isSynced = false`
3. When online, fetch unsynced records
4. Upload to Firestore
5. Mark records as `isSynced = true`

## 🔧 Configuration

### Firestore Collection Names

```javascript
// web-admin/src/constants/collections.js
export const COLLECTIONS = {
  USERS: "USER",
  CATEGORIES: "CATEGORY",
  TRANSACTIONS: "TRANSACTION",
  // ...
};
```

### SQLite Table Names

```javascript
// FamilyBudgetExpo/src/database/database.js
// Tables use UPPERCASE: USER, CATEGORY, TRANSACTION, etc.
```

### Field Mapping

- All fields use camelCase: `userID`, `createdAt`, `categoryID`
- Timestamps: Firestore `Timestamp` ↔ SQLite ISO string
- Booleans: Firestore `true/false` ↔ SQLite `1/0`

## 📝 CSV Files

CSV files in `public/data/` are used for:

- Initial data seeding
- Data migration
- Backup/restore

### CSV Format

- Headers: camelCase field names
- Values: Comma-separated
- Timestamps: ISO 8601 format (`2025-01-10T10:00:00Z`)
- JSON fields: JSON stringified
- Strings with commas: Quoted

### Generate CSV Files

```javascript
import generateCSVFiles from "@/utils/generateCSVFiles";

// Generate all CSV files from Firestore
await generateCSVFiles("public/data");
```

## ✅ Validation

### Validate CSV Structure

```javascript
import { validateAllCSVFiles } from "@/utils/validateDatabaseStructure";

const validation = await validateAllCSVFiles(csvFiles);
console.log(validation);
```

### Validate Data Before Sync

```javascript
import { validateDataStructure } from "@/utils/syncHelper";

validateDataStructure(data, "USER");
```

## 🐛 Troubleshooting

### Sync Issues

1. Check `SYNC_LOG` table for errors
2. Verify network connection
3. Check Firestore permissions
4. Validate data structure before sync

### Data Mismatches

1. Compare Firestore and SQLite records
2. Check timestamp fields
3. Verify primary keys match
4. Review sync logs

### Performance Issues

1. Sync in batches (500 records max)
2. Use transactions for bulk operations
3. Index frequently queried fields
4. Clean up old sync logs

## 📚 Additional Resources

- [Detailed Sync Documentation](./src/docs/DATABASE_SYNC.md)
- [Database Mapping](./src/constants/databaseMapping.js)
- [Sync Service](./src/services/syncService.js)

## 🔐 Security Notes

- Never sync password hashes to client
- Validate all data before inserting
- Use transactions for data integrity
- Log all sync operations
- Handle conflicts gracefully

## 🎯 Best Practices

1. **Always use transactions** for multi-record operations
2. **Check sync status** before modifying records
3. **Handle errors gracefully** and log to `SYNC_LOG`
4. **Sync in batches** to avoid timeouts
5. **Validate data** before inserting
6. **Clean up old logs** periodically
7. **Test sync** in both directions
8. **Monitor sync statistics** regularly

## 📞 Support

For issues or questions:

1. Check sync logs in `SYNC_LOG` table
2. Review error messages in console
3. Validate data structure
4. Check network connectivity
5. Verify Firestore permissions

---

**Last Updated**: 2025-01-14
**Version**: 1.0.0
