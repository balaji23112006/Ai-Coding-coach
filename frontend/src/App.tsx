import { useEffect } from 'react';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { useAuth } from './features/authentication/hooks/useAuth';
import type { AuthContextType } from './providers/AuthProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EditorPage from './features/code-editor/pages/EditorPage';

// Define context type for the router
interface MyRouterContext {
  auth: AuthContextType;
}

// 1. Root Route
const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
});

// 2. Index Route (redirects to dashboard if logged in, otherwise to login)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    } else {
      throw redirect({ to: '/login' });
    }
  },
});

// 3. Login Route (public-only, redirects to dashboard if already authenticated)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: Login,
});

// 4. Signup Route (public-only, redirects to dashboard if already authenticated)
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: Login, // Login page handles signup mode as well
});

// 5. Dashboard Route (protected, redirects to login if not authenticated)
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Dashboard,
});

// 5b. Editor Route (protected, redirects to login if not authenticated)
const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: EditorPage,
});

// 6. Create Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,
  editorRoute,
]);

// 7. Create Router Instance
const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // Will be provided dynamically in the component render
  },
});

// 8. Register Router for type-safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// 9. App Component
export default function App() {
  const auth = useAuth();

  // Automatically re-evaluate route guards when authentication status changes
  useEffect(() => {
    router.invalidate();
  }, [auth.isAuthenticated]);

  // If loading session, show loading spinner
  if (auth.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050508]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading session...</p>
        </div>
      </main>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}
