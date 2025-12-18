const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  console.log('🚀 Connecting to your Chrome profile...');

  // Get Chrome user data directory
  const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

  console.log('📂 Chrome profile location:', userDataDir);

  try {
    // Launch with user's Chrome profile
    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: ['--start-maximized']
    });

    const pages = browser.pages();
    let page;

    // Check if grants.html is already open
    const grantsPage = pages.find(p => p.url().includes('localhost:8000/grants.html'));

    if (grantsPage) {
      console.log('✅ Found existing grants.html tab');
      page = grantsPage;
    } else {
      console.log('📝 Opening new grants.html tab...');
      page = await browser.newPage();
      await page.goto('http://localhost:8000/grants.html');
    }

    await page.waitForTimeout(3000);

    console.log('\n🔍 Checking for custom transaction...');

    // Run the fix script
    const result = await page.evaluate(async () => {
      const customTx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));

      if (!customTx) {
        return { success: false, error: 'Custom transaction not found' };
      }

      const assignment = customTx.assignments?.[0];
      const currentQuarter = assignment.quarter;
      const currentPercentage = assignment.percentage;

      console.log('📝 Found transaction:');
      console.log('   Date:', customTx.date);
      console.log('   Description:', customTx.description);
      console.log('   Current Quarter:', currentQuarter ? 'Q' + currentQuarter : '(not set)');
      console.log('   Current Split:', currentPercentage + '%');

      // Check if already correct
      if (currentQuarter === 1 && currentPercentage === 100) {
        return {
          success: true,
          alreadyCorrect: true,
          quarter: currentQuarter,
          percentage: currentPercentage
        };
      }

      // Fix it
      console.log('🔧 Fixing quarter and split...');

      try {
        const txn = db.transaction(['csvFiles'], 'readwrite');
        const store = txn.objectStore('csvFiles');

        const allFiles = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

        if (!customFile || !customFile.transactions) {
          return { success: false, error: 'Custom file not found' };
        }

        const txToUpdate = customFile.transactions.find(t =>
          t.description?.includes('Project Meetings')
        );

        if (!txToUpdate) {
          return { success: false, error: 'Transaction not found in file' };
        }

        // Update
        txToUpdate.assignments[0].quarter = 1;
        txToUpdate.assignments[0].percentage = 100;

        // Save
        const writeTxn = db.transaction(['csvFiles'], 'readwrite');
        const writeStore = writeTxn.objectStore('csvFiles');

        await new Promise((resolve, reject) => {
          const putRequest = writeStore.put(customFile);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        });

        await new Promise((resolve, reject) => {
          writeTxn.oncomplete = () => resolve();
          writeTxn.onerror = () => reject(writeTxn.error);
        });

        console.log('✅ Database updated');

        // Reload
        cachedTransactions = await loadAllTransactions();
        console.log('✅ Transactions reloaded');

        if (typeof renderBudgetBreakdown === 'function') {
          renderBudgetBreakdown();
        }
        console.log('✅ Page re-rendered');

        // Verify
        const updatedTx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));
        const newQuarter = updatedTx?.assignments?.[0]?.quarter;
        const newPercentage = updatedTx?.assignments?.[0]?.percentage;

        return {
          success: true,
          alreadyCorrect: false,
          oldQuarter: currentQuarter,
          newQuarter: newQuarter,
          oldPercentage: currentPercentage,
          newPercentage: newPercentage
        };

      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    console.log('\n📊 Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('❌ Fix failed:', result.error);
    } else if (result.alreadyCorrect) {
      console.log('\n✅ Transaction already has correct values:');
      console.log(`   Quarter: Q${result.quarter}`);
      console.log(`   Split: ${result.percentage}%`);
      console.log('\nℹ️  Make sure Q1 button is active (orange) to see it in quarterly tracking!');
    } else {
      console.log('\n🎉 SUCCESS! Updated transaction:');
      console.log(`   Quarter: Q${result.oldQuarter} → Q${result.newQuarter}`);
      console.log(`   Split: ${result.oldPercentage}% → ${result.newPercentage}%`);
      console.log('\n✅ The transaction should now appear in "Q1 Transactions by Category"');
      console.log('   under "Travel and Subsistence"');
    }

    // Take screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'fixed-quarter.png', fullPage: true });
    console.log('\n📸 Screenshot saved: fixed-quarter.png');

    console.log('\n✅ Script complete! You can close this browser window.');
    await page.waitForTimeout(10000); // Keep open for 10 seconds

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Timeout') || error.message.includes('closed')) {
      console.log('\nℹ️  The browser may have closed. Make sure:');
      console.log('   1. Chrome is fully closed before running this script');
      console.log('   2. No other Chrome processes are running');
    }
  }
})();
