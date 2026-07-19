import { Navigate } from 'react-router-dom';
import { AdminProfileCard } from '@/components/admin/AdminProfileCard';
import { AdminReadOnlyNotice } from '@/components/admin/AdminReadOnlyNotice';
import { useAuthStore } from '@/features/auth/authStore';
import { useAdmin } from '@/hooks/useAdmin';
import { LoadingState, Page, PageHeader } from '@/shared/components';

export default function AdminProfilePage() {
  const admin = useAdmin();
  const profile = useAuthStore((state) => state.profile);

  if (admin.isLoading) {
    return (
      <Page>
        <LoadingState label="Loading admin profile" />
      </Page>
    );
  }

  if (!admin.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin/profile' }} />;
  }

  if (!admin.isAdmin || !admin.user) {
    return <Navigate to="/access-denied" replace state={{ reason: 'Missing admin role in JWT app_metadata.' }} />;
  }

  return (
    <Page>
      <PageHeader
        title="Admin Profile"
        description="Read-only administrator identity details from the authenticated Supabase session."
      />
      <AdminReadOnlyNotice />
      <AdminProfileCard user={admin.user} claims={admin.claims} profile={profile} />
    </Page>
  );
}
