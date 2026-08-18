const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function askGroq(prompt) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Updated to an available model
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error);
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

  return await askGroq(prompt);
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

  return await askGroq(prompt);
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

  const raw = await askGroq(prompt);
  
  // Extract JSON from the response (handle cases where model wraps it in markdown)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
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

  return await askGroq(prompt);
};

export default askGroq;
