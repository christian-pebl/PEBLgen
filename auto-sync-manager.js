// auto-sync-manager.js
// Automatic Background Sync: IndexedDB ↔ Supabase
// This file runs silently in the background, syncing data to Supabase for backup
// and auto-restoring if browser cache is cleared.

console.log('🔄 [AUTO-SYNC] Sync manager loaded');

// Configuration
const SYNC_CONFIG = {
    enabled: true,                    // Set to false to disable auto-sync
    syncDelay: 2000,                 // Wait 2 seconds after change before syncing (debounce)
    retryAttempts: 3,                // Retry failed syncs
    retryDelay: 5000,                // Wait 5 seconds between retries
    showNotifications: true,         // Show sync status notifications
    autoRestore: true,               // Auto-restore on cache clear
    logVerbose: false,               // Detailed logging (set true for debugging)
};

// Sync queue (prevents duplicate syncs)
const syncQueue = new Set();
let syncTimeout = null;
let isSyncing = false;
let lastSyncTime = null;

// Track what's been synced (prevent duplicate uploads)
const syncedItems = {
    projects: new Set(),
    csvFiles: new Set(),
    invoices: new Set(),
    sketcherCsvs: new Set(),
};

// Restore flag (check once per session)
let hasCheckedRestore = false;

/**
 * Initialize auto-sync system
 */
async function initAutoSync() {
    if (!SYNC_CONFIG.enabled) {
        console.log('ℹ️ [AUTO-SYNC] Disabled in config');
        return;
    }

    log('Initializing auto-sync system...');

    // Wait for Supabase to be ready
    await waitForSupabase();

    if (!supabaseClient) {
        console.error('❌ [AUTO-SYNC] Supabase not available, sync disabled');
        return;
    }

    // Authenticate
    await ensureAuthenticated();

    if (!currentUser) {
        console.error('❌ [AUTO-SYNC] Authentication failed, sync disabled');
        return;
    }

    log(`Authenticated as: ${currentUser.id}`);

    // Check if restore is needed (only once per session)
    if (SYNC_CONFIG.autoRestore && !hasCheckedRestore) {
        await checkAndRestore();
        hasCheckedRestore = true;
    }

    // Set up periodic sync check (every 5 minutes)
    setInterval(() => {
        if (!isSyncing && syncQueue.size === 0) {
            log('Periodic sync check...');
            queueFullSync();
        }
    }, 5 * 60 * 1000);

    log('✅ Auto-sync initialized');
    showNotification('🔄 Backup enabled', 'Your data is automatically backed up to cloud', 'success');
}

/**
 * Logging helper
 */
function log(message, type = 'info') {
    if (SYNC_CONFIG.logVerbose || type === 'error') {
        const prefix = type === 'error' ? '❌' : 'ℹ️';
        console.log(`${prefix} [AUTO-SYNC] ${message}`);
    }
}

/**
 * Show user notification (optional)
 */
function showNotification(title, message, type = 'info') {
    if (!SYNC_CONFIG.showNotifications) return;

    // Try to use existing toast system if available
    if (typeof showToast === 'function') {
        showToast(title, type);
    } else {
        // Fallback to console
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
}

/**
 * Check if IndexedDB is empty and restore from Supabase if needed
 */
async function checkAndRestore() {
    log('Checking if restore is needed...');

    try {
        // Check all databases
        const needsRestore = await detectCacheClear();

        if (needsRestore) {
            log('⚠️ Cache clear detected! Starting automatic restore...');
            showNotification('🔄 Restoring data...', 'Recovering your data from backup', 'info');

            await restoreAllData();

            log('✅ Restore complete!');
            showNotification('✅ Data restored!', 'Your data has been recovered successfully', 'success');
        } else {
            log('No restore needed, data intact');
        }

    } catch (error) {
        console.error('❌ [AUTO-SYNC] Restore check failed:', error);
    }
}

/**
 * Detect if browser cache was cleared
 * Returns true if IndexedDB is empty but Supabase has data
 */
async function detectCacheClear() {
    try {
        // Check if main database exists and has data
        const db = await openIndexedDB('PEBLGrantsBudgets', 6);

        if (!db) {
            log('Database not found, checking Supabase...');

            // Check if Supabase has data
            const { count } = await supabaseClient
                .from('projects')
                .select('*', { count: 'exact', head: true });

            return count > 0; // If Supabase has data, we need to restore
        }

        // Check if stores are empty
        const hasProjects = await checkStoreHasData(db, 'projects');
        const hasCsvFiles = await checkStoreHasData(db, 'csvFiles');

        if (!hasProjects && !hasCsvFiles) {
            // IndexedDB empty, check Supabase
            const { count } = await supabaseClient
                .from('projects')
                .select('*', { count: 'exact', head: true });

            return count > 0;
        }

        return false; // Data exists in IndexedDB

    } catch (error) {
        log(`Error detecting cache clear: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Open IndexedDB database (helper)
 */
function openIndexedDB(dbName, version) {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName, version);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);

        // Don't trigger upgrade, just check
        request.onupgradeneeded = (event) => {
            event.target.transaction.abort();
            resolve(null);
        };

        setTimeout(() => resolve(null), 3000); // Timeout after 3 seconds
    });
}

/**
 * Check if object store has data
 */
function checkStoreHasData(db, storeName) {
    return new Promise((resolve) => {
        try {
            if (!db.objectStoreNames.contains(storeName)) {
                resolve(false);
                return;
            }

            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();

            countRequest.onsuccess = () => resolve(countRequest.result > 0);
            countRequest.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

/**
 * Restore all data from Supabase to IndexedDB
 */
async function restoreAllData() {
    log('Starting full restore from Supabase...');

    try {
        // Restore projects
        await restoreProjects();

        // Restore CSV files
        await restoreCsvFiles();

        // Restore invoices
        await restoreInvoices();

        // Restore sketcher CSVs
        await restoreSketcherCsvs();

        // Restore gantt projects
        await restoreGanttProjects();

        log('✅ All data restored successfully');

    } catch (error) {
        console.error('❌ [AUTO-SYNC] Restore failed:', error);
        showNotification('⚠️ Restore incomplete', 'Some data could not be recovered', 'warning');
    }
}

/**
 * Restore projects from Supabase to IndexedDB
 */
async function restoreProjects() {
    try {
        const { data: projects, error } = await supabaseClient
            .from('projects')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (!projects || projects.length === 0) return;

        log(`Restoring ${projects.length} projects...`);

        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db) throw new Error('Could not open database');

        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');

        for (const project of projects) {
            // Convert Supabase format back to IndexedDB format
            const indexedDBProject = {
                ...project.budget_data,
                projectName: project.project_name,
                projectNumber: project.project_number,
                lastModified: project.last_modified,
            };

            await new Promise((resolve, reject) => {
                const request = store.put(indexedDBProject);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }

        log(`✅ Restored ${projects.length} projects`);

    } catch (error) {
        log(`Failed to restore projects: ${error.message}`, 'error');
    }
}

/**
 * Restore CSV files from Supabase Storage to IndexedDB
 */
async function restoreCsvFiles() {
    try {
        const { data: csvFiles, error } = await supabaseClient
            .from('csv_files')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (!csvFiles || csvFiles.length === 0) return;

        log(`Restoring ${csvFiles.length} CSV files...`);

        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db) throw new Error('Could not open database');

        const transaction = db.transaction(['csvFiles'], 'readwrite');
        const store = transaction.objectStore('csvFiles');

        for (const csvFile of csvFiles) {
            // Download file from storage
            const { data: fileData, error: downloadError } = await supabaseClient
                .storage
                .from('csv-files')
                .download(csvFile.file_path);

            if (downloadError) {
                log(`Failed to download ${csvFile.file_name}: ${downloadError.message}`, 'error');
                continue;
            }

            // Store in IndexedDB
            const indexedDBFile = {
                fileName: csvFile.file_name,
                uploadDate: csvFile.upload_date,
                data: await fileData.text(),
                fileSize: csvFile.file_size,
            };

            await new Promise((resolve, reject) => {
                const request = store.put(indexedDBFile);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }

        log(`✅ Restored ${csvFiles.length} CSV files`);

    } catch (error) {
        log(`Failed to restore CSV files: ${error.message}`, 'error');
    }
}

/**
 * Restore invoices from Supabase Storage to IndexedDB
 */
async function restoreInvoices() {
    try {
        const { data: invoices, error } = await supabaseClient
            .from('invoices')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (!invoices || invoices.length === 0) return;

        log(`Restoring ${invoices.length} invoices...`);

        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db) throw new Error('Could not open database');

        const transaction = db.transaction(['invoices'], 'readwrite');
        const store = transaction.objectStore('invoices');

        for (const invoice of invoices) {
            // Download file from storage
            const { data: fileData, error: downloadError } = await supabaseClient
                .storage
                .from('invoices')
                .download(invoice.file_path);

            if (downloadError) {
                log(`Failed to download ${invoice.filename}: ${downloadError.message}`, 'error');
                continue;
            }

            // Store in IndexedDB
            const indexedDBInvoice = {
                filename: invoice.filename,
                uploadDate: invoice.upload_date,
                blob: fileData,
                transactionIndex: invoice.transaction_index,
                gmailMessageId: invoice.gmail_message_id,
            };

            await new Promise((resolve, reject) => {
                const request = store.put(indexedDBInvoice);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }

        log(`✅ Restored ${invoices.length} invoices`);

    } catch (error) {
        log(`Failed to restore invoices: ${error.message}`, 'error');
    }
}

/**
 * Restore sketcher CSVs from Supabase to IndexedDB
 */
async function restoreSketcherCsvs() {
    try {
        const { data: csvs, error } = await supabaseClient
            .from('sketcher_csv_imports')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (!csvs || csvs.length === 0) return;

        log(`Restoring ${csvs.length} sketcher CSVs...`);

        const db = await openIndexedDB('MarineSpeciesSketcherDB', 1);
        if (!db) throw new Error('Could not open database');

        const transaction = db.transaction(['csvImports'], 'readwrite');
        const store = transaction.objectStore('csvImports');

        for (const csv of csvs) {
            // Download file from storage
            const { data: fileData, error: downloadError } = await supabaseClient
                .storage
                .from('sketcher-csvs')
                .download(csv.file_path);

            if (downloadError) {
                log(`Failed to download ${csv.file_name}: ${downloadError.message}`, 'error');
                continue;
            }

            // Parse CSV data
            const csvText = await fileData.text();
            const rows = csvText.split('\n').map(row => row.split(','));

            // Store in IndexedDB
            const indexedDBCsv = {
                fileName: csv.file_name,
                uploadDate: csv.upload_date,
                data: rows,
                rowCount: csv.row_count,
            };

            await new Promise((resolve, reject) => {
                const request = store.put(indexedDBCsv);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }

        log(`✅ Restored ${csvs.length} sketcher CSVs`);

    } catch (error) {
        log(`Failed to restore sketcher CSVs: ${error.message}`, 'error');
    }
}

/**
 * Restore gantt projects from Supabase to localStorage
 */
async function restoreGanttProjects() {
    try {
        const { data: projects, error } = await supabaseClient
            .from('gantt_projects')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (!projects || projects.length === 0) return;

        log(`Restoring ${projects.length} gantt projects...`);

        // Store in localStorage
        const projectsData = projects.map(p => p.project_data);
        localStorage.setItem('ganttProjects', JSON.stringify(projectsData));

        log(`✅ Restored ${projects.length} gantt projects`);

    } catch (error) {
        log(`Failed to restore gantt projects: ${error.message}`, 'error');
    }
}

/**
 * Queue a full sync (checks all data and syncs what's missing)
 */
function queueFullSync() {
    syncQueue.add('full');
    scheduleSyncExecution();
}

/**
 * Queue sync for specific item
 */
function queueSync(type, data) {
    const syncKey = `${type}:${JSON.stringify(data)}`;
    syncQueue.add(syncKey);
    scheduleSyncExecution();
}

/**
 * Schedule sync execution (debounced)
 */
function scheduleSyncExecution() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(() => {
        executeSyncQueue();
    }, SYNC_CONFIG.syncDelay);
}

/**
 * Execute all queued syncs
 */
async function executeSyncQueue() {
    if (isSyncing || syncQueue.size === 0) return;

    isSyncing = true;
    log(`Processing ${syncQueue.size} sync operations...`);

    try {
        await ensureAuthenticated();

        // Process queue
        const operations = Array.from(syncQueue);
        syncQueue.clear();

        for (const operation of operations) {
            if (operation === 'full') {
                await syncAllData();
            } else {
                // Parse and sync specific item
                // Format: "type:data"
                const [type, dataJson] = operation.split(':');
                const data = JSON.parse(dataJson);
                await syncItem(type, data);
            }
        }

        lastSyncTime = new Date();
        log(`✅ Sync complete at ${lastSyncTime.toLocaleTimeString()}`);

    } catch (error) {
        log(`Sync failed: ${error.message}`, 'error');
    } finally {
        isSyncing = false;
    }
}

/**
 * Sync all data from IndexedDB to Supabase
 */
async function syncAllData() {
    log('Starting full sync...');

    try {
        await syncProjects();
        await syncCsvFiles();
        await syncInvoices();
        await syncSketcherCsvs();
        await syncGanttProjects();
    } catch (error) {
        log(`Full sync failed: ${error.message}`, 'error');
    }
}

/**
 * Sync projects to Supabase
 */
async function syncProjects() {
    try {
        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db || !db.objectStoreNames.contains('projects')) return;

        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const projects = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });

        for (const project of projects) {
            const projectKey = `${project.projectName}_${project.projectNumber}`;

            if (syncedItems.projects.has(projectKey)) continue;

            await supabaseClient
                .from('projects')
                .upsert({
                    user_id: currentUser.id,
                    project_name: project.projectName,
                    project_number: project.projectNumber,
                    budget_data: project,
                    last_modified: project.lastModified || new Date().toISOString(),
                }, {
                    onConflict: 'user_id,project_name'
                });

            syncedItems.projects.add(projectKey);
        }

        log(`Synced ${projects.length} projects`);

    } catch (error) {
        log(`Failed to sync projects: ${error.message}`, 'error');
    }
}

/**
 * Sync CSV files to Supabase
 */
async function syncCsvFiles() {
    try {
        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db || !db.objectStoreNames.contains('csvFiles')) return;

        const transaction = db.transaction(['csvFiles'], 'readonly');
        const store = transaction.objectStore('csvFiles');
        const csvFiles = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });

        for (const csvFile of csvFiles) {
            if (syncedItems.csvFiles.has(csvFile.fileName)) continue;

            const filePath = `${currentUser.id}/${csvFile.fileName}`;
            const fileBlob = typeof csvFile.data === 'string'
                ? new Blob([csvFile.data], { type: 'text/csv' })
                : csvFile.data;

            // Upload file
            await supabaseClient.storage
                .from('csv-files')
                .upload(filePath, fileBlob, { upsert: true });

            // Create metadata record
            await supabaseClient
                .from('csv_files')
                .upsert({
                    user_id: currentUser.id,
                    file_name: csvFile.fileName,
                    file_path: filePath,
                    file_size: fileBlob.size,
                    upload_date: csvFile.uploadDate || new Date().toISOString(),
                });

            syncedItems.csvFiles.add(csvFile.fileName);
        }

        log(`Synced ${csvFiles.length} CSV files`);

    } catch (error) {
        log(`Failed to sync CSV files: ${error.message}`, 'error');
    }
}

/**
 * Sync invoices to Supabase
 */
async function syncInvoices() {
    try {
        const db = await openIndexedDB('PEBLGrantsBudgets', 6);
        if (!db || !db.objectStoreNames.contains('invoices')) return;

        const transaction = db.transaction(['invoices'], 'readonly');
        const store = transaction.objectStore('invoices');
        const invoices = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });

        for (const invoice of invoices) {
            if (syncedItems.invoices.has(invoice.filename)) continue;

            const filePath = `${currentUser.id}/${invoice.filename}`;

            // Upload file
            await supabaseClient.storage
                .from('invoices')
                .upload(filePath, invoice.blob, { upsert: true });

            // Create metadata record
            await supabaseClient
                .from('invoices')
                .upsert({
                    user_id: currentUser.id,
                    filename: invoice.filename,
                    file_path: filePath,
                    transaction_index: invoice.transactionIndex,
                    gmail_message_id: invoice.gmailMessageId,
                    upload_date: invoice.uploadDate || new Date().toISOString(),
                });

            syncedItems.invoices.add(invoice.filename);
        }

        log(`Synced ${invoices.length} invoices`);

    } catch (error) {
        log(`Failed to sync invoices: ${error.message}`, 'error');
    }
}

/**
 * Sync sketcher CSVs to Supabase
 */
async function syncSketcherCsvs() {
    try {
        const db = await openIndexedDB('MarineSpeciesSketcherDB', 1);
        if (!db || !db.objectStoreNames.contains('csvImports')) return;

        const transaction = db.transaction(['csvImports'], 'readonly');
        const store = transaction.objectStore('csvImports');
        const csvs = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });

        for (const csv of csvs) {
            if (syncedItems.sketcherCsvs.has(csv.fileName)) continue;

            const filePath = `${currentUser.id}/${csv.fileName}`;

            // Convert data to CSV string
            const csvContent = Array.isArray(csv.data)
                ? csv.data.map(row => Object.values(row).join(',')).join('\n')
                : csv.data;

            const csvBlob = new Blob([csvContent], { type: 'text/csv' });

            // Upload file
            await supabaseClient.storage
                .from('sketcher-csvs')
                .upload(filePath, csvBlob, { upsert: true });

            // Create metadata record
            await supabaseClient
                .from('sketcher_csv_imports')
                .upsert({
                    user_id: currentUser.id,
                    file_name: csv.fileName,
                    file_path: filePath,
                    row_count: csv.rowCount,
                    upload_date: csv.uploadDate || new Date().toISOString(),
                });

            syncedItems.sketcherCsvs.add(csv.fileName);
        }

        log(`Synced ${csvs.length} sketcher CSVs`);

    } catch (error) {
        log(`Failed to sync sketcher CSVs: ${error.message}`, 'error');
    }
}

/**
 * Sync gantt projects to Supabase
 */
async function syncGanttProjects() {
    try {
        const ganttProjectsJson = localStorage.getItem('ganttProjects') || localStorage.getItem('peblgen_gantt_projects');
        if (!ganttProjectsJson) return;

        const ganttProjects = JSON.parse(ganttProjectsJson);
        const projectsArray = Array.isArray(ganttProjects) ? ganttProjects : [ganttProjects];

        for (const project of projectsArray) {
            await supabaseClient
                .from('gantt_projects')
                .upsert({
                    user_id: currentUser.id,
                    project_name: project.name || 'Unnamed Project',
                    project_data: project,
                }, {
                    onConflict: 'user_id,project_name'
                });
        }

        log(`Synced ${projectsArray.length} gantt projects`);

    } catch (error) {
        log(`Failed to sync gantt projects: ${error.message}`, 'error');
    }
}

/**
 * Sync individual item
 */
async function syncItem(type, data) {
    log(`Syncing ${type}...`);

    switch (type) {
        case 'project':
            await syncProjects();
            break;
        case 'csvFile':
            await syncCsvFiles();
            break;
        case 'invoice':
            await syncInvoices();
            break;
        case 'sketcherCsv':
            await syncSketcherCsvs();
            break;
        case 'ganttProject':
            await syncGanttProjects();
            break;
        default:
            log(`Unknown sync type: ${type}`, 'error');
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoSync);
} else {
    // DOMContentLoaded already fired
    setTimeout(initAutoSync, 1000); // Small delay to ensure other scripts load
}

// Export functions for manual triggering if needed
window.autoSync = {
    queueFullSync,
    queueSync,
    checkAndRestore,
    getLastSyncTime: () => lastSyncTime,
    isSyncing: () => isSyncing,
    config: SYNC_CONFIG,
};

console.log('✅ [AUTO-SYNC] Sync manager ready');
