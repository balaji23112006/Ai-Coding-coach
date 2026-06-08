function App() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="bg-primary/10 text-primary border-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
        </div>
        <h1 className="from-primary bg-gradient-to-r to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent lg:text-5xl">
          AI Coding Coach
        </h1>
        <p className="text-muted-foreground text-lg">
          Premium react-vite setup configured. Workspaces, TanStack Router, Tailwind CSS, Monaco
          Editor & BetterAuth client folders are initialized.
        </p>
        <div className="bg-muted border-border flex justify-center gap-4 rounded-lg border p-3 font-mono text-xs">
          <span className="text-primary">pnpm dev</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-green-400">workspace ready</span>
        </div>
      </div>
    </div>
  );
}

export default App;
