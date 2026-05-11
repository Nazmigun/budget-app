import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [mode, setMode] = useState('login'); // login or signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text: '' }
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'E-posta ve şifre gerekli.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Şifre en az 6 karakter olmalı.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage({ 
            type: 'success', 
            text: 'Hesap oluşturuldu! E-posta adresinize bir doğrulama linki gönderildi.' 
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      let msg = err.message || 'Bir hata oluştu.';
      if (msg.includes('Invalid login credentials')) msg = 'E-posta veya şifre yanlış.';
      if (msg.includes('User already registered')) msg = 'Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.';
      if (msg.includes('Email not confirmed')) msg = 'E-posta adresinizi doğrulamanız gerekiyor.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-container-margin">
      <div className="animate-scale-in w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-sm p-container-margin flex flex-col gap-stack-lg border border-outline-variant/30 relative overflow-hidden">
        
        {/* Decorative Ambient Light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        {/* Header / Brand */}
        <div className="flex flex-col items-center justify-center gap-stack-sm text-center z-10">
          <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center text-primary-container mb-2">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <h1 className="font-display-tr text-display-tr text-primary">Mali Kontrol</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Finansal netliğe hoş geldiniz</p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-surface-container-high rounded-lg p-1 z-10 relative">
          <button 
            onClick={() => { setMode('login'); setMessage(null); }}
            className={`flex-1 py-2 font-label-caps text-label-caps rounded-md transition-all ${mode === 'login' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Giriş Yap
          </button>
          <button 
            onClick={() => { setMode('signup'); setMessage(null); }}
            className={`flex-1 py-2 font-label-caps text-label-caps rounded-md transition-all ${mode === 'signup' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="z-10 p-3 rounded-xl font-body-sm text-body-sm" style={{
            background: message.type === 'error' ? 'var(--error-container)' : 'var(--surface-container-high)',
            color: message.type === 'error' ? 'var(--on-error-container)' : 'var(--on-surface)',
            borderLeft: `4px solid ${message.type === 'error' ? 'var(--error)' : 'var(--primary)'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-stack-md z-10" onSubmit={handleSubmit}>
          
          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-on-surface-variant ml-1" htmlFor="email">E-posta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline-variant text-xl">mail</span>
              </div>
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ornek@eposta.com" 
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md outline-none transition-all placeholder-on-surface-variant/50" 
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center ml-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="password">Şifre</label>
              {mode === 'login' && (
                <a href="#" className="font-label-caps text-label-caps text-primary hover:text-primary-fixed-dim transition-colors">Şifremi Unuttum?</a>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline-variant text-xl">lock</span>
              </div>
              <input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••" 
                className="w-full pl-10 pr-10 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md outline-none transition-all placeholder-on-surface-variant/50" 
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-outline-variant hover:text-on-surface transition-colors">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 mt-2 bg-primary-container text-on-primary rounded-xl font-label-caps text-label-caps flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
          >
            {loading ? 'Bekleniyor...' : (mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
            {!loading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
          </button>
        </form>

        {/* Alternative Login (Static for UI) */}
        {mode === 'login' && (
          <div className="flex flex-col gap-stack-md z-10 mt-2">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-outline-variant/50"></div>
              <span className="flex-shrink-0 mx-4 font-label-caps text-label-caps text-on-surface-variant">veya şununla devam et</span>
              <div className="flex-grow border-t border-outline-variant/50"></div>
            </div>
            <div className="flex gap-4 justify-center">
              <button type="button" className="w-14 h-14 bg-surface-container-high rounded-xl flex items-center justify-center hover:bg-surface-container-highest transition-colors border border-outline-variant/30">
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
