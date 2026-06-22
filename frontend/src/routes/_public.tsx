import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Outlet />
    </div>
  );
}
