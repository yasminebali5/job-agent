import { Suspense } from 'react';
import ResetPasswordForm from '../components/ResetPasswordForm';

export const metadata = { title: 'Reset password - Jobly' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
