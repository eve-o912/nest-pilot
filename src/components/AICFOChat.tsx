import { useState, useRef, useEffect } from "react";
import { useStore, type UserSegment, formatKES } from "@/lib/store";
import { Send, Bot, User, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CFOContext {
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number;
  mrr: number;
  arr: number;
  mrrGrowth: number;
  burnMultiple: number;
  revenueCoverage: number;
}

export function AICFOChat() {
  const currentSegment = useStore((s) => s.currentSegment);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock CFO context - in real app, this would come from backend
  const cfoContext: CFOContext = {
    cashBalance: 4200000,
    monthlyBurn: 467000,
    runwayMonths: 9,
    mrr: 180000,
    arr: 2160000,
    mrrGrowth: 14,
    burnMultiple: 2.6,
    revenueCoverage: 38.5,
  };

  const getSegmentPersona = (segment: UserSegment) => {
    switch (segment) {
      case "startup_founder":
        return {
          name: "CFO",
          tone: "Direct, confident, like a CFO who has seen dozens of startups",
          greeting: `You have ${cfoContext.runwayMonths} months of runway at current burn — MRR is growing at ${cfoContext.mrrGrowth}% MoM, which is strong.`,
        };
      case "informal_business":
        return {
          name: "Business Advisor",
          tone: "Warm, simple, plain language",
          greeting: "Habari! I'm here to help you understand your money. What would you like to know today?",
        };
      case "individual_gig":
        return {
          name: "Financial Guide",
          tone: "Encouraging, educational",
          greeting: "Hello! I'm here to help you build your financial identity and understand your income patterns.",
        };
      case "sme_owner":
        return {
          name: "Business Analyst",
          tone: "Professional, focused on profitability and growth",
          greeting: "Welcome. I can help you analyze your branch performance, staff costs, and profitability across locations.",
        };
    }
  };

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    const persona = getSegmentPersona(currentSegment);

    // Startup Founder responses
    if (currentSegment === "startup_founder") {
      if (lowerMessage.includes("runway")) {
        return `You have ${cfoContext.runwayMonths} months of runway — your cash balance is ${formatKES(cfoContext.cashBalance)} and you're burning ${formatKES(cfoContext.monthlyBurn)}/month net. At your current ${cfoContext.mrrGrowth}% MoM MRR growth, you'll reach default alive before the money runs out. I'd recommend starting investor conversations by October — 3–4 months before you need the money.`;
      }
      if (lowerMessage.includes("hire") || lowerMessage.includes("engineer")) {
        return `A senior engineer in Nairobi runs KES 120K–180K/month all-in including PAYE and NSSF. At KES 150K, your burn goes from ${formatKES(cfoContext.monthlyBurn)} to ${formatKES(cfoContext.monthlyBurn + 150000)} — that cuts your runway from ${cfoContext.runwayMonths} months to ${Math.floor(cfoContext.cashBalance / (cfoContext.monthlyBurn + 150000))} months. You can justify it if MRR hits KES 250K/month within 2 months. The risk: if growth slows to 8% MoM instead of ${cfoContext.mrrGrowth}%, you'd need to fundraise in under 5 months. I'd hire if you have a specific revenue-critical reason for the engineer, not just general capacity.`;
      }
      if (lowerMessage.includes("investor") || lowerMessage.includes("fundraising")) {
        return `Based on your current metrics and the Kenyan/East African funding landscape, here's where you stand: Your MRR growth at ${cfoContext.mrrGrowth}% MoM is strong — most seed investors in this region want to see 10%+ sustained over 6 months. Your burn multiple of ${cfoContext.burnMultiple.toFixed(1)}x is slightly high; the target is below 2x. The missing pieces for your data room are the cap table document and 12-month projections. Investors will also want to see your unit economics: CAC and LTV. Want me to walk you through how to calculate them from your current data?`;
      }
      if (lowerMessage.includes("expense") || lowerMessage.includes("spend")) {
        return `Your AWS spend jumped KES 34K this month, from KES 48K to KES 82K — triggered by load testing on June 4th. That's likely non-recurring. You also added one contractor (KES 45K) mid-month. Strip those out and your underlying burn is KES 388K, which is actually flat vs last month. The AWS spend is worth reviewing — I can see you're running dev and prod on the same instance tier, which may not be necessary.`;
      }
    }

    // Informal Business responses
    if (currentSegment === "informal_business") {
      if (lowerMessage.includes("money") && lowerMessage.includes("today")) {
        return `Today you made ${formatKES(25000)} and spent ${formatKES(18000)}. Your profit is ${formatKES(7000)}. Good work!`;
      }
      if (lowerMessage.includes("expense") || lowerMessage.includes("spent")) {
        return `Your biggest cost this month was restocking at ${formatKES(45000)}. Rent was ${formatKES(20000)} and transport was ${formatKES(8000)}.`;
      }
      if (lowerMessage.includes("save") || lowerMessage.includes("enough")) {
        return `You have ${formatKES(150000)} in savings. At your current spending, this will last you about 2 months if you make no sales. But you're making good money, so you should be fine.`;
      }
    }

    // Gig Worker responses
    if (currentSegment === "individual_gig") {
      if (lowerMessage.includes("credit") || lowerMessage.includes("score")) {
        return `Your credit score is 72/100 — that's good! Lenders like to see consistent income over time. You've had income for 8 months now, which shows stability. Keep recording your income and it will improve further.`;
      }
      if (lowerMessage.includes("income") || lowerMessage.includes("earn")) {
        return `This month you've earned ${formatKES(85000)} from 3 different income streams. Your biggest stream is freelance design at ${formatKES(50000)}. Having multiple streams is great for stability.`;
      }
      if (lowerMessage.includes("loan") || lowerMessage.length > 0) {
        return `With your credit score of 72 and consistent income history, you're in a good position to apply for loans. Most lenders will look at your last 6 months of income, which averages ${formatKES(78000)}/month. You could qualify for up to ${formatKES(300000)} depending on the lender.`;
      }
    }

    // SME Owner responses
    if (currentSegment === "sme_owner") {
      if (lowerMessage.includes("branch") || lowerMessage.includes("location")) {
        return `Your Nairobi CBD branch is performing best with 27% profit margin. Westlands is at 25%, and Mombasa Road is at 15%. The Mombasa Road branch needs attention — consider reviewing staffing levels or pricing there.`;
      }
      if (lowerMessage.includes("staff") || lowerMessage.includes("employee")) {
        return `Your staff costs are 68% of revenue, which is above the 40% target. You have 19 employees across 3 branches. Consider optimizing staffing at the Mombasa Road branch where revenue per staff is lowest.`;
      }
      if (lowerMessage.includes("stock") || lowerMessage.includes("inventory")) {
        return `You have ${formatKES(2400000)} tied up in inventory across all branches. That's high and affects your cash flow. Consider reducing stock levels by 20% to free up ${formatKES(480000)} in cash.`;
      }
    }

    // Default response
    return `I can help you with financial questions. Try asking about runway, hiring, expenses, fundraising (for startups), daily income, or your credit score.`;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const persona = getSegmentPersona(currentSegment);

  return (
    <div className="flex flex-col h-[600px] border border-border bg-card rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-sky-100 dark:bg-sky-950/20 p-2">
            <Bot className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{persona.name}</h3>
            <p className="text-xs text-muted-foreground">{persona.tone}</p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-sky-100 dark:bg-sky-950/20 p-4 mb-4">
              <Bot className="h-8 w-8 text-sky-600" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">{persona.name}</p>
            <p className="text-sm text-muted-foreground max-w-md">{persona.greeting}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="rounded-full bg-sky-100 dark:bg-sky-950/20 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-sky-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-sm p-3 ${
                message.role === "user"
                  ? "bg-sky-500 text-white"
                  : "bg-secondary text-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <div className="rounded-full bg-secondary p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="rounded-full bg-sky-100 dark:bg-sky-950/20 p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-sky-600" />
            </div>
            <div className="bg-secondary rounded-sm p-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${persona.name} a question...`}
            className="flex-1 h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-sm bg-sky text-sky-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
