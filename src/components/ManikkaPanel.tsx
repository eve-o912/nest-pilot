import { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, TrendingUp, AlertTriangle, Wallet, CreditCard, Package, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { callManikka } from "@/lib/gemini";
import { useStore } from "@/lib/store";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ManikkaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManikkaPanel({ isOpen, onClose }: ManikkaPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const business = useStore((s) => s.business);

  const quickActions = [
    "How much profit did I make this month?",
    "Show my Financial Passport score",
    "Why is my cash flow down?",
    "What should I focus on this week?",
    "Am I eligible for financing?",
  ];

  useEffect(() => {
    if (isOpen) {
      fetchBusinessData();
      // Add welcome message if no messages exist
      if (messages.length === 0) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        
        setMessages([{
          role: "assistant",
          content: `${greeting}.\n\nI'm Manikka.\n\nI monitor your business activity, explain your numbers, identify risks, and help improve your Financial Passport.\n\nWhat would you like to know?`,
          timestamp: new Date(),
        }]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      // Calculate revenue metrics
      const incomeTransactions = transactions?.filter((t: any) => t.type === "income") || [];
      const expenseTransactions = transactions?.filter((t: any) => t.type === "expense") || [];
      
      const monthlyRevenue = incomeTransactions
        .filter((t: any) => {
          const date = new Date(t.created_at);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const weeklyRevenue = incomeTransactions
        .filter((t: any) => {
          const date = new Date(t.created_at);
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        })
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const dailyRevenue = incomeTransactions
        .filter((t: any) => {
          const date = new Date(t.created_at);
          const today = new Date();
          return date.toDateString() === today.toDateString();
        })
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Calculate expenses by category
      const expensesByCategory = expenseTransactions.reduce((acc: any, t: any) => {
        const category = t.category || "Other";
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {});

      const expenses = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: amount as number,
        frequency: "varies",
      }));

      // Fetch inventory data
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id);

      const inventory = products?.map((p: any) => ({
        product: p.name,
        quantity: p.current_stock,
        salesVelocity: 0, // Would need sales history to calculate
        profitMargin: ((p.selling_price - p.buying_price) / p.selling_price) * 100,
      })) || [];

      // Mock Financial Passport data (would need actual calculation)
      const financialPassport = {
        score: 84,
        revenueConsistency: 87,
        savingsConsistency: 94,
        marginScore: 78,
        loanEligibility: 240000,
      };

      setBusinessData({
        transactions: transactions || [],
        revenue: { daily: dailyRevenue, weekly: weeklyRevenue, monthly: monthlyRevenue },
        expenses,
        inventory,
        financialPassport,
        businessName: business.name,
        currency: "KES",
      });
    } catch (error) {
      console.error("Error fetching business data:", error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!businessData) {
        await fetchBusinessData();
      }

      const response = await callManikka(message, businessData || {
        transactions: [],
        revenue: { daily: 0, weekly: 0, monthly: 0 },
        expenses: [],
        inventory: [],
        financialPassport: { score: 0, revenueConsistency: 0, savingsConsistency: 0, marginScore: 0, loanEligibility: 0 },
        businessName: business.name,
        currency: "KES",
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    handleSendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 p-0 sm:p-4">
      <div className="h-full w-full sm:h-auto sm:w-[420px] bg-white shadow-2xl flex flex-col" style={{ backgroundColor: "#0B1F3A" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: "#F59E0B" }} />
              Manikka
            </h2>
            <p className="text-sm text-gray-400">Your AI CFO</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        <div className="px-4 py-2 border-b border-white/10">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Connected to your business data
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-[#00AEEF] text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="w-full text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" style={{ color: "#F59E0B" }} />
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Ask Manikka anything..."
              className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 px-3 text-sm text-white placeholder-gray-400 outline-none focus:border-[#F59E0B] transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 rounded-lg bg-[#F59E0B] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
