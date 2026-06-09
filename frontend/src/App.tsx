import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';

function MockPage({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 font-sans text-white">
      <div className="max-w-md rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-8 text-center shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
          SKILL LENS
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Mock route for frontend demo navigation.
        </p>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/login" />} path="/" />
      <Route element={<Login />} path="/login" />
      <Route element={<Login />} path="/signup" />
      <Route element={<MockPage title="Dashboard" />} path="/dashboard" />
    </Routes>
  );
}

export default App;
