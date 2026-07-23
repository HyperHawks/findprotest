import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Leader Plans — Vanguard" },
      { name: "description", content: "Become a Leader to create protests and mobilize your community." },
      { property: "og:title", content: "Leader Plans — Vanguard" },
      { property: "og:description", content: "Become a Leader on Vanguard." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Pick your role</h1>
        <p className="text-sm font-mono uppercase text-muted-foreground mb-10">
          Follow the movement free · Lead it for $29/mo
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            name="Follower"
            price="Free"
            bg="bg-tertiary"
            cta={<Link to="/auth" className="block text-center py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase">Create free account</Link>}
            features={[
              "Full global map access",
              "Filter and follow protests",
              "Join / RSVP to protests",
              "Post updates to the community feed",
              "Read all verified news",
            ]}
          />
          <Card
            name="Leader"
            price="$29/mo"
            bg="bg-primary"
            cta={
              <button
                type="button"
                disabled
                className="block w-full text-center py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase opacity-60 cursor-not-allowed"
                title="Payments launch coming soon"
              >
                Coming soon — join waitlist
              </button>
            }
            features={[
              "Everything in Follower",
              "Create and manage protests",
              "Verified Leader badge",
              "Mobilization tools + attendee lists",
              "Broadcast updates to followers",
              "Advanced analytics",
            ]}
            highlighted
          />
        </div>
        <p className="mt-10 text-[11px] font-mono uppercase text-muted-foreground">
          Payments powered by Paddle · 7-day refund guarantee · cancel anytime.
        </p>
      </main>
    </div>
  );
}

function Card({
  name, price, features, cta, bg, highlighted,
}: { name: string; price: string; features: string[]; cta: React.ReactNode; bg: string; highlighted?: boolean }) {
  return (
    <div className={`border-2 border-border p-6 ${bg} ${highlighted ? "brutal-shadow" : ""}`}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-3xl font-black uppercase">{name}</h3>
        <span className="text-2xl font-black tabular-nums">{price}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm font-medium">
            <span className="font-black">✓</span> {f}
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
