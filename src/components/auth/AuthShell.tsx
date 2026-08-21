/**
 * The frame every signed-out page shares — sign in, forgot password, reset
 * password. Extracted so the three look like one place rather than three.
 */

export const authInputClass =
  "w-full px-4 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all placeholder:text-muted-foreground";

export const authButtonClass =
  "w-full bg-gradient-to-r from-primary to-accent text-white py-3 px-4 rounded-xl hover:from-primary hover:to-accent transition-all font-medium disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 duration-200";

export function AuthShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-primary/[0.08] blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-accent/[0.06] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl gradient-primary items-center justify-center glow mb-4">
            <span className="text-white font-bold text-xl">RH</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Residence Hub</h1>
          <p className="text-muted-foreground text-sm mt-2">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card/50 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A message panel — red for a problem, sage for a confirmation. */
export function AuthNotice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const style =
    tone === "error"
      ? "bg-red-500/10 border-red-500/20 text-red-400"
      : "bg-[hsl(var(--sage)/0.12)] border-[hsl(var(--sage)/0.3)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]";
  return <div className={`p-3 rounded-xl border text-sm ${style}`}>{children}</div>;
}
