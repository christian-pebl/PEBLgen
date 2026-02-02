// instant-invoice-sync.js
// Enhanced invoice backup system - uploads to Supabase Storage IMMEDIATELY when invoice is added
// Add this script to spend.html AFTER auto-sync-manager.js

console.log('📤 [INSTANT-SYNC] Instant invoice backup loaded');

// Configuration
const INSTANT_SYNC_CONFIG = {
    enabled: true,
    showNotifications: true,
    retryAttempts: 3,
    retryDelay: 2000,
};

// Track sync status
let instantSyncReady = false;
let storageHealthy = false;

/**
 * Initialize instant sync system
 */
async function initInstantSync() {
    console.log('📤 [INSTANT-SYNC] Initializing...');

    // Wait for Supabase to be ready
    await waitForSupabase();

    // Wait for authentication
    await ensureAuthenticated();

    // Verify storage buckets exist
    await verifyStorageBuckets();

    instantSyncReady = true;
    console.log('✅ [INSTANT-SYNC] Ready for instant backups');
}

/**
 * Verify storage buckets are properly configured
 */
async function verifyStorageBuckets() {
    try {
        console.log('📦 [INSTANT-SYNC] Checking storage buckets...');

        const { data: buckets, error } = await supabaseClient.storage.listBuckets();

        if (error) {
            console.error('❌ [INSTANT-SYNC] Cannot access storage:', error.message);
            storageHealthy = false;
            return;
        }

        const requiredBuckets = ['invoices', 'csv-files', 'sketcher-csvs'];
        const existingBuckets = buckets.map(b => b.name);

        console.log(`📦 [INSTANT-SYNC] Found buckets:`, existingBuckets);

        for (const bucketName of requiredBuckets) {
            if (!existingBuckets.includes(bucketName)) {
                console.warn(`⚠️ [INSTANT-SYNC] Missing bucket: ${bucketName}`);
                console.warn('   Creating bucket...');

                try {
                    await supabaseClient.storage.createBucket(bucketName, {
                        public: false,
                        fileSizeLimit: 52428800, // 50MB
                    });
                    console.log(`✅ [INSTANT-SYNC] Created bucket: ${bucketName}`);
                } catch (createError) {
                    console.error(`❌ [INSTANT-SYNC] Failed to create ${bucketName}:`, createError.message);
                }
            }
        }

        // Test upload capability
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        const testPath = `${currentUser.id}/test_${Date.now()}.txt`;

        const { error: uploadError } = await supabaseClient.storage
            .from('invoices')
            .upload(testPath, testBlob);

        if (uploadError) {
            console.error('❌ [INSTANT-SYNC] Upload test failed:', uploadError.message);
            storageHealthy = false;
            showSyncNotification('⚠️ Storage not working', 'Invoice backups may fail', 'error');
        } else {
            // Clean up test file
            await supabaseClient.storage.from('invoices').remove([testPath]);
            storageHealthy = true;
            console.log('✅ [INSTANT-SYNC] Storage is healthy');
        }

    } catch (error) {
        console.error('❌ [INSTANT-SYNC] Storage verification failed:', error.message);
        storageHealthy = false;
    }
}

/**
 * Instantly sync an invoice to Supabase Storage
 * Call this immediately after adding invoice to IndexedDB
 */
async function instantSyncInvoice(invoiceData) {
    if (!INSTANT_SYNC_CONFIG.enabled) return { success: false, error: 'Disabled' };
    if (!instantSyncReady) {
        console.warn('⚠️ [INSTANT-SYNC] Not ready yet, queuing for later...');
        return { success: false, error: 'Not ready' };
    }
    if (!storageHealthy) {
        console.error('❌ [INSTANT-SYNC] Storage unhealthy, cannot sync');
        return { success: false, error: 'Storage unhealthy' };
    }

    const startTime = Date.now();
    console.log(`📤 [INSTANT-SYNC] Uploading: ${invoiceData.filename}`);

    // Validate invoice data
    const blob = invoiceData.pdfBlob || invoiceData.blob;
    if (!blob) {
        console.error('❌ [INSTANT-SYNC] No blob found in invoice data. Available properties:', Object.keys(invoiceData));
        throw new Error('Invoice blob is missing - cannot upload to storage');
    }

    try {
        await ensureAuthenticated();

        const filePath = `${currentUser.id}/${invoiceData.filename}`;

        // Upload file to storage with retry
        let uploadSuccess = false;
        let lastError = null;

        for (let attempt = 1; attempt <= INSTANT_SYNC_CONFIG.retryAttempts; attempt++) {
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('invoices')
                .upload(filePath, blob, {
                    upsert: true,
                    contentType: blob.type || 'application/pdf'
                });

            if (uploadError) {
                lastError = uploadError;
                console.warn(`⚠️ [INSTANT-SYNC] Upload attempt ${attempt} failed: ${uploadError.message}`);

                if (attempt < INSTANT_SYNC_CONFIG.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, INSTANT_SYNC_CONFIG.retryDelay));
                }
            } else {
                uploadSuccess = true;
                break;
            }
        }

        if (!uploadSuccess) {
            throw lastError || new Error('Upload failed after retries');
        }

        console.log(`✅ [INSTANT-SYNC] File uploaded: ${filePath}`);

        // Save metadata to database
        const { error: dbError } = await supabaseClient
            .from('invoices')
            .upsert({
                user_id: currentUser.id,
                filename: invoiceData.filename,
                file_path: filePath,
                transaction_index: invoiceData.transactionIndex,
                gmail_message_id: invoiceData.gmailMessageId,
                upload_date: invoiceData.uploadDate || new Date().toISOString(),
                file_size: blob.size,
            }, {
                onConflict: 'user_id,filename'
            });

        if (dbError) {
            console.error('❌ [INSTANT-SYNC] Metadata save failed:', dbError.message);
            throw dbError;
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [INSTANT-SYNC] Complete in ${duration}ms: ${invoiceData.filename}`);

        if (INSTANT_SYNC_CONFIG.showNotifications) {
            showSyncNotification('✅ Backed up', invoiceData.filename, 'success');
        }

        return { success: true, duration };

    } catch (error) {
        console.error(`❌ [INSTANT-SYNC] Failed to sync ${invoiceData.filename}:`, error.message);

        if (INSTANT_SYNC_CONFIG.showNotifications) {
            showSyncNotification('❌ Backup failed', invoiceData.filename, 'error');
        }

        return { success: false, error: error.message };
    }
}

/**
 * Bulk sync multiple invoices (for initial upload or manual sync)
 */
async function bulkSyncInvoices(invoices) {
    console.log(`📤 [INSTANT-SYNC] Bulk syncing ${invoices.length} invoices...`);

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < invoices.length; i++) {
        const invoice = invoices[i];
        const result = await instantSyncInvoice(invoice);

        if (result.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push({ filename: invoice.filename, error: result.error });
        }

        // Progress update every 10 invoices
        if ((i + 1) % 10 === 0) {
            console.log(`📤 [INSTANT-SYNC] Progress: ${i + 1}/${invoices.length}`);
        }
    }

    console.log(`✅ [INSTANT-SYNC] Bulk sync complete: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Show notification for sync status
 */
function showSyncNotification(title, message, type = 'info') {
    if (!INSTANT_SYNC_CONFIG.showNotifications) return;

    // Try to use existing toast system
    if (typeof showSimpleToast === 'function') {
        showSimpleToast(`${title}: ${message}`, type);
    } else if (typeof showToast === 'function') {
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        showToast({ icon, title, message, bgColor, duration: 3000 });
    }
}

/**
 * Monitor IndexedDB for new invoices and auto-backup
 * This watches for changes to the invoices store
 */
function monitorInvoiceChanges() {
    // Override IndexedDB put/add methods to catch new invoices
    const originalOpen = indexedDB.open;

    indexedDB.open = function(...args) {
        const request = originalOpen.apply(this, args);

        request.addEventListener('success', function() {
            const db = this.result;

            // Intercept transactions on invoices store
            const originalTransaction = db.transaction.bind(db);

            db.transaction = function(storeNames, mode) {
                const tx = originalTransaction(storeNames, mode);

                if (mode === 'readwrite' && (storeNames.includes('invoices') || storeNames === 'invoices')) {
                    const store = tx.objectStore('invoices');
                    const originalPut = store.put.bind(store);
                    const originalAdd = store.add.bind(store);

                    // Intercept put
                    store.put = function(value) {
                        const request = originalPut(value);

                        request.addEventListener('success', function() {
                            console.log('📤 [INSTANT-SYNC] New invoice detected:', value.filename);
                            instantSyncInvoice(value);
                        });

                        return request;
                    };

                    // Intercept add
                    store.add = function(value) {
                        const request = originalAdd(value);

                        request.addEventListener('success', function() {
                            console.log('📤 [INSTANT-SYNC] New invoice detected:', value.filename);
                            instantSyncInvoice(value);
                        });

                        return request;
                    };
                }

                return tx;
            };
        });

        return request;
    };

    console.log('👀 [INSTANT-SYNC] Monitoring IndexedDB for new invoices');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initInstantSync, 2000);
        monitorInvoiceChanges();
    });
} else {
    setTimeout(initInstantSync, 2000);
    monitorInvoiceChanges();
}

// Export functions for manual use
window.instantSync = {
    syncInvoice: instantSyncInvoice,
    bulkSync: bulkSyncInvoices,
    verifyStorage: verifyStorageBuckets,
    isReady: () => instantSyncReady,
    isHealthy: () => storageHealthy,
    config: INSTANT_SYNC_CONFIG,
};

console.log('✅ [INSTANT-SYNC] System ready');
