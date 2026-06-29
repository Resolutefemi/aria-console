export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
          <span className="font-mono text-sm font-bold text-accent-foreground">A</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span>Loading Aria Console…</span>
        </div>
      </div>
    </div>
  )
}
