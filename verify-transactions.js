const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verifying transactions after button change...');

  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs and errors
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('transactions')) {
      console.log('[BROWSER CONSOLE]', text);
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  try {
    await page.goto('http://localhost:8000/grants.html');
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      return {
        cachedTransactionsCount: cachedTransactions ? cachedTransactions.length : 0,
        cachedTransactionsSample: cachedTransactions ? cachedTransactions.slice(0, 2).map(t => ({
          date: t.date,
          description: t.description,
          spent: t.spent
        })) : [],
        materialsVisible: !!document.querySelector('#q1-category-materials'),
        subcontractingVisible: !!document.querySelector('#q1-category-subcontracting'),
        travelVisible: !!document.querySelector('#q1-category-travel'),
        buttonExists: !!document.querySelector('button[onclick*="fixCustomTransactionQuarters"]'),
        quarterlySection: document.querySelector('[id*="quarterly"]') ? 'exists' : 'missing'
      };
    });

    console.log('\n📊 Page State:');
    console.log(JSON.stringify(state, null, 2));

    if (state.cachedTransactionsCount === 0) {
      console.log('\n❌ WARNING: No cached transactions found!');
      console.log('Checking IndexedDB...');

      const dbState = await page.evaluate(async () => {
        if (!db) {
          return { error: 'Database not initialized' };
        }

        const txn = db.transaction(['csvFiles'], 'readonly');
        const store = txn.objectStore('csvFiles');

        const allFiles = await new Promise((resolve) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve([]);
        });

        return {
          filesCount: allFiles.length,
          fileNames: allFiles.map(f => f.name),
          totalTransactions: allFiles.reduce((sum, f) => sum + (f.transactions?.length || 0), 0)
        };
      });

      console.log('\n💾 Database State:');
      console.log(JSON.stringify(dbState, null, 2));
    }

    await page.screenshot({ path: 'verify-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved: verify-state.png');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
