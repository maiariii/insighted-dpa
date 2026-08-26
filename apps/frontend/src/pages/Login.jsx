import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { LoginSchema, RegisterSchema } from '@project/shared';
import { Shield, BarChart3, Lock, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Form states
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  const [regForm, setRegForm] = useState({
    first_name: '',
    last_name: '',
    position: '',
    region_id: '',
    division_id: '',
    deped_email: '',
    password: '',
    confirmPassword: '',
    passcode: ''
  });
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Region/Division options
  const [regions, setRegions] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filteredDivisions, setFilteredDivisions] = useState([]);

  useEffect(() => {
    API.auth.getRegionsDivisions()
      .then(data => {
        setRegions(data.regions || []);
        setDivisions(data.divisions || []);
      })
      .catch(err => {
        console.warn('Failed to load regions/divisions dropdowns:', err.message);
      });
  }, []);

  const handleRegionChange = (e) => {
    const regionVal = e.target.value;
    setRegForm(prev => ({ ...prev, region_id: regionVal, division_id: '' }));
    if (!regionVal) {
      setFilteredDivisions([]);
      return;
    }
    const filtered = divisions.filter(d => {
      if (!d.region_id) return true;
      return d.region_id === regionVal || regionVal.includes(d.region_id) || d.region_id.includes(regionVal);
    });
    setFilteredDivisions(filtered);
  };

  const handleRegChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = name === 'passcode' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setRegForm(prev => ({ ...prev, [name]: cleanValue }));
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setSigninError('');

    const payload = { deped_email: signinEmail.trim(), password: signinPassword };
    const validation = LoginSchema.safeParse(payload);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setSigninError(issue ? issue.message : 'Please enter valid email and password.');
      return;
    }

    setSigninLoading(true);
    try {
      await login(payload.deped_email, payload.password);
    } catch (err) {
      setSigninError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSigninLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (regForm.password !== regForm.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    if (!/^\d{6}$/.test(regForm.passcode.trim())) {
      setSignupError('Passcode must be exactly 6 numeric digits.');
      return;
    }

    const payload = {
      first_name: regForm.first_name.trim(),
      last_name: regForm.last_name.trim(),
      position: regForm.position.trim(),
      region_id: regForm.region_id.trim(),
      division_id: regForm.division_id.trim(),
      deped_email: regForm.deped_email.trim(),
      password: regForm.password,
      passcode: regForm.passcode.trim()
    };

    const validation = RegisterSchema.safeParse(payload);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setSignupError(issue ? issue.message : 'Invalid registration data.');
      return;
    }

    setSignupLoading(true);
    try {
      await register(payload);
    } catch (err) {
      setSignupError(err.message || 'Registration failed.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="split-auth-container login-split-container bg-slate-50 text-slate-900">
      {/* Left Hero Panel (50% Split Desktop, Hidden Mobile) */}
      <div
        className="auth-hero-panel photo-panel text-white p-8 lg:p-12 flex flex-col justify-between relative bg-cover bg-center overflow-hidden min-h-screen"
        style={{
          backgroundImage:
            `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.68) 50%, rgba(15, 23, 42, 0.92) 100%), url('${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/deped_building_bg.png')`
        }}
      >
        {/* Top Logos */}
        <div className="relative z-10 flex items-center space-x-3 mb-4 flex-wrap gap-y-2">
          <div className="bg-white/95 p-2 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.45)] border border-white/60 w-14 h-14 flex items-center justify-center flex-shrink-0">
            <img src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/deped_logo.png`} alt="DepEd Logo" className="h-10 w-auto object-contain transform scale-105" />
          </div>
          <div className="bg-white/95 p-2 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.45)] border border-white/60 w-14 h-14 flex items-center justify-center flex-shrink-0">
            <img src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/bagong_pilipinas.png`} alt="Bagong Pilipinas Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="bg-white/95 p-2 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.45)] border border-white/60 w-14 h-14 flex items-center justify-center flex-shrink-0">
            <img src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/hrod_logo.png`} alt="HROD Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="bg-white/95 p-1 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.45)] border border-white/60 w-14 h-14 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/insighted_logo_vertical.png`} alt="InsightED Logo" className="w-full h-full object-contain" style={{ transform: 'scale(1.8)' }} />
          </div>
        </div>

        {/* Main Title */}
        <div className="relative z-10 my-auto py-6">
          <h1
            className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-tight"
            style={{ WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.4)', textShadow: '0 6px 18px rgba(0, 0, 0, 0.7)' }}
          >
            Welcome to<br />
            <span className="text-amber-400">DepEd Personnel Audit Portal</span>
          </h1>
          <div className="w-16 h-1.5 bg-amber-400 rounded-full my-4 shadow-lg"></div>
          <p className="text-slate-200 text-sm max-w-md font-medium leading-relaxed drop-shadow">
            Division-level unfilled plantilla item monitoring &amp; personnel auditing platform.
          </p>
        </div>

        {/* Features & Bottom Banner Box */}
        <div className="relative z-10 mt-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-2 shadow-inner font-bold text-lg">
                <BarChart3 size={20} />
              </div>
              <h4 className="font-bold text-sm text-white tracking-wide">Personnel Auditing</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">Efficient division-level unfilled item tracking and status reporting.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-2 shadow-inner font-bold text-lg">
                <Shield size={20} />
              </div>
              <h4 className="font-bold text-sm text-white tracking-wide">Secure Validation</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">Passcode-protected audit revisions and secure personnel profiles.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/60 flex items-center gap-3.5 shadow-xl">
            <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex-shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">Official Department of Education Platform</h5>
              <p className="text-slate-300 text-[11px] mt-0.5">© 2026 Bureau of Human Resource and Organizational Development (BHROD)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel login-form-container w-full flex items-center justify-center p-6 md:p-12 min-h-screen relative bg-gradient-to-br from-slate-50 via-slate-100/70 to-teal-50/40 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {!isRegistering ? (
          /* Sign-in View */
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl p-8 lg:p-10 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome Back</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Sign in with your registered DepEd account credentials.</p>
            </div>
            {signinError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                {signinError}
              </div>
            )}
            <form onSubmit={handleSignin} className="space-y-4" novalidate>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">DepEd Email</label>
                <input
                  type="email"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium"
                  placeholder="user@deped.gov.ph"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={signinLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {signinLoading ? 'Signing in…' : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="relative flex py-1 items-center justify-center">
              <div className="w-full border-t border-slate-200"></div>
              <span className="absolute bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">or</span>
            </div>

            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-sm rounded-xl border border-slate-200/80 shadow-sm transition-all duration-200 text-center cursor-pointer"
            >
              Create an Account
            </button>
          </div>
        ) : (
          /* Sign-up View */
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl p-8 lg:p-10 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Create Account</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Register your HRMO personnel credentials to request portal access.</p>
            </div>
            {signupError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                {signupError}
              </div>
            )}
            <form onSubmit={handleSignup} className="space-y-4" novalidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={regForm.first_name}
                    onChange={handleRegChange}
                    required
                    className="w-full p-2 border border-slate-200 rounded text-sm"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={regForm.last_name}
                    onChange={handleRegChange}
                    required
                    className="w-full p-2 border border-slate-200 rounded text-sm"
                    placeholder="Last"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Position / Title</label>
                <input
                  type="text"
                  name="position"
                  value={regForm.position}
                  onChange={handleRegChange}
                  required
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                  placeholder="HRMO II / Auditor"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Region</label>
                  <select
                    name="region_id"
                    value={regForm.region_id}
                    onChange={handleRegionChange}
                    required
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded text-sm"
                  >
                    <option value="">Select Region</option>
                    {regions.map(r => {
                      const val = r.name || r.id;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Division</label>
                  <select
                    name="division_id"
                    value={regForm.division_id}
                    onChange={handleRegChange}
                    required
                    disabled={!regForm.region_id}
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded text-sm disabled:opacity-50"
                  >
                    <option value="">Select Division</option>
                    {filteredDivisions.map(d => {
                      const val = d.office_name || d.name || d.id;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">DepEd Email</label>
                <input
                  type="email"
                  name="deped_email"
                  value={regForm.deped_email}
                  onChange={handleRegChange}
                  autoComplete="username"
                  required
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                  placeholder="name@deped.gov.ph"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={regForm.password}
                  onChange={handleRegChange}
                  autoComplete="new-password"
                  required
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={regForm.confirmPassword}
                  onChange={handleRegChange}
                  autoComplete="new-password"
                  required
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Passcode <span className="text-slate-400 font-normal text-[9px]">(6-digit Emergency Credential)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="passcode"
                    value={regForm.passcode}
                    onChange={handleRegChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoComplete="off"
                    className={`w-full p-2 pr-9 border rounded text-sm font-mono tracking-widest transition-all ${
                      /^\d{6}$/.test(regForm.passcode)
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200'
                    }`}
                    placeholder="123456"
                  />
                  {/^\d{6}$/.test(regForm.passcode) && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center justify-center pointer-events-none transition-transform scale-110">
                      <CheckCircle2 size={16} className="stroke-[2.5]" />
                    </span>
                  )}
                </div>
                {regForm.passcode.length > 0 && regForm.passcode.length < 6 && (
                  <span className="text-[10px] text-amber-600 font-medium block mt-1">
                    {regForm.passcode.length}/6 digits entered
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={signupLoading}
                className="w-full p-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded shadow transition-all cursor-pointer"
              >
                {signupLoading ? 'Registering…' : 'Register Account'}
              </button>
            </form>
            <p className="text-xs text-slate-500 text-center">
              Already registered?{' '}
              <button type="button" onClick={() => setIsRegistering(false)} className="text-teal-600 font-semibold hover:underline cursor-pointer">
                Cancel
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
