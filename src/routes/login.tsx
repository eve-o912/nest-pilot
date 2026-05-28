import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  component: () => <AuthCard mode="login" />,
  head: () => ({
    meta: [
      { title: "Log In — Nest Pilot" },
      { name: "description", content: "Sign back in to your Nest Pilot vendor dashboard." },
    ],
  }),
});
