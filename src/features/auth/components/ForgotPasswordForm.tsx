import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  InlineLoader,
  OtpInput,
  PasswordInput,
} from '../../../components/ui';
import {
  isValidIndianPhone,
  isValidPassword,
  maskPhone,
} from '../../../utils/validation';
import {
  requestPasswordResetOtp,
  resetPasswordWithVerifiedOtp,
  verifyPasswordResetOtp,
} from '../services/authService';
import {
  AuthActionsRow,
  AuthDemoPill,
  AuthForm,
  AuthHelperCard,
  AuthPillLink,
  AuthTextLink,
  authPrimaryButtonClass,
} from './AuthChrome';
import { PhoneInput } from './PhoneInput';

type Step = 'phone' | 'otp' | 'password' | 'done';

interface FormErrors {
  phone?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

const DEMO_PHONES = [
  { label: 'Super Admin', phone: '9876543210' },
  { label: 'Admin', phone: '9876543211' },
  { label: 'User', phone: '9876543212' },
] as const;

export function ForgotPasswordForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function handleSendOtp(event?: FormEvent) {
    event?.preventDefault();
    const nextErrors: FormErrors = {};
    if (!phone.trim()) nextErrors.phone = 'Enter your mobile number.';
    else if (!isValidIndianPhone(phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await requestPasswordResetOtp(phone);
      setMaskedPhone(result.maskedPhone);
      setDemoOtp(result.demoOtp);
      setOtp('');
      setStep('otp');
      setResendIn(30);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : 'Unable to send OTP. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (otp.length !== 6) nextErrors.otp = 'Enter the 6-digit OTP.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await verifyPasswordResetOtp(phone, otp);
      setStep('password');
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'OTP verification failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!password) nextErrors.password = 'Create a new password.';
    else if (!isValidPassword(password)) nextErrors.password = 'Use at least 8 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Confirm your new password.';
    else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await resetPasswordWithVerifiedOtp(phone, password);
      setStep('done');
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : 'Unable to reset password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="success" title="Password updated">
          Your password has been reset successfully. You can now sign in with your new
          password.
        </Alert>
        <AuthActionsRow>
          <AuthTextLink to="/signup">Create account</AuthTextLink>
          <AuthPillLink to="/login">Sign in</AuthPillLink>
        </AuthActionsRow>
        <Button variant="primary" fullWidth className={authPrimaryButtonClass} onClick={() => navigate('/login')}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <AuthForm onSubmit={handleResetPassword}>
        {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
        <Alert variant="info">
          Create a new password for +91 {maskPhone(phone)}.
        </Alert>

        <FormField id="reset-password" label="New password" required error={errors.password}>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            hasError={Boolean(errors.password)}
            disabled={isSubmitting}
            className="rounded-lg border-slate-200 bg-slate-50"
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        <FormField
          id="reset-confirm-password"
          label="Confirm password"
          required
          error={errors.confirmPassword}
        >
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            hasError={Boolean(errors.confirmPassword)}
            disabled={isSubmitting}
            className="rounded-lg border-slate-200 bg-slate-50"
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </FormField>

        <AuthActionsRow>
          <AuthTextLink to="/login">Back to sign in</AuthTextLink>
          <AuthPillLink to="/signup">Create account</AuthPillLink>
        </AuthActionsRow>

        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className={authPrimaryButtonClass}>
          {isSubmitting ? <InlineLoader>Updating…</InlineLoader> : 'Update password'}
        </Button>
      </AuthForm>
    );
  }

  if (step === 'otp') {
    return (
      <AuthForm onSubmit={handleVerifyOtp}>
        {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
        <Alert variant="info" title="OTP sent">
          {`Code sent to +91 ${maskedPhone || maskPhone(phone)}.`}
        </Alert>

        <FormField id="reset-otp" label="Enter OTP" required error={errors.otp}>
          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={isSubmitting}
            hasError={Boolean(errors.otp)}
          />
        </FormField>

        <AuthActionsRow>
          <Button
            type="button"
            variant="ghost"
            className="!px-2"
            onClick={() => {
              setStep('phone');
              setOtp('');
              setErrors({});
            }}
            disabled={isSubmitting}
          >
            Change number
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSendOtp()}
            disabled={isSubmitting || resendIn > 0}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
          </Button>
        </AuthActionsRow>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isSubmitting || otp.length < 6}
          className={authPrimaryButtonClass}
        >
          {isSubmitting ? <InlineLoader>Verifying…</InlineLoader> : 'Verify OTP & continue'}
        </Button>

        <AuthHelperCard
          title={
            <>
              Demo OTP · <span className="font-semibold text-slate-700">{demoOtp || '123456'}</span>
            </>
          }
        />
      </AuthForm>
    );
  }

  return (
    <AuthForm onSubmit={handleSendOtp}>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}

      <FormField
        id="reset-phone"
        label="Registered mobile number"
        required
        error={errors.phone}
        hint="Enter the 10-digit number linked to your account."
      >
        <PhoneInput
          id="reset-phone"
          value={phone}
          onChange={setPhone}
          hasError={Boolean(errors.phone)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          aria-invalid={Boolean(errors.phone) || undefined}
          aria-describedby={errors.phone ? 'reset-phone-error' : 'reset-phone-hint'}
        />
      </FormField>

      <AuthActionsRow>
        <AuthTextLink to="/login">Back to sign in</AuthTextLink>
        <AuthPillLink to="/signup">Create account</AuthPillLink>
      </AuthActionsRow>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className={authPrimaryButtonClass}>
        {isSubmitting ? <InlineLoader>Sending OTP…</InlineLoader> : 'Send OTP'}
      </Button>

      <AuthHelperCard
        title={
          <>
            Quick demo phones · OTP <span className="font-semibold text-slate-700">123456</span>
          </>
        }
      >
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Demo phones">
          {DEMO_PHONES.map((account) => (
            <AuthDemoPill
              key={account.label}
              disabled={isSubmitting}
              onClick={() => {
                setPhone(account.phone);
                setErrors({});
              }}
            >
              {account.label}
            </AuthDemoPill>
          ))}
        </div>
      </AuthHelperCard>
    </AuthForm>
  );
}
