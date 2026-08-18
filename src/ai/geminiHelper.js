import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize the SDK. We use 'gemini-2.5-flash' since that's standard for `@google/genai` but fallback to 1.5 if needed.
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function askGemini(prompt, isJsonResponse = false) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: isJsonResponse ? 'application/json' : 'text/plain',
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// 1. SPENDING ANALYZER
export const analyzeSpending = async (transactions) => {
  const summary = transactions.map(t => 
    `${t.date} | ${t.type} | ${t.category} | ₹${t.amount} | ${t.description || ''}`
  ).join('\n');

  const prompt = `You are a personal finance analyst. Analyze these transactions and give exactly 3 specific, personalized insights about spending habits. Be specific with actual numbers and percentages from the data. Use simple, friendly language. Format each insight with an emoji bullet point.

Transactions:
${summary}

Give 3 insights:`;

  return await askGemini(prompt);
};

// 2. BUDGET ADVISOR
export const getBudgetAdvice = async (income, expenses, budgets) => {
  const budgetStr = budgets.map(b => 
    `${b.category}: limit ₹${b.limit}, spent ₹${b.spent || 0}`
  ).join('\n');

  const prompt = `You are a friendly financial advisor. Based on this data, give specific budget improvement advice using the 50/30/20 rule (50% needs, 30% wants, 20% savings). Be practical, specific with numbers, and encouraging.

Monthly Income: ₹${income}
Monthly Expenses: ₹${expenses}
Current Budgets:
${budgetStr}

Give 4 specific, actionable pieces of advice with emojis:`;

  return await askGemini(prompt);
};

// 3. NEXT MONTH PREDICTOR
export const predictNextMonth = async (last3MonthsTransactions) => {
  const summary = last3MonthsTransactions.map(t => 
    `${t.date} | ${t.type} | ${t.category} | ₹${t.amount}`
  ).join('\n');

  const prompt = `Based on these last 3 months of expense transactions, predict next month's expenses by category. Return ONLY a valid JSON object with category names as keys and predicted rupee amounts as numbers. No explanation, no markdown, just the JSON object.

Example format: {"Food": 2000, "Transport": 500}

Transactions:
${summary}

JSON prediction:`;

  const raw = await askGemini(prompt, true);
  
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse prediction JSON:", raw);
    return null;
  }
};

export const getSavingTips = async (spendingPatterns) => {
  const patternStr = Object.entries(spendingPatterns)
    .map(([cat, amount]) => `${cat}: ₹${amount}`)
    .join('\n');

  const prompt = `You are a smart money-saving advisor for a college student in India. Based on these monthly spending patterns, give exactly 5 specific, practical money-saving tips. Each tip should reference the actual spending data and suggest a concrete action with a potential savings amount in rupees. Use numbered format with emojis.

Monthly Spending:
${patternStr}

5 specific saving tips:`;

  return await askGemini(prompt);
};

export default askGemini;
