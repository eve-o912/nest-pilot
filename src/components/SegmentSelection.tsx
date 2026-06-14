import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { actions, type UserSegment } from "@/lib/store";
import { Store, Briefcase, User, Building2, ArrowRight, Check } from "lucide-react";

interface SegmentOption {
  id: UserSegment;
  title: string;
  description: string;
  icon: React.ReactNode;
  questions: string[];
}

const SEGMENTS: SegmentOption[] = [
  {
    id: "informal_business",
    title: "Informal Business",
    description: "Shop, kiosk, market stall, salon, food vendor",
    icon: <Store className="h-6 w-6" />,
    questions: [
      "Did I make money today?",
      "What did I spend?",
      "Do I have enough to keep going?",
    ],
  },
  {
    id: "startup_founder",
    title: "Startup",
    description: "Early-stage company, growing team",
    icon: <Briefcase className="h-6 w-6" />,
    questions: [
      "How long until I run out of money?",
      "Am I growing fast enough to raise?",
      "Can I afford this decision?",
    ],
  },
  {
    id: "individual_gig",
    title: "Gig / Individual",
    description: "Freelancer, contractor, salaried with side income",
    icon: <User className="h-6 w-6" />,
    questions: [
      "What are my income streams?",
      "How consistent is my income?",
      "What would lenders see?",
    ],
  },
  {
    id: "sme_owner",
    title: "Growing SME",
    description: "Multi-staff business, multiple branches",
    icon: <Building2 className="h-6 w-6" />,
    questions: [
      "How is each branch performing?",
      "What are my staff costs vs revenue?",
      "Where is my cash tied up?",
    ],
  },
];

export function SegmentSelection({ onComplete }: { onComplete?: () => void }) {
  const [selectedSegment, setSelectedSegment] = useState<UserSegment | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedSegment) {
      actions.setSegment(selectedSegment);
      if (onComplete) {
        onComplete();
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Who are you building with?</h1>
          <p className="text-muted-foreground">
            Select the option that best describes you. This will customize your dashboard and features.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SEGMENTS.map((segment) => (
            <button
              key={segment.id}
              onClick={() => setSelectedSegment(segment.id)}
              className={`relative border-2 rounded-sm p-8 text-left transition-all min-h-[200px] ${
                selectedSegment === segment.id
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
                  : "border-border bg-card hover:border-sky-300"
              }`}
            >
              {selectedSegment === segment.id && (
                <div className="absolute top-4 right-4 rounded-full bg-sky-500 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className={`rounded-sm p-4 ${
                  selectedSegment === segment.id
                    ? "bg-sky-500 text-white"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {segment.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{segment.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{segment.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      You'll answer:
                    </p>
                    {segment.questions.map((question, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        • {question}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleContinue}
            disabled={!selectedSegment}
            className="inline-flex items-center gap-2 rounded-sm bg-sky px-8 py-4 text-sm font-semibold text-sky-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
