
function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          AI Coding Coach
        </h1>
        <p className="text-lg text-muted-foreground">
          Premium react-vite setup configured. Workspaces, TanStack Router, Tailwind CSS, Monaco Editor & BetterAuth client folders are initialized.
        </p>
        <div className="flex justify-center gap-4 text-xs font-mono bg-muted p-3 rounded-lg border border-border">
          <span className="text-primary">pnpm dev</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-green-400">workspace ready</span>
        </div>
      </div>
    </div>
  );
}

export default App;
