export function SiteFooter() {
  return (
    <footer className="border-t-4 border-border py-12 px-6 bg-tertiary grid grid-cols-1 md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <span className="text-3xl font-black tracking-tighter uppercase italic">FINDPROTEST</span>
        <p className="text-xs font-mono font-bold max-w-sm mt-4 uppercase leading-relaxed">
          A real-time global index of civic mobilization. Community-verified. Color-coded by intensity.
          Built for organizers, journalists, and citizens.
        </p>
      </div>
      <div className="space-y-3">
        <h5 className="text-[11px] font-mono font-extrabold uppercase underline">Platform</h5>
        <ul className="text-[10px] font-mono font-bold space-y-2 uppercase">
          <li>Global Map</li>
          <li>Verified News</li>
          <li>Community Feed</li>
        </ul>
      </div>
      <div className="space-y-3">
        <h5 className="text-[11px] font-mono font-extrabold uppercase underline">Accounts</h5>
        <ul className="text-[10px] font-mono font-bold space-y-2 uppercase">
          <li>Follower (Free)</li>
          <li>Leader ($29/mo)</li>
          <li>Safety Guidelines</li>
        </ul>
      </div>
    </footer>
  );
}
