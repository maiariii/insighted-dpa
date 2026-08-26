import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { API } from '../services/api';
import { CollaboratorInviteSchema } from '@project/shared';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { collaborators, refreshDashboard } = useApp();

  // Collaborator form state
  const [collabForm, setCollabForm] = useState({
    first_name: '',
    last_name: '',
    position: '',
    email: ''
  });
  const [inviting, setInviting] = useState(false);
  const [collabError, setCollabError] = useState('');

  // Passcode change form state
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [passcodeVerified, setPasscodeVerified] = useState(null);

  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Maria Santos' : 'Maria Santos';
  const position = user?.position || 'Human Resource Management Officer';
  const regionName = user?.region_name || user?.region_id || 'Region V - Bicol';
  const divisionName = user?.division_office_name || user?.division_id || 'Division of Masbate City';
  const location = [regionName, divisionName].filter(Boolean).join(' • ');

  const handleCollabInputChange = (e) => {
    const { name, value } = e.target;
    setCollabForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePwdInputChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = name === 'currentPassword' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setPwdForm(prev => ({ ...prev, [name]: cleanValue }));

    if (name === 'currentPassword') {
      setPasscodeVerified(null);
      setPwdError('');
      if (cleanValue.length === 6) {
        setVerifyingPasscode(true);
        API.auth.verifyPasscode(cleanValue)
          .then(res => {
            if (res.success && res.valid) {
              setPasscodeVerified(true);
              setPwdError('');
            } else {
              setPasscodeVerified(false);
              setPwdError('Current passcode is incorrect.');
            }
          })
          .catch(err => {
            setPasscodeVerified(false);
            setPwdError(err.message || 'Failed to verify current passcode.');
          })
          .finally(() => {
            setVerifyingPasscode(false);
          });
      }
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setCollabError('');

    const payload = {
      first_name: collabForm.first_name.trim(),
      last_name: collabForm.last_name.trim(),
      position: collabForm.position.trim(),
      email: collabForm.email.trim()
    };

    // Zod validation check using CollaboratorInviteSchema
    const validation = CollaboratorInviteSchema.safeParse(payload);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setCollabError(issue ? issue.message : 'Please enter valid collaborator details.');
      return;
    }

    setInviting(true);
    try {
      const res = await API.collaborators.inviteCollaborator(payload);
      if (res.success) {
        alert(`Success! Collaborator ${payload.first_name} ${payload.last_name} has been invited.\n\nLogin Email: ${payload.email}\nDefault Password: 123456`);
        setCollabForm({ first_name: '', last_name: '', position: '', email: '' });
        await refreshDashboard();
      } else {
        setCollabError(res.error || 'Failed to invite collaborator.');
      }
    } catch (err) {
      setCollabError(err.message || 'Failed to invite collaborator.');
    } finally {
      setInviting(false);
    }
  };

  const handleChangePasscode = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!pwdForm.currentPassword) {
      setPwdError('Please enter your current passcode.');
      return;
    }
    if (!/^\d{6}$/.test(pwdForm.currentPassword.trim())) {
      setPwdError('Current passcode must be exactly 6 numeric digits.');
      return;
    }
    if (!pwdForm.newPassword) {
      setPwdError('Please enter a new password.');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New password and confirmation password do not match.');
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    setUpdatingPwd(true);
    try {
      const res = await API.auth.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
        confirmPassword: pwdForm.confirmPassword
      });

      if (res.success) {
        setPwdSuccess(res.message || 'Password updated successfully!');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasscodeVerified(null);
      } else {
        setPwdError(res.error || 'Failed to update password.');
      }
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPwd(false);
    }
  };

  const handleDeleteCollaborator = async (id) => {
    if (confirm('Are you sure you want to remove this collaborator? Their access will be revoked.')) {
      try {
        await API.collaborators.deleteCollaborator(id);
        await refreshDashboard();
      } catch (err) {
        alert(`Failed to remove collaborator: ${err.message}`);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: HRMO Profile Card & Change Passcode Card */}
      <div className="space-y-6">
        {/* HRMO Profile Card */}
        <article className="card card-glass p-6">
          <div className="specular-sheen"></div>
          <div className="section-title mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">HRMO Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Account fields used for audit ownership.</p>
            </div>
          </div>
          <div className="form-stack space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              First name
              <input className="field w-full mt-1" value={user?.first_name || 'Maria'} readOnly />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Last name
              <input className="field w-full mt-1" value={user?.last_name || 'Santos'} readOnly />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Position
              <input className="field w-full mt-1" value={position} readOnly />
            </label>
          </div>
        </article>

        {/* Change Password Card */}
        <article className="card card-glass p-6">
          <div className="specular-sheen"></div>
          <div className="section-title mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Change Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verify your current passcode to update your account password.</p>
            </div>
          </div>

          {pwdError && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
              {pwdError}
            </div>
          )}

          {pwdSuccess && (
            <div className="p-3 mb-4 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 font-medium">
              {pwdSuccess}
            </div>
          )}

          <form onSubmit={handleChangePasscode} className="form-stack space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="currentPassword"
                  value={pwdForm.currentPassword}
                  onChange={handlePwdInputChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoComplete="off"
                  className={`field w-full pr-9 text-sm font-mono tracking-widest transition-all ${
                    passcodeVerified === true
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : passcodeVerified === false
                      ? 'border-red-500 bg-red-50/40 text-red-950 dark:bg-red-950/20 dark:text-red-300 ring-2 ring-red-500/20'
                      : ''
                  }`}
                  placeholder="123456"
                />
                {verifyingPasscode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center pointer-events-none">
                    <Loader2 size={16} className="animate-spin" />
                  </span>
                )}
                {!verifyingPasscode && passcodeVerified === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 flex items-center justify-center pointer-events-none transition-transform scale-110">
                    <CheckCircle2 size={16} className="stroke-[2.5]" />
                  </span>
                )}
                {!verifyingPasscode && passcodeVerified === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 flex items-center justify-center pointer-events-none transition-transform scale-110">
                    <XCircle size={16} className="stroke-[2.5]" />
                  </span>
                )}
              </div>
              {verifyingPasscode && (
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Verifying current passcode against database...
                </span>
              )}
              {!verifyingPasscode && passcodeVerified === true && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  ✓ Passcode verified against database
                </span>
              )}
              {!verifyingPasscode && passcodeVerified === false && (
                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold block mt-1">
                  Incorrect current passcode
                </span>
              )}
              {!verifyingPasscode && passcodeVerified === null && pwdForm.currentPassword.length > 0 && pwdForm.currentPassword.length < 6 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                  {pwdForm.currentPassword.length}/6 digits entered
                </span>
              )}
            </div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              New Password
              <input
                type="password"
                name="newPassword"
                value={pwdForm.newPassword}
                onChange={handlePwdInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="••••••••"
                required
              />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Confirm New Password
              <input
                type="password"
                name="confirmPassword"
                value={pwdForm.confirmPassword}
                onChange={handlePwdInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              disabled={updatingPwd}
              className="btn py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer w-full mt-2"
            >
              {updatingPwd ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </article>
      </div>

      {/* Right Column: Collaborators & Scope Card */}
      <article className="card card-glass p-6 md:col-span-2">
        <div className="specular-sheen"></div>
        <div className="section-title mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Collaborators &amp; Scope</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Invite helpers to collaborate within scope.</p>
          </div>
        </div>

        {collabError && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
            {collabError}
          </div>
        )}

        <form onSubmit={handleInvite} className="form-stack space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              First name
              <input
                type="text"
                name="first_name"
                value={collabForm.first_name}
                onChange={handleCollabInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="Jose"
                required
              />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Last name
              <input
                type="text"
                name="last_name"
                value={collabForm.last_name}
                onChange={handleCollabInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="Reyes"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Position
              <input
                type="text"
                name="position"
                value={collabForm.position}
                onChange={handleCollabInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="Administrative Officer II"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Email address
              <input
                type="email"
                name="email"
                value={collabForm.email}
                onChange={handleCollabInputChange}
                className="field w-full mt-1 text-sm"
                placeholder="assistant@deped.gov.ph"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={inviting}
            className="btn py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            {inviting ? 'Inviting...' : 'Invite collaborator'}
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500 block mt-1">
            Collaborators inherit scope: {location}
          </span>
        </form>

        {/* Active Collaborators Section */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-3">
            Active Collaborators
          </h4>
          <div className="space-y-2">
            {collaborators.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No active collaborators yet.</p>
            ) : (
              collaborators.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <div>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      {c.first_name} {c.last_name}
                    </strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.position || 'Collaborator'} • {c.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pill green text-[10px]">ACTIVE</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollaborator(c.id)}
                      className="text-red-600 hover:text-red-700 text-xs font-bold bg-none border-none cursor-pointer p-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </article>
    </div>
  );
};
