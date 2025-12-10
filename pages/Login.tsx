
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Mail, Lock, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff } from 'lucide-react';

const LOGO_UCAD = "https://upload.wikimedia.org/wikipedia/fr/4/43/Logo_UCAD.png";

export const Login: React.FC = () => {
  const { login, addNotification } = useApp();
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(email);
      if (!success) setError("Identifiants incorrects.");
    } catch {
      setError("Erreur technique.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    addNotification("Veuillez contacter l'administrateur pour réinitialiser votre mot de passe.", "INFO");
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[700px] border border-white">
        
        {/* Visual Side (Sky Blue Theme) */}
        <div className="md:w-1/2 bg-brand-pastel relative p-12 text-white flex flex-col justify-between overflow-hidden">
           {/* Decorative Blobs */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-500 rounded-full blur-[100px] opacity-30 -ml-20 -mb-20"></div>
           
           <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                 <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-lg tracking-wide text-white">Class Connect</span>
           </div>

           <div className="relative z-10">
              <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6 tracking-tight text-white drop-shadow-sm">
                 Le futur de<br/><span className="text-brand-900">l'éducation.</span>
              </h1>
              <p className="text-brand-900/80 text-lg max-w-sm leading-relaxed font-medium">
                 Organisez, Connectez, Partagez. Une plateforme unifiée pour votre réussite.
              </p>
           </div>

           <div className="relative z-10 flex gap-4 text-brand-900 text-xs font-bold uppercase tracking-widest bg-white/20 inline-block self-start p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <span>Sécurisé</span> • <span>Rapide</span> • <span>Intuitif</span>
           </div>
        </div>

        {/* Form Side */}
        <div className="md:w-1/2 p-12 lg:p-20 flex flex-col justify-center bg-white relative">
           <div className="max-w-sm mx-auto w-full">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Bienvenue</h2>
              <p className="text-slate-500 mb-10">Entrez vos accès pour continuer.</p>

              <form onSubmit={handleLogin} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-4 w-5 h-5 text-brand-pastel" />
                       <input 
                         type="email" 
                         required
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         className="w-full bg-surface-50 border border-slate-100 focus:bg-white focus:border-brand-pastel focus:ring-4 focus:ring-brand-pastel/20 rounded-2xl py-4 pl-12 pr-4 font-medium outline-none transition-all text-slate-800 placeholder:text-slate-400"
                         placeholder="nom@ecole.com"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mot de passe</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-4 w-5 h-5 text-brand-pastel" />
                       <input 
                         type={showPassword ? "text" : "password"} 
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         className="w-full bg-surface-50 border border-slate-100 focus:bg-white focus:border-brand-pastel focus:ring-4 focus:ring-brand-pastel/20 rounded-2xl py-4 pl-12 pr-12 font-medium outline-none transition-all text-slate-800 placeholder:text-slate-400"
                         placeholder="••••••••"
                       />
                       <button 
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-4 top-4 text-slate-400 hover:text-brand-pastel transition"
                         title={showPassword ? "Masquer" : "Afficher"}
                       >
                         {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                       </button>
                    </div>
                 </div>

                 <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-sm font-bold text-brand-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                 </div>

                 {error && (
                   <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
                      <ShieldCheck className="w-5 h-5" /> {error}
                   </div>
                 )}

                 <button 
                   type="submit"
                   disabled={isLoading}
                   className="w-full btn-primary font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                 >
                   {isLoading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight className="w-5 h-5" /></>}
                 </button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};
