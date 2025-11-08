# Database Synchronization Guide

## Overview

This project uses a dual-database architecture:
- **Firestore** (Web Admin): Source of Truth
- **SQLite** (React Native App): Local database for offline support

Both databases use the same structure:
- **Table/Collection Names**: UPPERCASE (e.g., `USER`, `TRANSACTION`)
- **Field Names**: camelCase (e.g., `userID`, `createdAt`)

## Database Structure

### Core Entities
- `USER` - User accounts
- `CATEGORY` - Transaction categories
- `TRANSACTION` - Financial transactions
- `BUDGET` - Budget plans
- `GOAL` - Savings goals

### Recurring & History
- `RECURRING_TXN` - Recurring transactions
- `BUDGET_HISTORY` - Budget change history
- `GOAL_CONTRIBUTION` - Goal contributions

### System
- `SYNC_LOG` - Synchronization logs
- `NOTIFICATION` - User notifications
- `DEVICE` - Device information

### Media & Attachments
- `ATTACHMENT` - Transaction attachments

### Payment & Merchants
- `PAYMENT_METHOD` - Payment methods (Note: Firestore uses `PAYMENT_METHHOD` typo)
- `MERCHANT` - Merchant information (Note: Firestore uses `MERCHART` typo)

### Tags & Organization
- `TAG` - Transaction tags
- `TRANSACTION_TAG` - Transaction-tag relationships
- `SPLIT_TRANSACTION` - Split transactions

### Reports & Settings
- `REPORT` - Generated reports
- `APP_SETTINGS` - Application settings
- `CATEGORY_BUDGET_TEMPLATE` - Budget templates

## Synchronization Flow

### 1. Firestore → SQLite (Download)
When the app starts or periodically:
1. Fetch data from Firestore
2. Transform Firestore data to SQLite format
3. Insert/Update records in SQLite
4. Mark records as synced

### 2. SQLite → Firestore (Upload)
When user creates/updates records offline:
1. Mark records as `isSynced = false` in SQLite
2. When online, fetch unsynced records
3. Upload to Firestore
4. Mark records as `isSynced = true`

## Usage

### Web Admin (Firestore → CSV)

```javascript
import syncService from "@/services/syncService";
import { exportAllCollectionsToCSV } from "@/utils/csvExportService";

// Export all collections to CSV
const csvData = await exportAllCollectionsToCSV();

// Or export single collection
const userCSV = await syncService.exportCollectionToJSON("USER");
```

### React Native (SQLite ↔ Firestore)

```javascript
import syncService from "@/services/syncService";

// Sync from Firestore to SQLite
const firestoreData = await fetchFromFirestore("USER");
await syncService.syncFromFirestore("USER", firestoreData);

// Get unsynced records
const unsynced = await syncService.getUnsyncedRecords("TRANSACTION");

// Mark as synced after upload
await syncService.markRecordsAsSynced("TRANSACTION", "transactionID", [id1, id2]);
```

## Field Mapping

### Timestamp Fields
- Firestore: `Timestamp` object
- SQLite: ISO 8601 string (e.g., `2025-01-10T10:00:00Z`)

### Boolean Fields
- Firestore: `true`/`false`
- SQLite: `1`/`0` (stored as INTEGER)

### JSON Fields
- Firestore: Native objects/arrays
- SQLite: JSON string (use `JSON.parse()`/`JSON.stringify()`)

## Primary Keys

Each table has a primary key field:
- `USER`: `userID`
- `CATEGORY`: `categoryID`
- `TRANSACTION`: `transactionID`
- `BUDGET`: `budgetID`
- `GOAL`: `goalID`
- etc.

## Sync Status

Records have an `isSynced` field to track synchronization status:
- `true` or `1`: Synced with Firestore
- `false` or `0`: Not synced (pending upload)

## Conflict Resolution

When conflicts occur (same record modified in both databases):
1. Firestore timestamp is compared with SQLite `lastModifiedAt`
2. Most recent version wins
3. Conflict is logged in `SYNC_LOG` table

## Best Practices

1. **Always use transactions** when syncing multiple records
2. **Check sync status** before modifying records
3. **Handle errors gracefully** and log to `SYNC_LOG`
4. **Sync in batches** to avoid timeout
5. **Validate data** before inserting into SQLite

## CSV Files

CSV files in `public/data/` are used for:
- Initial data seeding
- Data migration
- Backup/restore

Format:
- Headers: camelCase field names
- Values: Comma-separated, strings quoted if containing commas
- Timestamps: ISO 8601 format
- JSON fields: JSON stringified

## Migration

When database structure changes:
1. Update SQLite schema in `database.js`
2. Update Firestore security rules
3. Update CSV files if needed
4. Create migration script if data transformation needed
5. Test sync in both directions

