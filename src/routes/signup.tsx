import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/signup")({
  component: () => <AuthCard mode="signup" />,
  head: () => ({
    meta: [
      { title: "Create Account — Nest Pilot" },
      { name: "description", content: "Start tracking your vendor business with Nest Pilot." },
    ],
  }),
});
