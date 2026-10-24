import React, { useState } from 'react';
import {
  Building2,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { authenticateUser, USER_ACCOUNTS } from '../data/inmConfig';
import { HospitalConfig, UserAccount } from '../types/inm';

interface LoginPageProps {
  hospital: HospitalConfig;
  onLoginSuccess: (account: UserAccount) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ hospital, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAccountsGuide, setShowAccountsGuide] = useState(true);
  const [selectedQuickId, setSelectedQuickId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Silakan isi Username dan Password terlebih dahulu.');
      return;
    }

    const matched = authenticateUser(username, password);
    if (!matched) {
      setErrorMsg(
        'Username atau Password tidak sesuai. Gunakan nama ruangan sesuai instalasi/unit Anda (contoh: rawat inap, laboratorium, igd).'
      );
      return;
    }

    onLoginSuccess(matched);
  };

  const handleQuickFill = (acc: UserAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setSelectedQuickId(acc.id);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Left Column (Top on Mobile): Login Form */}
          <div className="lg:col-span-5 order-1">
            {/* Hospital Identity Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Sistem Informasi INM Kemenkes
                </p>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {hospital.name}
                </h1>
                <p className="text-xs text-slate-500 truncate">{hospital.subTitle}</p>
              </div>
            </div>

            {/* Login Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">Masuk Akun Ruangan</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Masukkan username dan password sesuai nama ruangan Anda untuk mengisi Lembar Kerja INM.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="inm-username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="inm-username"
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Contoh: rawat inap, igd, farmasi"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-base sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="inm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="inm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Masukkan password sesuai nama ruangan"
                      className="w-full min-h-[48px] pl-10 pr-12 py-2.5 rounded-xl border border-slate-300 bg-white text-base sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Lembar Kerja</span>
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Seluruh data inputan setiap ruangan otomatis tersimpan permanen sesuai bulannya di menu{' '}
                  <strong className="text-slate-700">Lembar Kerja</strong> dan tersinkronisasi lintas perangkat (HP &amp; Komputer).
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Bottom on Mobile): 9 Rooms Directory Only */}
          <div className="lg:col-span-7 order-2">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowAccountsGuide(!showAccountsGuide)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer min-h-[52px]"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daftar Akun Login Ruangan (9 Ruangan)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ketuk salah satu ruangan di bawah untuk mengisi Username &amp; Password otomatis
                  </p>
                </div>
                <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  {showAccountsGuide ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {showAccountsGuide && (
                <div className="border-t border-slate-200 divide-y divide-slate-100">
                  {USER_ACCOUNTS.filter((acc) => acc.role !== 'ADMIN').map((acc) => {
                    const isSelected = selectedQuickId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className={`px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {acc.unitCode}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">
                                {acc.roomName}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-800">
                                Khusus Ruang {acc.roomName}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums flex items-center flex-wrap gap-x-3 gap-y-0.5">
                              <span>
                                User: <strong className="text-slate-800">{acc.username}</strong>
                              </span>
                              <span>
                                Pass: <strong className="text-slate-800">{acc.password}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickFill(acc)}
                            className={`min-h-[44px] w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terpilih</span>
                              </>
                            ) : (
                              <span>Gunakan Akun</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <p>
          {hospital.name} &bull; Sistem Informasi Indikator Nasional Mutu (Permenkes No. 30 Tahun 2022)
        </p>
      </footer>
    </div>
  );
};
