export const metadata = { title: "Offline — Residence Hub" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-lines px-6">
      <div className="text-center max-w-sm">
        <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-3">
          NO SIGNAL
        </div>
        <h1 className="font-display text-4xl mb-3">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          Residence Hub needs a connection for live data. Reconnect and try again.
        </p>
      </div>
    </div>
  );
}
