import { useStore, actions, type UserSegment } from "@/lib/store";
import { Store, Briefcase, User, Building2 } from "lucide-react";

const SEGMENTS = [
  {
    id: "informal_business" as UserSegment,
    label: "Informal Business",
    icon: Store,
    description: "Daily income & expenses",
  },
  {
    id: "startup_founder" as UserSegment,
    label: "Startup Founder",
    icon: Briefcase,
    description: "Runway, burn, MRR",
  },
  {
    id: "individual_gig" as UserSegment,
    label: "Gig Worker",
    icon: User,
    description: "Income streams & credit",
  },
  {
    id: "sme_owner" as UserSegment,
    label: "SME Owner",
    icon: Building2,
    description: "Multi-branch, staff, POS",
  },
];

export function SegmentModeSwitch() {
  const currentSegment = useStore((s) => s.currentSegment);

  return (
    <div className="flex items-center gap-1 bg-secondary rounded-sm p-1">
      {SEGMENTS.map((segment) => {
        const Icon = segment.icon;
        const isActive = currentSegment === segment.id;
        return (
          <button
            key={segment.id}
            onClick={() => actions.setSegment(segment.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={segment.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
