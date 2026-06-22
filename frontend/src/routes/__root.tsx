import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AuthProvider } from '@/features/authentication';
import { Toaster } from '@/components/ui/toaster';

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  ),
});
