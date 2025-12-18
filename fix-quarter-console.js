// ===== PASTE THIS ENTIRE SCRIPT INTO YOUR CHROME CONSOLE =====
// On grants.html page, press F12, go to Console tab, paste this and press Enter

(async function fixCustomTransactionQuarter() {
    console.log('🔍 ===== CHECKING CUSTOM TRANSACTION QUARTER =====\n');

    // Step 1: Find the custom transaction
    const customTx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));

    if (!customTx) {
        console.error('❌ Custom transaction not found in cachedTransactions');
        return;
    }

    const assignment = customTx.assignments?.[0];

    console.log('✅ Custom Transaction Found:');
    console.log('   Date:', customTx.date);
    console.log('   Description:', customTx.description);
    console.log('   Amount: £' + customTx.spent);
    console.log('   Current Quarter:', assignment.quarter ? 'Q' + assignment.quarter : '(not set)');
    console.log('   Current Split:', assignment.percentage + '%');
    console.log('   Category:', assignment.category);
    console.log('   Project ID:', assignment.projectId);

    // Step 2: Check if quarter needs fixing
    if (assignment.quarter === 1 && assignment.percentage === 100) {
        console.log('\n✅ Quarter is already Q1 and Split is 100% - no fix needed!');
        console.log('\nℹ️  If you can\'t see it in Q1 Transactions by Category:');
        console.log('   1. Make sure Q1 (2509-2511) button is clicked/active (orange)');
        console.log('   2. Scroll down to "Q1 Transactions by Category" section');
        console.log('   3. Look for "Travel and Subsistence" category');
        return;
    }

    // Step 3: Fix the quarter
    console.log('\n🔧 Fixing quarter assignment...');
    console.log(`   Changing: Q${assignment.quarter} → Q1`);
    console.log(`   Changing: ${assignment.percentage}% → 100%`);

    try {
        // Get the custom file from database
        const txn = db.transaction(['csvFiles'], 'readwrite');
        const store = txn.objectStore('csvFiles');

        const allFiles = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

        if (!customFile || !customFile.transactions) {
            console.error('❌ Custom transactions file not found in database');
            return;
        }

        // Find and update the transaction
        const txToUpdate = customFile.transactions.find(t =>
            t.description?.includes('Project Meetings')
        );

        if (!txToUpdate) {
            console.error('❌ Transaction not found in custom file');
            return;
        }

        // Update the values
        txToUpdate.assignments[0].quarter = 1;
        txToUpdate.assignments[0].percentage = 100;

        console.log('💾 Saving to database...');

        // Save back to database
        const writeTxn = db.transaction(['csvFiles'], 'readwrite');
        const writeStore = writeTxn.objectStore('csvFiles');

        await new Promise((resolve, reject) => {
            const putRequest = writeStore.put(customFile);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        });

        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            writeTxn.oncomplete = () => resolve();
            writeTxn.onerror = () => reject(writeTxn.error);
        });

        console.log('✅ Database updated successfully');

        // Reload cached transactions
        console.log('🔄 Reloading transactions...');
        cachedTransactions = await loadAllTransactions();

        // Re-render the page
        console.log('🎨 Re-rendering page...');
        if (typeof renderBudgetBreakdown === 'function') {
            renderBudgetBreakdown();
        }

        // Verify the fix
        const updatedTx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));
        const updatedAssignment = updatedTx?.assignments?.[0];

        console.log('\n✅ FIX COMPLETE!');
        console.log('   New Quarter:', updatedAssignment.quarter ? 'Q' + updatedAssignment.quarter : '?');
        console.log('   New Split:', updatedAssignment.percentage + '%');

        console.log('\n🎉 SUCCESS! The custom transaction should now appear in:');
        console.log('   📍 "Q1 Transactions by Category" section');
        console.log('   📍 Under "Travel and Subsistence" category');
        console.log('\nℹ️  Make sure Q1 (2509-2511) button is clicked (orange) to see it!');

    } catch (error) {
        console.error('❌ Error fixing quarter:', error);
        console.error(error.stack);
    }
})();
