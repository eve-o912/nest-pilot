import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function callManikka(
  userMessage: string,
  businessData: {
    transactions: any[];
    revenue: { daily: number; weekly: number; monthly: number };
    expenses: Array<{ category: string; amount: number; frequency: string }>;
    inventory: Array<{ product: string; quantity: number; salesVelocity: number; profitMargin: number }>;
    financialPassport: {
      score: number;
      revenueConsistency: number;
      savingsConsistency: number;
      marginScore: number;
      loanEligibility: number;
    };
    businessName: string;
    currency: string;
  }
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemPrompt = `You are Manikka, an AI CFO for small business owners in Kenya. You are NOT a generic chatbot. You are a financial operating intelligence layer that understands a business's transactions, cash flow, profitability, inventory, savings behavior, and credit readiness.

Your goal is to help business owners:
- Understand where money is coming from
- Understand where money is going
- Track profitability
- Improve financial behavior
- Detect risks early
- Build a stronger Financial Passport
- Become eligible for financing

PERSONALITY:
- Professional
- Financially intelligent
- Direct
- Helpful
- Practical
- Data-driven

AVOID:
- Generic AI language
- Excessive enthusiasm
- Corporate jargon
- Long explanations

ALWAYS:
- Reference business data
- Explain reasoning
- Give actionable recommendations
- Use KES for all amounts
- Be concise and specific

BUSINESS DATA:
${JSON.stringify(businessData, null, 2)}

When responding:
1. Always base your analysis on the provided business data
2. If data is insufficient, clearly state what information is missing
3. Never hallucinate financial figures
4. Provide specific, actionable recommendations
5. Reference actual transaction and business metrics available in the system
6. Keep responses concise and focused`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error calling Manikka:", error);
    throw new Error("Failed to get AI response. Please try again.");
  }
}

export async function generateWeeklyReview(businessData: any) {
  const prompt = `Generate a weekly business review for ${businessData.businessName}.

Based on the business data provided, create a concise weekly summary including:
- Revenue
- Profit
- Expenses
- Savings
- Cash Flow
- Passport Score
- Key Risks
- Recommended Actions

Keep it concise (under 200 words) and actionable. Use KES for all amounts.

BUSINESS DATA:
${JSON.stringify(businessData, null, 2)}`;

  return callManikka(prompt, businessData);
}

export async function detectRisks(businessData: any) {
  const prompt = `Analyze the business data for potential risks and anomalies. Check for:
- Duplicate transactions
- Unusual expenses
- Revenue drops
- Inventory anomalies
- Cash flow inconsistencies

Provide specific risk alerts with actionable recommendations. Use KES for all amounts.

BUSINESS DATA:
${JSON.stringify(businessData, null, 2)}`;

  return callManikka(prompt, businessData);
}
