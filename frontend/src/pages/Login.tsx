import { FormEvent, useEffect, useState } from 'react';
import { Github, LockKeyhole, Mail, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import InputField from '../components/InputField';

type AuthMode = 'login' | 'signup';

type LoginForm = {
  identifier: string;
  password: string;
};

type SignupForm = {
  confirmPassword: string;
  email: string;
  password: string;
  username: string;
};

type LoginErrors = Partial<Record<keyof LoginForm, string>>;
type SignupErrors = Partial<Record<keyof SignupForm, string>>;

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

  if (!form.username.trim()) {
    errors.username = 'Username is required.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 6) {
    errors.password = 'Use at least 6 characters.';
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
  const [mode, setMode] = useState<AuthMode>(location.pathname === '/signup' ? 'signup' : 'login');
  const [loginForm, setLoginForm] = useState<LoginForm>({ identifier: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({
    confirmPassword: '',
    email: '',
    password: '',
    username: '',
  });
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    navigate(nextMode === 'signup' ? '/signup' : '/login', { replace: true });
  };

  const completeAuth = (payload: Record<string, string>, authType: AuthMode) => {
    setIsLoading(true);
    console.log(`SKILL LENS ${authType}:`, payload);

    window.setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 650);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLogin(loginForm);
    setLoginErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    completeAuth(
      {
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      },
      'login',
    );
  };

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateSignup(signupForm);
    setSignupErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    completeAuth(
      {
        email: signupForm.email.trim(),
        password: signupForm.password,
        username: signupForm.username.trim(),
      },
      'signup',
    );
  };

  return (
    <AuthLayout>
      <div className="bg-slate-950/42 hover:border-cyan-300/24 relative z-10 w-full max-w-md animate-[fadeIn_0.55s_ease-out] rounded-3xl border border-white/[0.08] p-6 shadow-2xl shadow-black/35 backdrop-blur-3xl transition duration-300 hover:bg-slate-950/50 sm:p-8">
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-cyan-400/10 opacity-50 blur-xl" />
        <div className="relative">
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
              <div className="grid grid-cols-2 gap-3">
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

              <InputField
                autoComplete="username"
                error={loginErrors.identifier}
                icon={<Mail className="h-4 w-4" />}
                label="Email / Username"
                name="identifier"
                onChange={(event) => {
                  setLoginForm((current) => ({ ...current, identifier: event.target.value }));
                  setLoginErrors((current) => ({ ...current, identifier: undefined }));
                }}
                placeholder="you@example.com"
                type="text"
                value={loginForm.identifier}
              />

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
                  setLoginErrors((current) => ({ ...current, password: undefined }));
                }}
                placeholder="Enter your password"
                type="password"
                value={loginForm.password}
              />

              <Button isLoading={isLoading} type="submit">
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
              <div className="grid grid-cols-2 gap-3">
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

              <InputField
                autoComplete="email"
                error={signupErrors.email}
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                name="email"
                onChange={(event) => {
                  setSignupForm((current) => ({ ...current, email: event.target.value }));
                  setSignupErrors((current) => ({ ...current, email: undefined }));
                }}
                placeholder="you@example.com"
                type="email"
                value={signupForm.email}
              />

              <InputField
                autoComplete="username"
                error={signupErrors.username}
                icon={<User className="h-4 w-4" />}
                label="Username"
                name="username"
                onChange={(event) => {
                  setSignupForm((current) => ({ ...current, username: event.target.value }));
                  setSignupErrors((current) => ({ ...current, username: undefined }));
                }}
                placeholder="skillmaster"
                type="text"
                value={signupForm.username}
              />

              <InputField
                autoComplete="new-password"
                error={signupErrors.password}
                icon={<LockKeyhole className="h-4 w-4" />}
                label="Password"
                name="password"
                onChange={(event) => {
                  setSignupForm((current) => ({ ...current, password: event.target.value }));
                  setSignupErrors((current) => ({ ...current, password: undefined }));
                }}
                placeholder="Create a password"
                type="password"
                value={signupForm.password}
              />

              <InputField
                autoComplete="new-password"
                error={signupErrors.confirmPassword}
                icon={<LockKeyhole className="h-4 w-4" />}
                label="Confirm Password"
                name="confirmPassword"
                onChange={(event) => {
                  setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }));
                  setSignupErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                placeholder="Confirm your password"
                type="password"
                value={signupForm.confirmPassword}
              />

              <Button isLoading={isLoading} type="submit">
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
      </div>
    </AuthLayout>
  );
}

export default Login;
