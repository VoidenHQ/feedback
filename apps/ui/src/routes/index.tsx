import { AppLayout } from "@/core/layout/AppLayout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => {
    return (
      <div>
        <AppLayout />
      </div>
    );
  },
});
