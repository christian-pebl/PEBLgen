// sync-status-indicator.js
// Visual sync status indicator for all pages

console.log('📊 [SYNC STATUS] Indicator loaded');

// Sync status states
const SYNC_STATUS = {
    SYNCED: 'synced',       // ✓ Everything backed up
    SYNCING: 'syncing',     // ⟳ Currently syncing
    PENDING: 'pending',     // ⏳ Changes waiting to sync
    ERROR: 'error',         // ❌ Sync failed
    DISABLED: 'disabled',   // ⚪ Sync not available
};

let currentStatus = SYNC_STATUS.DISABLED;
let statusIndicator = null;
let lastSyncText = '';

/**
 * Initialize sync status indicator
 */
function initSyncStatusIndicator() {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSyncIndicator);
    } else {
        createSyncIndicator();
    }
}

/**
 * Create the sync indicator UI element
 */
function createSyncIndicator() {
    // Check if already created
    if (document.getElementById('sync-status-indicator')) return;

    // Create indicator HTML
    const indicator = document.createElement('div');
    indicator.id = 'sync-status-indicator';
    indicator.className = 'sync-status-indicator';
    indicator.innerHTML = `
        <div class="sync-icon" id="syncIcon">☁️</div>
        <div class="sync-tooltip" id="syncTooltip">Initializing backup...</div>
    `;

    // Add to page
    document.body.appendChild(indicator);
    statusIndicator = indicator;

    // Add click handler to show details
    indicator.addEventListener('click', showSyncDetails);

    console.log('✅ [SYNC STATUS] Indicator created');

    // Start monitoring sync status
    startStatusMonitoring();
}

/**
 * Start monitoring sync status
 */
function startStatusMonitoring() {
    // Check status every second
    setInterval(updateSyncStatus, 1000);

    // Listen for Supabase ready event
    window.addEventListener('supabaseReady', () => {
        updateSyncStatus();
    });

    // Listen for user authenticated event
    window.addEventListener('userAuthenticated', () => {
        updateSyncStatus();
    });

    // Initial check
    setTimeout(updateSyncStatus, 500);
}

/**
 * Update sync status based on current state
 */
function updateSyncStatus() {
    if (!window.autoSync) {
        setSyncStatus(SYNC_STATUS.DISABLED, 'Backup system loading...');
        return;
    }

    if (!window.currentUser) {
        setSyncStatus(SYNC_STATUS.DISABLED, 'Authenticating...');
        return;
    }

    // Check for database setup errors
    if (window.autoSync.hasSetupError && window.autoSync.hasSetupError()) {
        const errorMsg = window.autoSync.getLastError ? window.autoSync.getLastError() : 'Setup required';
        setSyncStatus(SYNC_STATUS.ERROR, errorMsg);
        return;
    }

    // Check if currently syncing
    if (window.autoSync.isSyncing()) {
        setSyncStatus(SYNC_STATUS.SYNCING, 'Backing up your data...');
        return;
    }

    // Check last sync time
    const lastSync = window.autoSync.getLastSyncTime();

    if (!lastSync) {
        setSyncStatus(SYNC_STATUS.PENDING, 'Waiting for first backup...');
        return;
    }

    // Calculate time since last sync
    const timeSinceSync = Date.now() - lastSync.getTime();
    const minutesAgo = Math.floor(timeSinceSync / 60000);
    const secondsAgo = Math.floor(timeSinceSync / 1000);

    let timeText;
    if (minutesAgo > 0) {
        timeText = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
    } else if (secondsAgo > 5) {
        timeText = `${secondsAgo} seconds ago`;
    } else {
        timeText = 'just now';
    }

    // If sync was recent (within 5 seconds), show synced
    if (secondsAgo < 5) {
        setSyncStatus(SYNC_STATUS.SYNCED, `✓ All backed up (${timeText})`);
    } else if (timeSinceSync < 30000) {
        // Within 30 seconds - still good
        setSyncStatus(SYNC_STATUS.SYNCED, `✓ Backed up ${timeText}`);
    } else {
        // Over 30 seconds - might have pending changes
        setSyncStatus(SYNC_STATUS.PENDING, `Last backup: ${timeText}`);
    }
}

/**
 * Set sync status and update UI
 */
function setSyncStatus(status, tooltipText) {
    if (!statusIndicator) return;

    currentStatus = status;
    lastSyncText = tooltipText;

    const icon = document.getElementById('syncIcon');
    const tooltip = document.getElementById('syncTooltip');

    if (!icon || !tooltip) return;

    // Remove all status classes
    statusIndicator.classList.remove('synced', 'syncing', 'pending', 'error', 'disabled');

    // Add current status class
    statusIndicator.classList.add(status);

    // Update icon and tooltip
    switch (status) {
        case SYNC_STATUS.SYNCED:
            icon.textContent = '☁️';
            icon.style.animation = 'none';
            break;

        case SYNC_STATUS.SYNCING:
            icon.textContent = '☁️';
            icon.style.animation = 'spin 2s linear infinite';
            break;

        case SYNC_STATUS.PENDING:
            icon.textContent = '☁️';
            icon.style.animation = 'pulse 2s ease-in-out infinite';
            break;

        case SYNC_STATUS.ERROR:
            icon.textContent = '⚠️';
            icon.style.animation = 'shake 0.5s ease-in-out';
            break;

        case SYNC_STATUS.DISABLED:
            icon.textContent = '☁️';
            icon.style.opacity = '0.4';
            icon.style.animation = 'none';
            break;
    }

    tooltip.textContent = tooltipText;
}

/**
 * Show detailed sync information
 */
function showSyncDetails() {
    const lastSync = window.autoSync?.getLastSyncTime();
    const isSyncing = window.autoSync?.isSyncing();
    const isEnabled = window.autoSync?.config?.enabled;
    const hasError = window.autoSync?.hasSetupError?.();
    const errorMsg = window.autoSync?.getLastError?.();

    let details = '☁️ Cloud Backup Status\n\n';

    if (!window.autoSync) {
        details += '⚪ Status: Not initialized\n';
    } else if (!window.currentUser) {
        details += '⚪ Status: Not authenticated\n';
    } else if (hasError) {
        details += '❌ Status: Setup Required\n\n';
        details += '⚠️ Problem: Database tables not created\n\n';
        details += '📝 Solution:\n';
        details += '1. Open Supabase Dashboard\n';
        details += '2. Go to SQL Editor\n';
        details += '3. Run the table creation scripts\n';
        details += '4. Run the storage bucket creation scripts\n';
        details += '5. Refresh this page\n\n';
        details += 'See SUPABASE_MIGRATION_README.md for full instructions.\n';
    } else if (!isEnabled) {
        details += '⚪ Status: Disabled\n';
    } else if (isSyncing) {
        details += '⟳ Status: Backing up now...\n';
    } else if (lastSync) {
        const timeAgo = Math.floor((Date.now() - lastSync.getTime()) / 1000);
        details += `✅ Status: All backed up\n`;
        details += `📅 Last backup: ${lastSync.toLocaleTimeString()}\n`;
        details += `⏱️ Time ago: ${timeAgo} seconds\n`;
    } else {
        details += '⏳ Status: Waiting for first backup\n';
    }

    details += '\n📊 What gets backed up:\n';
    details += '• Project budgets\n';
    details += '• CSV transaction files\n';
    details += '• PDF invoices\n';
    details += '• All text entries\n';
    details += '• Gantt charts\n';
    details += '• Sketcher data\n';

    details += '\n⚙️ Settings:\n';
    details += `• Auto-sync: ${isEnabled ? 'Enabled' : 'Disabled'}\n`;
    details += `• Sync delay: ${window.autoSync?.config?.syncDelay || 0}ms\n`;

    alert(details);
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    /* Sync Status Indicator */
    .sync-status-indicator {
        position: fixed;
        top: 70px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 30px;
        padding: 8px 16px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 1000;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        user-select: none;
    }

    .sync-status-indicator:hover {
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        transform: translateY(-2px);
    }

    .sync-icon {
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }

    .sync-tooltip {
        font-size: 12px;
        color: #333;
        font-weight: 500;
        white-space: nowrap;
    }

    /* Status Colors */
    .sync-status-indicator.synced {
        border: 2px solid #4caf50;
    }

    .sync-status-indicator.synced .sync-icon {
        filter: brightness(1.1);
    }

    .sync-status-indicator.synced .sync-tooltip {
        color: #2e7d32;
    }

    .sync-status-indicator.syncing {
        border: 2px solid #2196f3;
    }

    .sync-status-indicator.syncing .sync-tooltip {
        color: #1565c0;
    }

    .sync-status-indicator.pending {
        border: 2px solid #ff9800;
    }

    .sync-status-indicator.pending .sync-tooltip {
        color: #e65100;
    }

    .sync-status-indicator.error {
        border: 2px solid #f44336;
    }

    .sync-status-indicator.error .sync-tooltip {
        color: #c62828;
    }

    .sync-status-indicator.disabled {
        border: 2px solid #9e9e9e;
        opacity: 0.6;
    }

    .sync-status-indicator.disabled .sync-tooltip {
        color: #757575;
    }

    /* Animations */
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    /* Checkmark overlay for synced state */
    .sync-status-indicator.synced .sync-icon::after {
        content: '✓';
        position: absolute;
        font-size: 10px;
        color: #4caf50;
        background: white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        bottom: -2px;
        right: -2px;
        font-weight: bold;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
        .sync-status-indicator {
            top: 65px;
            right: 10px;
            padding: 6px 12px;
            font-size: 11px;
        }

        .sync-icon {
            font-size: 18px;
        }

        .sync-tooltip {
            font-size: 11px;
        }
    }
`;
document.head.appendChild(style);

// Initialize when script loads
initSyncStatusIndicator();

console.log('✅ [SYNC STATUS] Indicator script ready');
