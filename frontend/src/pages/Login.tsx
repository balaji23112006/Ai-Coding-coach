import { FormEvent, useEffect, useState, useRef } from 'react';
import { Github, LockKeyhole, Mail, User } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/ui/Button';
import InputField from '../components/ui/InputField';
import { useAuth } from '../features/authentication/hooks/useAuth';
import { ApiError } from '../services/api-client';

type AuthMode = 'login' | 'signup';

type LoginForm = {
  identifier: string;
  password: string;
};

type SignupForm = {
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
  username: string;
};

type LoginErrors = Partial<Record<keyof LoginForm | 'server', string>>;
type SignupErrors = Partial<Record<keyof SignupForm | 'server', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(form: LoginForm) {
  const errors: LoginErrors = {};

  if (!form.identifier.trim()) {
    errors.identifier = 'Email or username is required.';
  } else if (form.identifier.includes('@') && !emailPattern.test(form.identifier.trim())) {
    errors.identifier = 'Enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  }

  return errors;
}

function validateSignup(form: SignupForm) {
  const errors: SignupErrors = {};

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!form.username.trim()) {
    errors.username = 'Username is required.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
    errors.username = 'Only letters, numbers, and underscores.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = 'Include at least one uppercase letter.';
  } else if (!/[a-z]/.test(form.password)) {
    errors.password = 'Include at least one lowercase letter.';
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = 'Include at least one number.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<AuthMode>(location.pathname === '/signup' ? 'signup' : 'login');
  const [loginForm, setLoginForm] = useState<LoginForm>({ identifier: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({
    confirmPassword: '',
    email: '',
    fullName: '',
    password: '',
    username: '',
  });
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // --- Interactive Motion values & Springs (No-re-render high performance) ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  // Smooth springs for dampened tracking
  const springX = useSpring(mouseX, { damping: 40, stiffness: 120 });
  const springY = useSpring(mouseY, { damping: 40, stiffness: 120 });
  const springRotateX = useSpring(rotateX, { damping: 30, stiffness: 100 });
  const springRotateY = useSpring(rotateY, { damping: 30, stiffness: 100 });

  // Map to smooth css transformations
  const bgX = useTransform(springX, (val) => `${val * 0.15}px`);
  const bgY = useTransform(springY, (val) => `${val * 0.15}px`);

  const [typingPulse, setTypingPulse] = useState(0);
  const [particles, setParticles] = useState<{ id: number; left: number; size: number }[]>([]);

  // 1. Mouse movement tracking for ambient background shifts
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      const offsetX = (event.clientX / window.innerWidth - 0.5) * 35;
      const offsetY = (event.clientY / window.innerHeight - 0.5) * 35;
      mouseX.set(offsetX);
      mouseY.set(offsetY);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [mouseX, mouseY]);

  // 2. 3D Tilt calculation on card hover
  const handleCardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    // Constrain tilt to max 6 degrees for professional layout
    rotateX.set(-(y / (rect.height / 2)) * 6);
    rotateY.set((x / (rect.width / 2)) * 6);
  };

  const handleCardMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  // 3. Key stroke reactive particle trigger
  const handleKeyDown = () => {
    setTypingPulse((prev) => prev + 1);

    // Create subtle reactive rising glow particles
    const id = Date.now() + Math.random();
    const left = Math.random() * 100;
    const size = Math.random() * 4 + 3; // 3px to 7px particle

    setParticles((prev) => [...prev.slice(-8), { id, left, size }]);
  };

  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLoginErrors({});
    setSignupErrors({});
    navigate({ to: nextMode === 'signup' ? '/signup' : '/login', replace: true });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLogin(loginForm);
    setLoginErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const identifier = loginForm.identifier.trim();
      await login({
        ...(identifier.includes('@') ? { email: identifier } : { username: identifier }),
        password: loginForm.password,
      });
      navigate({ to: '/dashboard' });
    } catch (error) {
      if (error instanceof ApiError) {
        setLoginErrors({ server: error.message });
      } else {
        setLoginErrors({ server: 'Network error. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateSignup(signupForm);
    setSignupErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        email: signupForm.email.trim(),
        fullName: signupForm.fullName.trim(),
        password: signupForm.password,
        username: signupForm.username.trim(),
      });
      navigate({ to: '/dashboard' });
    } catch (error) {
      if (error instanceof ApiError) {
        setSignupErrors({ server: error.message });
      } else {
        setSignupErrors({ server: 'Network error. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        className="relative flex w-full items-center justify-center"
        style={{
          x: bgX,
          y: bgY,
        }}
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          onKeyDown={handleKeyDown}
          style={{
            transformStyle: 'preserve-3d',
            rotateX: springRotateX,
            rotateY: springRotateY,
          }}
          className="bg-slate-950/42 hover:border-cyan-300/24 relative z-10 w-full max-w-md animate-[fadeIn_0.55s_ease-out] rounded-3xl border border-white/[0.08] p-6 shadow-2xl shadow-black/35 backdrop-blur-3xl transition duration-300 hover:bg-slate-950/50 sm:p-8"
        >
          {/* Dynamic keypress responsive backdrop glow */}
          <motion.div
            key={`pulse-${typingPulse}`}
            initial={{ opacity: 0.45, scale: 0.98 }}
            animate={{ opacity: 0.65, scale: 1.01 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-violet-500/15 via-blue-500/10 to-cyan-400/15 opacity-50 blur-xl"
          />

          {/* Floating glow particles when typing */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <AnimatePresence>
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ y: '105%', x: 0, opacity: 0.9, scale: 1 }}
                  animate={{ y: '-10%', x: (Math.random() - 0.5) * 30, opacity: 0, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  style={{
                    left: `${p.left}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                  }}
                  className="absolute bottom-0 rounded-full bg-gradient-to-t from-cyan-400/50 to-purple-400/25 blur-[1px]"
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="relative" style={{ transform: 'translateZ(30px)' }}>
            <div className="mb-8 space-y-3">
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm leading-6 text-slate-400">
                {mode === 'login'
                  ? 'Sign in to continue your coding practice.'
                  : 'Start learning with AI-guided coding feedback.'}
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-cyan-300/15 text-cyan-100 shadow-sm shadow-cyan-950/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => switchMode('login')}
                type="button"
              >
                Login
              </button>
              <button
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                  mode === 'signup'
                    ? 'bg-cyan-300/15 text-cyan-100 shadow-sm shadow-cyan-950/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => switchMode('signup')}
                type="button"
              >
                Sign Up
              </button>
            </div>

            {mode === 'login' ? (
              <form className="space-y-5" noValidate onSubmit={handleLogin}>
                {loginErrors.server && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                    {loginErrors.server}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3" style={{ transform: 'translateZ(20px)' }}>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]"
                    type="button"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]"
                    type="button"
                  >
                    <span className="text-base font-semibold">G</span>
                    Google
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  or continue with email
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="username"
                    error={loginErrors.identifier}
                    icon={<Mail className="h-4 w-4" />}
                    label="Email / Username"
                    name="identifier"
                    onChange={(event) => {
                      setLoginForm((current) => ({ ...current, identifier: event.target.value }));
                      setLoginErrors((current) => ({
                        ...current,
                        identifier: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="you@example.com"
                    type="text"
                    value={loginForm.identifier}
                  />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="current-password"
                    error={loginErrors.password}
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Password"
                    labelAction={
                      <a
                        className="text-xs font-medium text-slate-400 transition hover:text-cyan-200"
                        href="#forgot"
                      >
                        Forgot Password?
                      </a>
                    }
                    name="password"
                    onChange={(event) => {
                      setLoginForm((current) => ({ ...current, password: event.target.value }));
                      setLoginErrors((current) => ({
                        ...current,
                        password: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="Enter your password"
                    type="password"
                    value={loginForm.password}
                  />
                </div>

                <Button
                  isLoading={isLoading}
                  type="submit"
                  style={{ transform: 'translateZ(10px)' }}
                >
                  Login
                </Button>

                <p className="text-center text-sm text-slate-400">
                  New to SKILL LENS?{' '}
                  <button
                    className="font-semibold text-cyan-200 transition hover:text-white"
                    onClick={() => switchMode('signup')}
                    type="button"
                  >
                    Create account
                  </button>
                </p>
              </form>
            ) : (
              <form className="space-y-5" noValidate onSubmit={handleSignup}>
                {signupErrors.server && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                    {signupErrors.server}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3" style={{ transform: 'translateZ(20px)' }}>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]"
                    type="button"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]"
                    type="button"
                  >
                    <span className="text-base font-semibold">G</span>
                    Google
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  or use email
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="name"
                    error={signupErrors.fullName}
                    icon={<User className="h-4 w-4" />}
                    label="Full Name"
                    name="fullName"
                    onChange={(event) => {
                      setSignupForm((current) => ({ ...current, fullName: event.target.value }));
                      setSignupErrors((current) => ({
                        ...current,
                        fullName: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="Jane Smith"
                    type="text"
                    value={signupForm.fullName}
                  />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="email"
                    error={signupErrors.email}
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    name="email"
                    onChange={(event) => {
                      setSignupForm((current) => ({ ...current, email: event.target.value }));
                      setSignupErrors((current) => ({
                        ...current,
                        email: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="you@example.com"
                    type="email"
                    value={signupForm.email}
                  />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="username"
                    error={signupErrors.username}
                    icon={<User className="h-4 w-4" />}
                    label="Username"
                    name="username"
                    onChange={(event) => {
                      setSignupForm((current) => ({ ...current, username: event.target.value }));
                      setSignupErrors((current) => ({
                        ...current,
                        username: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="skillmaster"
                    type="text"
                    value={signupForm.username}
                  />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="new-password"
                    error={signupErrors.password}
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Password"
                    name="password"
                    onChange={(event) => {
                      setSignupForm((current) => ({ ...current, password: event.target.value }));
                      setSignupErrors((current) => ({
                        ...current,
                        password: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="Min 8 chars, uppercase, lowercase, number"
                    type="password"
                    value={signupForm.password}
                  />
                </div>

                <div style={{ transform: 'translateZ(15px)' }}>
                  <InputField
                    autoComplete="new-password"
                    error={signupErrors.confirmPassword}
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Confirm Password"
                    name="confirmPassword"
                    onChange={(event) => {
                      setSignupForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }));
                      setSignupErrors((current) => ({
                        ...current,
                        confirmPassword: undefined,
                        server: undefined,
                      }));
                    }}
                    placeholder="Confirm your password"
                    type="password"
                    value={signupForm.confirmPassword}
                  />
                </div>

                <Button
                  isLoading={isLoading}
                  type="submit"
                  style={{ transform: 'translateZ(10px)' }}
                >
                  Sign Up
                </Button>

                <p className="text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    className="font-semibold text-cyan-200 transition hover:text-white"
                    onClick={() => switchMode('login')}
                    type="button"
                  >
                    Login
                  </button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}

export default Login;
