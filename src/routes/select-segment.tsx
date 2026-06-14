import { createFileRoute } from "@tanstack/react-router";
import { SegmentSelection } from "@/components/SegmentSelection";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/select-segment")({
  component: SelectSegment,
  head: () => ({
    meta: [
      { title: "Choose Your Experience — Nest Pilot" },
      { name: "description", content: "Select your business type to customize your dashboard." },
    ],
  }),
});

function SelectSegment() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate({ to: "/setup" });
  };

  return <SegmentSelection onComplete={handleComplete} />;
}
