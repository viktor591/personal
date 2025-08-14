export default function Page() {
  return (
    <div>
      {/* @ts-expect-error Server Component wrapper for a Client Component */}
      <ClientApp />
    </div>
  );
}

"use client";
import ElevenFounderScoringAppV2 from "@/components/ElevenFounderScoringAppV2";
function ClientApp() {
  return <ElevenFounderScoringAppV2 />;
}
