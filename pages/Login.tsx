import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { School, ArrowRight, Lock, Mail, Loader2, GraduationCap } from 'lucide-react';

// UCAD Logo URL
const LOGO_UCAD = "https://upload.wikimedia.org/wikipedia/fr/4/43/Logo_UCAD.png";

export const Login: React.FC = () => {
  const { login, schoolName } = useApp();
  
  // Form States
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email);
      if (!success) {
        setError("Email introuvable ou erreur de connexion.");
      }
    } catch (err) {
      setError("Une erreur technique est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-slate-100">
        
        {/* Left Side - Visual */}
        <div className="md:w-5/12 bg-gradient-to-br from-sky-500 to-indigo-600 p-12 flex flex-col justify-between text-white relative">
          <div className="absolute inset-0 bg-white/10 pattern-tech opacity-20"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl lg:text-5xl font-black flex flex-col gap-2 mb-3 tracking-tight">
              <span className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full w-16 h-16 flex items-center justify-center shadow-lg overflow-hidden">
                  {logoError ? (
                     <GraduationCap className="w-10 h-10 text-sky-600" />
                  ) : (
                     <img 
                       src={LOGO_UCAD} 
                       alt="UCAD" 
                       className="w-full h-full object-contain" 
                       referrerPolicy="no-referrer"
                       onError={() => setLogoError(true)}
                     />
                  )}
                </div>
                Portail
              </span>
              <span>{schoolName}</span>
            </h1>
            <p className="text-sky-100 font-medium text-lg mt-6 leading-relaxed opacity-90">
              La plateforme éducative moderne pour une gestion de classe simplifiée.
            </p>
          </div>

          <div className="z-10 space-y-4 my-12">
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 shadow-lg">
              <p className="font-bold text-white text-lg">🚀 Espace Numérique</p>
              <p className="text-sm opacity-80 mt-1">Centralisez vos cours, examens et annonces.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 shadow-lg">
               <p className="font-bold text-white text-lg">🌍 Communauté</p>
               <p className="text-sm opacity-80 mt-1">Restez connecté avec votre classe en temps réel.</p>
            </div>
          </div>

          <div className="text-xs text-sky-200/60 z-10 font-mono uppercase tracking-widest">
            © 2026 {schoolName} Digital
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-7/12 p-8 md:p-16 bg-white flex flex-col justify-center">
          <div className="mb-10">
            <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-sky-100">Accès Membre</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-4 tracking-tight">Connexion</h2>
            <p className="text-slate-500 mt-2 font-medium">Entrez vos identifiants pour accéder à votre espace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Adresse Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800"
                  placeholder="votre.email@ecole.com"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-3 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            
            <div className="text-center mt-6">
               <a href="#" className="text-sm text-slate-400 hover:text-sky-600 font-medium transition">Mot de passe oublié ?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};