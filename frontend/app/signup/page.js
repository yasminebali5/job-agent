import AuthForm from '../components/AuthForm';

export const metadata = { title: 'Create account - Jobly' };

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
