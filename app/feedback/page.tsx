import type { Metadata } from "next";
import { HubSpotFeedbackFormEmbed } from "@/components/feedback/HubSpotFeedbackFormEmbed";

export const metadata: Metadata = {
  title: "Submit feedback | Superwork",
};

export default function FeedbackPage() {
  return (
    <div className="min-h-[calc(100dvh-6rem)] bg-gradient-to-b from-gray-50 to-white px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-gray-950/[0.04] sm:p-8">
          <HubSpotFeedbackFormEmbed />
        </div>
      </div>
    </div>
  );
}
