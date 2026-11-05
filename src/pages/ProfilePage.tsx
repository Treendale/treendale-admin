import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Lock, KeyRound, ShieldCheck,
  Eye, EyeOff, Save,
  BellRing, Info, Sparkles
} from 'lucide-react';
import { adminAuthApi, adminSettingsApi } from '../lib/api';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useToast } from '../contexts/ToastContext';
import clsx from 'clsx';

export default function ProfilePage() {
  const { user, updateUser } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── 1. Admin Notification Email (Business Settings) ─────────────────────────
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isSavingNotification, setIsSavingNotification] = useState(false);

  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.get(),
  });

  const settings = settingsData?.data?.data?.settings;

  useEffect(() => {
    if (settings && settings.notificationEmail !== undefined) {
      setNotificationEmail(settings.notificationEmail || '');
    }
  }, [settings?.notificationEmail]);

  async function handleSaveNotificationEmail(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingNotification(true);
    try {
      await adminSettingsApi.update({
        notificationEmail: notificationEmail.trim().toLowerCase(),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Admin notification email updated successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to update notification email';
      toast.error(msg);
    } finally {
      setIsSavingNotification(false);
    }
  }

  // ─── 2. Personal Details (Name & Phone) ──────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  async function handleSavePersonalDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setIsSavingDetails(true);
    try {
      const res = await adminAuthApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      const updated = res?.data?.data?.user;
      if (updated) {
        updateUser(updated);
      }
      toast.success('Personal profile details updated');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to update profile details';
      toast.error(msg);
    } finally {
      setIsSavingDetails(false);
    }
  }

  // ─── 3. Change Login Email ──────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState(user?.email || '');
  const [isSavingLoginEmail, setIsSavingLoginEmail] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setLoginEmail(user.email);
    }
  }, [user?.email]);

  async function handleSaveLoginEmail(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Login email cannot be empty');
      return;
    }
    if (cleanEmail === user?.email?.toLowerCase()) {
      toast.info('Login email is already up to date');
      return;
    }
    setIsSavingLoginEmail(true);
    try {
      const res = await adminAuthApi.updateProfile({ email: cleanEmail });
      const updated = res?.data?.data?.user;
      if (updated) {
        updateUser(updated);
      }
      toast.success('Login email updated. Use this email the next time you sign in.');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to update login email';
      toast.error(msg);
    } finally {
      setIsSavingLoginEmail(false);
    }
  }

  // ─── 4. Change Password ─────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsSavingPassword(true);
    try {
      await adminAuthApi.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to change password. Please verify current password.';
      toast.error(msg);
    } finally {
      setIsSavingPassword(false);
    }
  }

  const activeNotificationTarget = notificationEmail.trim() || user?.email || 'System default';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Page Header / Banner ── */}
      <div className="card bg-gradient-to-br from-white via-white to-brand-50/40 border border-admin-border p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-brand-500/20 flex-shrink-0">
            {user?.firstName?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-brand-950 font-serif">
                {user?.firstName} {user?.lastName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-700 border border-brand-500/20 capitalize">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role || 'Admin'}
              </span>
            </div>
            <p className="text-sm text-cocoa/60 mt-1">
              Manage your personal admin account, login credentials, and booking notification preferences.
            </p>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-5 pt-4 border-t border-admin-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-cocoa/70">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-cocoa/50">Login Account:</span>
            <span className="font-semibold text-brand-950 truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-cocoa/50">Alerts Sent To:</span>
            <span className="font-semibold text-brand-950 truncate">{activeNotificationTarget}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── CARD 1: Admin Notification Email (Booking Alerts) ── */}
        <div className="card space-y-4">
          <div className="flex items-start gap-3 border-b border-admin-border pb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 flex-shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">Admin Notification Email</h2>
              <p className="text-xs text-cocoa/60 mt-0.5">
                Where booking alerts, reschedule requests, and admin emails are delivered.
              </p>
            </div>
          </div>

          <div className="p-3 bg-brand-50/50 border border-brand-200/50 rounded-lg text-xs text-brand-900/80 space-y-1">
            <p className="font-semibold text-brand-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Independent from Login Email
            </p>
            <p>
              You can set this to your official salon mailbox (e.g. <span className="font-mono text-brand-800">info@treendalethreading.com.au</span>) or any email where you want to receive booking updates, even if you log in with another account.
            </p>
          </div>

          <form onSubmit={handleSaveNotificationEmail} className="space-y-4">
            <div>
              <label className="label" htmlFor="notification-email">Notification Destination Email</label>
              <div className="relative">
                <input
                  id="notification-email"
                  type="email"
                  className="input pl-10"
                  placeholder="e.g. info@treendalethreading.com.au"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  disabled={isLoadingSettings}
                />
                <Mail className="w-4 h-4 text-cocoa/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-cocoa/50 mt-1">
                Leave blank to automatically fall back to your admin login email (<span className="text-brand-900 font-medium">{user?.email}</span>).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-cocoa/50">
                Current destination:{' '}
                <strong className="text-brand-950">{activeNotificationTarget}</strong>
              </span>
              <button
                type="submit"
                disabled={isSavingNotification || isLoadingSettings}
                className="btn-primary text-xs min-h-[38px] px-4"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingNotification ? 'Saving...' : 'Save Email'}
              </button>
            </div>
          </form>
        </div>

        {/* ── CARD 2: Admin Login Email ── */}
        <div className="card space-y-4">
          <div className="flex items-start gap-3 border-b border-admin-border pb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 flex-shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">Admin Login Email</h2>
              <p className="text-xs text-cocoa/60 mt-0.5">
                The email address used to sign in to this admin dashboard.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900/80 space-y-1">
            <p className="font-semibold text-amber-950 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              Login Authentication Only
            </p>
            <p>
              Updating this changes your sign-in credentials. It will <strong>not</strong> change where customer booking emails are sent.
            </p>
          </div>

          <form onSubmit={handleSaveLoginEmail} className="space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Account Sign-In Email</label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="admin@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <User className="w-4 h-4 text-cocoa/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-cocoa/50 mt-1">
                Must be a valid, unique email address not used by other accounts.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingLoginEmail || loginEmail.trim().toLowerCase() === user?.email?.toLowerCase()}
                className="btn-primary text-xs min-h-[38px] px-4"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingLoginEmail ? 'Updating...' : 'Update Login Email'}
              </button>
            </div>
          </form>
        </div>

        {/* ── CARD 3: Change Password ── */}
        <div className="card space-y-4">
          <div className="flex items-start gap-3 border-b border-admin-border pb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">Change Password</h2>
              <p className="text-xs text-cocoa/60 mt-0.5">
                Update your account password to maintain security.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="label" htmlFor="current-password">Current Password</label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa/40 hover:text-cocoa/80 p-1"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="new-password">New Password (Min 8 characters)</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="input pr-10"
                  placeholder="Enter new strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa/40 hover:text-cocoa/80 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirm-password">Confirm New Password</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className={clsx(
                    'input pr-10',
                    confirmPassword && newPassword !== confirmPassword && 'border-red-400 focus:border-red-400'
                  )}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa/40 hover:text-cocoa/80 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || !newPassword || newPassword !== confirmPassword}
                className="btn-primary text-xs min-h-[38px] px-4"
              >
                <Lock className="w-3.5 h-3.5" />
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* ── CARD 4: Personal Profile Information ── */}
        <div className="card space-y-4">
          <div className="flex items-start gap-3 border-b border-admin-border pb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">Personal Details</h2>
              <p className="text-xs text-cocoa/60 mt-0.5">
                Your display name and contact phone number.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePersonalDetails} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="first-name">First Name</label>
                <input
                  id="first-name"
                  type="text"
                  required
                  className="input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="last-name">Last Name</label>
                <input
                  id="last-name"
                  type="text"
                  required
                  className="input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="phone">Contact Phone</label>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder="e.g. 0412 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-[11px] text-cocoa/50 mt-1">
                Optional contact number associated with your administrator profile.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingDetails}
                className="btn-primary text-xs min-h-[38px] px-4"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingDetails ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
