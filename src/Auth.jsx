import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Cloud } from 'lucide-react';
import { supabase } from './supabase';

export default function Auth() {
  const [mode, setMode] = useState('login'); // login or signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text: '' }

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email ve şifre gerekli.' });
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
          // Email confirmation gerekli
          setMessage({ 
            type: 'success', 
            text: 'Hesap oluşturuldu! Email adresine bir doğrulama linki gönderildi. Spam klasörünü de kontrol et.' 
          });
        } else if (data.session) {
          // Direkt giriş yapıldı (confirmation kapalıysa)
          // App.jsx auth state listener'ı otomatik halleder
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // App.jsx auth state listener'ı otomatik halleder
      }
    } catch (err) {
      let msg = err.message || 'Bir hata oluştu.';
      // Yaygın hatalar için Türkçe çeviri
      if (msg.includes('Invalid login credentials')) msg = 'Email veya şifre yanlış.';
      if (msg.includes('User already registered')) msg = 'Bu email zaten kayıtlı. Giriş yapmayı dene.';
      if (msg.includes('Email not confirmed')) msg = 'Email adresini doğrulaman gerek. Email kutunu (ve spam klasörünü) kontrol et.';
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
    <div className="min-h-screen w-full flex items-center justify-center" style={{
      fontFamily: "'Fraunces', Georgia, serif",
      background: 'linear-gradient(135deg, #F5EFE6 0%, #E8DDC9 100%)',
      color: '#2C2416'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600&display=swap');
        .num-font { font-family: 'Fraunces', serif; }
        .ui-font { font-family: 'Inter', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
      `}</style>

      <div className="w-full max-w-md px-6 py-12">
        {/* Header */}
        <div className="fade-up delay-1 mb-10">
          <div className="flex items-center gap-2 mb-6 ui-font" style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
            <Cloud size={12} />
            <span>Bulut Senkronizasyonu</span>
          </div>
          <h1 className="text-5xl mb-3" style={{ fontWeight: 300, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? <>Tekrar <em style={{ fontWeight: 400 }}>hoş geldin</em>.</> : <>Hesabını <em style={{ fontWeight: 400 }}>oluştur</em>.</>}
          </h1>
          <p className="ui-font text-sm mt-4" style={{ color: '#5C4F3A', lineHeight: 1.6 }}>
            {mode === 'login' 
              ? 'Verilerine her cihazdan erişmek için giriş yap.'
              : 'Verilerin tüm cihazlarında senkronize olur, hiçbir şey kaybolmaz.'
            }
          </p>
        </div>

        {/* Email */}
        <div className="fade-up delay-2 mb-6">
          <label className="ui-font block mb-2" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: '#8B7355' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ornek@email.com"
              className="ui-font w-full bg-transparent border-0 border-b-2 outline-none py-2 pl-7"
              style={{
                borderColor: '#2C2416',
                fontSize: '16px',
                color: '#2C2416'
              }}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="fade-up delay-3 mb-7">
          <label className="ui-font block mb-2" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
            Şifre <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: 'normal' }}>(en az 6 karakter)</span>
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: '#8B7355' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="ui-font w-full bg-transparent border-0 border-b-2 outline-none py-2 pl-7"
              style={{
                borderColor: '#2C2416',
                fontSize: '16px',
                color: '#2C2416'
              }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-5 p-4 ui-font text-sm" style={{
            background: message.type === 'error' ? 'rgba(232, 155, 127, 0.2)' : 'rgba(168, 208, 141, 0.2)',
            borderLeft: `3px solid ${message.type === 'error' ? '#C97B5C' : '#7AB05E'}`,
            color: '#2C2416',
            lineHeight: 1.5
          }}>
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="fade-up delay-4 w-full ui-font py-4 transition-all flex items-center justify-center gap-3 group mb-5"
          style={{
            background: loading ? '#D4C4A8' : '#2C2416',
            color: loading ? '#8B7355' : '#F5EFE6',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          {loading ? 'Bekleniyor...' : (mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur')}
          {!loading && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
        </button>

        {/* Mode switch */}
        <div className="fade-up delay-4 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setMessage(null);
            }}
            className="ui-font text-sm"
            style={{ color: '#8B7355' }}
          >
            {mode === 'login' 
              ? <>Hesabın yok mu? <span style={{ color: '#2C2416', textDecoration: 'underline', fontWeight: 500 }}>Hesap oluştur</span></>
              : <>Zaten hesabın var mı? <span style={{ color: '#2C2416', textDecoration: 'underline', fontWeight: 500 }}>Giriş yap</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
