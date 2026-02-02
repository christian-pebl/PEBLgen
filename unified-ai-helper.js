/**
 * Unified AI API Helper
 * Supports both OpenAI and Gemini APIs with automatic fallback
 *
 * Include in spend.html with:
 * <script src="api-config.js"></script>
 * <script src="unified-ai-helper.js"></script>
 */

const UnifiedAI = {
    // API configuration (from api-config.js or fallback)
    config: null,

    /**
     * Initialize the AI helper
     */
    init() {
        // Try to load from api-config.js first
        if (typeof API_CONFIG !== 'undefined') {
            this.config = API_CONFIG;
            console.log('✅ [AI] Loaded API config from api-config.js');
            console.log(`📡 [AI] Using provider: ${this.config.provider}`);
        } else {
            // Fallback to localStorage
            console.log('⚠️ [AI] No api-config.js found, using localStorage');
            this.config = {
                provider: localStorage.getItem('ai_provider') || 'gemini',
                keys: {
                    openai: localStorage.getItem('openai_api_key') || localStorage.getItem('gemini_api_key'), // Legacy fallback
                    gemini: localStorage.getItem('gemini_api_key') || ''
                },
                models: {
                    openai: 'gpt-4o-mini',
                    gemini: 'gemini-2.5-flash'
                }
            };
        }
    },

    /**
     * Get the current API key
     */
    getApiKey() {
        if (!this.config) this.init();
        return this.config.keys[this.config.provider];
    },

    /**
     * Get the current provider
     */
    getProvider() {
        if (!this.config) this.init();
        return this.config.provider;
    },

    /**
     * Extract structured data from invoice text
     */
    async extractInvoiceData(invoiceText, transactionContext = null) {
        if (!this.config) this.init();

        const provider = this.config.provider;
        const apiKey = this.getApiKey();

        if (!apiKey || apiKey === 'YOUR_OPENAI_KEY_HERE' || apiKey === 'YOUR_GEMINI_KEY_HERE') {
            console.error('❌ [AI] No valid API key configured');
            return null;
        }

        console.log(`🔍 [AI] Extracting invoice data using ${provider}...`);

        // Add context hint
        let contextHint = '';
        if (transactionContext && transactionContext.date) {
            contextHint = `\n\nContext: This invoice should be from around ${transactionContext.date}. If the invoice shows a date without a year, infer the year from this context date.`;
        }

        const prompt = `Extract the following information from this invoice/receipt text and return it as a JSON object:

Required fields:
- company: The company/vendor name (string)
- amount: The total amount (number, no currency symbols)
- date: The invoice/transaction date in YYYY-MM-DD format (string)${contextHint}

Invoice Text:
${invoiceText.substring(0, 4000)}

Return ONLY a valid JSON object with these three fields. If a field cannot be found, use null.
Example: {"company": "Acme Corp", "amount": 123.45, "date": "2025-01-15"}`;

        try {
            if (provider === 'gemini') {
                return await this._extractWithGemini(prompt, apiKey);
            } else {
                return await this._extractWithOpenAI(prompt, apiKey);
            }
        } catch (error) {
            console.error(`❌ [AI] ${provider} extraction failed:`, error);
            return null;
        }
    },

    /**
     * Extract using OpenAI API
     */
    async _extractWithOpenAI(prompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.config.models.openai,
                messages: [
                    { role: 'system', content: 'You are a data extraction assistant. Always return valid JSON only, no additional text.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ [AI-OpenAI] API error ${response.status}:`, errorBody);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const extractedData = JSON.parse(data.choices[0].message.content.trim());

        console.log('✅ [AI-OpenAI] Extraction successful:', extractedData);
        return extractedData;
    },

    /**
     * Extract using Gemini API
     */
    async _extractWithGemini(prompt, apiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.models.gemini}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a data extraction assistant. ${prompt}\n\nRespond with ONLY valid JSON, no markdown, no explanations.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 150,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ [AI-Gemini] API error ${response.status}:`, errorBody);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid Gemini response structure');
        }

        const textContent = data.candidates[0].content.parts[0].text;

        // Gemini sometimes wraps JSON in markdown code blocks
        let cleanedText = textContent.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const extractedData = JSON.parse(cleanedText);

        console.log('✅ [AI-Gemini] Extraction successful:', extractedData);
        return extractedData;
    },

    /**
     * Validate extracted invoice data against transaction
     */
    async validateInvoiceData(extractedData, transaction) {
        if (!this.config) this.init();

        const provider = this.config.provider;
        const apiKey = this.getApiKey();

        if (!apiKey || apiKey === 'YOUR_OPENAI_KEY_HERE' || apiKey === 'YOUR_GEMINI_KEY_HERE') {
            console.error('❌ [AI] No valid API key configured');
            return null;
        }

        // Parse amounts
        const transactionAmountStr = (transaction.spent || transaction.received || '0').toString().replace(/£/g, '').replace(/,/g, '').trim();
        const transactionAmount = parseFloat(transactionAmountStr) || 0;
        const extractedAmount = parseFloat(extractedData.amount) || 0;

        // Client-side validation
        const amountDifference = Math.abs(transactionAmount - extractedAmount);
        const clientSideAmountMatch = amountDifference <= 0.02;

        // Date validation
        let clientSideDateMatch = false;
        let dateDaysDifference = null;
        if (extractedData.date && transaction.date) {
            try {
                const extractedDate = new Date(extractedData.date);
                let transactionDate;
                if (transaction.date.includes('/')) {
                    const [day, month, year] = transaction.date.split('/');
                    transactionDate = new Date(year, month - 1, day);
                } else {
                    transactionDate = new Date(transaction.date);
                }
                const timeDiff = Math.abs(extractedDate - transactionDate);
                dateDaysDifference = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                clientSideDateMatch = dateDaysDifference <= 7;
            } catch (e) {
                console.warn('Could not parse dates for validation:', e);
            }
        }

        const prompt = `You are a financial data validator. Compare the extracted invoice data with the transaction entry and determine if they match.

Extracted from Invoice:
- Company: ${extractedData.company || 'Not found'}
- Amount: £${extractedData.amount || 'Not found'}
- Date: ${extractedData.date || 'Not found'}

Transaction Entry:
- Description/Company: ${transaction.description || 'Not provided'}
- Amount: £${transactionAmount.toFixed(2)}
- Date: ${transaction.date || 'Not provided'}

Analyze each field and return a JSON object with:
{
  "companyMatch": true/false,
  "amountMatch": true/false,
  "dateMatch": true/false,
  "companyReason": "2-10 word explanation",
  "amountReason": "2-10 word explanation",
  "dateReason": "2-10 word explanation",
  "overallConfidence": "high"/"medium"/"low",
  "recommendation": "attach"/"review"/"reject"
}

Keep all reason fields concise (2-10 words maximum).`;

        try {
            if (provider === 'gemini') {
                return await this._validateWithGemini(prompt, apiKey);
            } else {
                return await this._validateWithOpenAI(prompt, apiKey);
            }
        } catch (error) {
            console.error(`❌ [AI] ${provider} validation failed:`, error);
            return null;
        }
    },

    /**
     * Validate using OpenAI
     */
    async _validateWithOpenAI(prompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.config.models.openai,
                messages: [
                    { role: 'system', content: 'You are a financial validator. Always return valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const validation = JSON.parse(data.choices[0].message.content.trim());

        console.log('✅ [AI-OpenAI] Validation complete:', validation);
        return validation;
    },

    /**
     * Validate using Gemini
     */
    async _validateWithGemini(prompt, apiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.models.gemini}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a financial validator. ${prompt}\n\nRespond with ONLY valid JSON, no markdown.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 200,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates[0].content.parts[0].text;

        // Clean markdown if present
        let cleanedText = textContent.trim();
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```(?:json)?\n?/g, '');
        }

        const validation = JSON.parse(cleanedText);

        console.log('✅ [AI-Gemini] Validation complete:', validation);
        return validation;
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.UnifiedAI = UnifiedAI;
    UnifiedAI.init();
}
