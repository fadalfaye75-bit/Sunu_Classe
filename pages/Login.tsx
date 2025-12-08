
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { School, ArrowRight, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, schoolName } = useApp();
  
  // Form States
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email);
    if (!success) {
      setError("Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-screen bg-[#2D1B0E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#9A3412] pattern-bogolan opacity-30 transform -skew-y-3 origin-top-left"></div>
      <div className="absolute bottom-0 right-0 w-full h-1/2 bg-[#312E81] pattern-wax opacity-30 transform skew-y-3 origin-bottom-right"></div>

      <div className="bg-[#FFF8F0] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row relative z-10 border-4 border-[#7C2D12]">
        
        {/* Left Side - Visual */}
        <div className="md:w-5/12 pattern-bogolan p-12 flex flex-col justify-between text-white relative border-r-4 border-[#7C2D12]">
          <div className="absolute inset-0 bg-[#7C2D12]/10 backdrop-blur-[1px]"></div>
          <div className="relative z-10">
            <h1 className="text-4xl lg:text-5xl font-black flex flex-col gap-2 mb-3 text-white drop-shadow-xl tracking-tight break-words">
              <span className="flex items-center gap-3"><School className="w-12 h-12 text-[#FDBA74]" /> Portail</span>
              <span>{schoolName}</span>
            </h1>
            <p className="text-orange-100 font-bold text-lg border-l-4 border-[#FDBA74] pl-4 mt-6 leading-relaxed">
              La plateforme éducative qui connecte la communauté.
            </p>
          </div>

          <div className="z-10 space-y-4 my-12">
            <div className="bg-[#2D1B0E]/60 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg">
              <p className="font-bold text-orange-200 text-lg">🚀 Plateforme 2025</p>
              <p className="text-sm opacity-90 mt-1">Gestion simplifiée pour les étudiants et responsables.</p>
            </div>
            <div className="bg-[#2D1B0E]/60 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg">
               <p className="font-bold text-orange-200 text-lg">🌍 100% Communautaire</p>
               <p className="text-sm opacity-90 mt-1">Sondages, Meet et DS synchronisés en temps réel.</p>
            </div>
          </div>

          <div className="text-xs text-orange-200/60 z-10 font-mono uppercase tracking-widest">
            © 2025 {schoolName} Digital
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-7/12 p-8 md:p-16 bg-[#FFF8F0]">
          <div className="mb-10">
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-orange-200">Accès Membre</span>
            <h2 className="text-4xl font-black text-[#2D1B0E] mt-4 tracking-tight">Connexion</h2>
            <p className="text-[#5D4037] mt-2 font-medium">Accédez à votre espace classe sécurisé.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-[#2D1B0E] mb-2 uppercase tracking-wide">Adresse Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-[#EA580C] transition" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border-2 border-[#D6C0B0] rounded-xl pl-12 pr-4 py-4 focus:ring-0 focus:border-[#EA580C] outline-none transition font-bold text-[#2D1B0E] shadow-sm"
                  placeholder="votre.email@eco.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2D1B0E] mb-2 uppercase tracking-wide">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-[#EA580C] transition" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border-2 border-[#D6C0B0] rounded-xl pl-12 pr-4 py-4 focus:ring-0 focus:border-[#EA580C] outline-none transition font-bold text-[#2D1B0E] shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full btn-primary text-white font-black text-lg py-4 rounded-xl shadow-[0_6px_0_#9A3412] hover:shadow-[0_4px_0_#9A3412] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 group mt-6"
            >
              ACCÉDER À L'ESPACE
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </button>
            
            <div className="text-center mt-8">
               <p className="text-[#8D6E63] text-sm font-medium">Mot de passe oublié ? <a href="#" className="text-[#EA580C] font-bold hover:underline">Contacter le support</a></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
