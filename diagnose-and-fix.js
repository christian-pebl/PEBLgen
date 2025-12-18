const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting diagnostic and fix...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`[BROWSER] ${text}`);
  });

  try {
    // Step 1: Navigate to grants page
    console.log('\n📝 Step 1: Navigating to grants page...');
    await page.goto('http://localhost:8000/grants.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Step 2: Load the diagnostic script
    console.log('\n📝 Step 2: Running diagnostic script...');
    const diagnosticScript = fs.readFileSync('diagnose-custom-tx.js', 'utf8');

    const diagnosticResult = await page.evaluate(diagnosticScript);
    await page.waitForTimeout(2000);

    console.log('\n📊 Diagnostic Results:');
    const relevantLogs = consoleLogs.filter(log =>
      log.includes('===') ||
      log.includes('Step') ||
      log.includes('✅') ||
      log.includes('❌') ||
      log.includes('⚠️')
    );
    relevantLogs.forEach(log => console.log(log));

    // Step 3: Check what the issue is
    console.log('\n📝 Step 3: Analyzing issues...');

    const hasProjectIdMismatch = consoleLogs.some(log =>
      log.includes('No custom transactions match the current project ID')
    );

    const hasWrongCategory = consoleLogs.some(log =>
      log.includes('No custom transactions assigned to Travel category')
    );

    const noCustomTxInCache = consoleLogs.some(log =>
      log.includes('No custom transactions found in cachedTransactions')
    );

    const noCustomFile = consoleLogs.some(log =>
      log.includes('No custom_transactions.csv file found')
    );

    // Step 4: Fix the issue
    if (noCustomFile) {
      console.log('\n❌ ISSUE: No custom transactions file exists');
      console.log('✅ FIX: Need to create a custom transaction first');
      console.log('📸 Taking screenshot...');
      await page.screenshot({ path: 'no-custom-file.png', fullPage: true });

    } else if (noCustomTxInCache) {
      console.log('\n❌ ISSUE: Custom transactions not loaded into cache');
      console.log('✅ FIX: Reloading transactions...');

      await page.evaluate(async () => {
        cachedTransactions = await loadAllTransactions();
        console.log('Reloaded transactions, count:', cachedTransactions?.length);
        if (typeof renderBudgetBreakdown === 'function') {
          renderBudgetBreakdown();
        }
      });

      await page.waitForTimeout(2000);
      console.log('✅ Transactions reloaded');

    } else if (hasProjectIdMismatch) {
      console.log('\n❌ ISSUE: Custom transaction has wrong project ID');
      console.log('✅ FIX: Updating project ID...');

      await page.evaluate(async () => {
        // Get the custom transaction
        const txn = db.transaction(['csvFiles'], 'readwrite');
        const store = txn.objectStore('csvFiles');
        const allFiles = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

        if (customFile && customFile.transactions) {
          console.log('Current project ID:', projectBudget.projectId);
          console.log('Updating all custom transactions to current project...');

          customFile.transactions.forEach(tx => {
            if (tx.assignments) {
              tx.assignments.forEach(assignment => {
                console.log(`Changing project ID from ${assignment.projectId} to ${projectBudget.projectId}`);
                assignment.projectId = projectBudget.projectId;
              });
            }
          });

          // Save back
          const writeTxn = db.transaction(['csvFiles'], 'readwrite');
          const writeStore = writeTxn.objectStore('csvFiles');
          await new Promise((resolve, reject) => {
            const putRequest = writeStore.put(customFile);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });

          console.log('✅ Project IDs updated');

          // Reload and re-render
          cachedTransactions = await loadAllTransactions();
          if (typeof renderBudgetBreakdown === 'function') {
            renderBudgetBreakdown();
          }
        }
      });

      await page.waitForTimeout(2000);
      console.log('✅ Project ID fixed');

    } else if (hasWrongCategory) {
      console.log('\n❌ ISSUE: Custom transaction has wrong category');
      console.log('✅ FIX: Updating category to "Travel"...');

      await page.evaluate(async () => {
        const txn = db.transaction(['csvFiles'], 'readwrite');
        const store = txn.objectStore('csvFiles');
        const allFiles = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

        if (customFile && customFile.transactions) {
          customFile.transactions.forEach(tx => {
            if (tx.assignments) {
              tx.assignments.forEach(assignment => {
                if (assignment.category === 'Travel and Subsistence' ||
                    assignment.category === 'Travel & Subsistence') {
                  console.log(`Changing category from "${assignment.category}" to "Travel"`);
                  assignment.category = 'Travel';
                }
              });
            }
          });

          // Save back
          const writeTxn = db.transaction(['csvFiles'], 'readwrite');
          const writeStore = writeTxn.objectStore('csvFiles');
          await new Promise((resolve, reject) => {
            const putRequest = writeStore.put(customFile);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });

          console.log('✅ Category updated to "Travel"');

          // Reload and re-render
          cachedTransactions = await loadAllTransactions();
          if (typeof renderBudgetBreakdown === 'function') {
            renderBudgetBreakdown();
          }
        }
      });

      await page.waitForTimeout(2000);
      console.log('✅ Category fixed');
    }

    // Step 5: Verify the fix
    console.log('\n📝 Step 5: Verifying fix...');
    await page.waitForTimeout(2000);

    const customTxVisible = await page.evaluate(() => {
      const customInCache = cachedTransactions?.filter(t =>
        t.isCustom || t.description?.includes('[CUSTOM]')
      );

      if (!customInCache || customInCache.length === 0) {
        return { found: false, reason: 'Not in cache' };
      }

      const matchingProject = customInCache.filter(t =>
        t.assignments?.some(a => a.projectId === projectBudget.projectId)
      );

      if (matchingProject.length === 0) {
        return { found: false, reason: 'Wrong project ID' };
      }

      const travelTx = matchingProject.filter(t =>
        t.assignments?.some(a => a.category === 'Travel')
      );

      if (travelTx.length === 0) {
        return { found: false, reason: 'Wrong category' };
      }

      return {
        found: true,
        count: travelTx.length,
        details: travelTx.map(t => ({
          date: t.date,
          desc: t.description,
          quarter: t.assignments[0].quarter,
          percentage: t.assignments[0].percentage
        }))
      };
    });

    console.log('\n📊 Verification Result:', JSON.stringify(customTxVisible, null, 2));

    if (customTxVisible.found) {
      console.log('\n✅ SUCCESS! Custom transaction(s) should now be visible');
      console.log(`Found ${customTxVisible.count} custom transaction(s)`);
      customTxVisible.details.forEach(tx => {
        console.log(`  - ${tx.date}: ${tx.desc} (Q${tx.quarter}, ${tx.percentage}%)`);
      });
    } else {
      console.log('\n❌ STILL NOT VISIBLE');
      console.log('Reason:', customTxVisible.reason);
    }

    // Take final screenshot
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'after-fix.png', fullPage: true });

    console.log('\n✅ Diagnostic and fix complete!');
    console.log('Check after-fix.png to see the result');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: 'error-fix.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for 5 seconds
    await browser.close();
  }
})();
