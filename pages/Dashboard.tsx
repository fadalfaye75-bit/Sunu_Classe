
import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Video, AlertCircle, TrendingUp, ArrowRight, PieChart as PieChartIcon, BarChart3, Users } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Role } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, users, exams, announcements, polls } = useApp();

  const today = new Date();
  const upcomingExams = exams.filter(e => {
    const d = new Date(e.date);
    const diff = differenceInDays(d, today);
    return diff >= 0 && diff <= 7;
  });

  const urgentAnnouncements = announcements.filter(a => a.urgency === 'URGENT');
  const activePolls = polls.filter(p => p.active);

  // --- STATISTIQUES LOGIC ---
  
  // 1. Calcul Participation Sondages
  // On considère le nombre d'étudiants dans la classe actuelle
  const classStudentCount = users.filter(u => u.classId === user?.classId && u.role === Role.STUDENT).length || 1;
  const totalPolls = polls.length;
  
  let participationRate = 0;
  let totalVotesCast = 0;

  if (totalPolls > 0) {
    totalVotesCast = polls.reduce((acc, poll) => {
      const votesInPoll = poll.options.reduce((optAcc, opt) => optAcc + opt.voterIds.length, 0);
      return acc + votesInPoll;
    }, 0);
    const maxPossibleVotes = totalPolls * classStudentCount;
    participationRate = Math.round((totalVotesCast / maxPossibleVotes) * 100);
  }

  const pieData = [
    { name: 'Participations', value: participationRate },
    { name: 'Non-participants', value: 100 - participationRate },
  ];
  const PIE_COLORS = ['#4F46E5', '#E0E7FF']; // Indigo vs Light Indigo

  // 2. Calcul Répartition Examens par Matière
  const examsBySubject = exams.reduce((acc, exam) => {
    acc[exam.subject] = (acc[exam.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(examsBySubject).map(subject => ({
    name: subject.length > 10 ? subject.substring(0, 10) + '...' : subject,
    count: examsBySubject[subject]
  })).slice(0, 5); // Top 5 subjects

  const isResponsibleOrAdmin = user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;

  return (
    <div className="space-y-8 pb-10">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-[#2D1B0E] tracking-tight">Dalal-jamm, {user?.name}</h1>
        <p className="text-[#5D4037] mt-2 text-lg font-medium">Voici ce qui se passe dans votre classe aujourd'hui.</p>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] border-2 border-[#D6C0B0] flex items-start justify-between group hover:border-[#EA580C] transition">
          <div>
            <p className="text-sm font-black text-[#8D6E63] mb-1 uppercase tracking-wide">Examens (7j)</p>
            <h3 className="text-4xl font-black text-[#2D1B0E]">{upcomingExams.length}</h3>
          </div>
          <div className="bg-orange-100 p-4 rounded-xl text-orange-600 border-2 border-orange-200 group-hover:bg-orange-600 group-hover:text-white transition">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] border-2 border-[#D6C0B0] flex items-start justify-between group hover:border-indigo-500 transition">
          <div>
            <p className="text-sm font-black text-[#8D6E63] mb-1 uppercase tracking-wide">Sondages Actifs</p>
            <h3 className="text-4xl font-black text-[#2D1B0E]">{activePolls.length}</h3>
          </div>
          <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600 border-2 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] border-2 border-[#D6C0B0] flex items-start justify-between group hover:border-red-500 transition">
          <div>
            <p className="text-sm font-black text-[#8D6E63] mb-1 uppercase tracking-wide">Urgences</p>
            <h3 className="text-4xl font-black text-[#2D1B0E]">{urgentAnnouncements.length}</h3>
          </div>
          <div className="bg-red-100 p-4 rounded-xl text-red-600 border-2 border-red-200 group-hover:bg-red-600 group-hover:text-white transition">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION ANALYTICS (VISIBLE SEULEMENT PAR RESPONSABLE/ADMIN) */}
      {isResponsibleOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Card Participation */}
           <div className="bg-[#2D1B0E] rounded-3xl shadow-[0_10px_20px_rgba(45,27,14,0.3)] border-4 border-[#431407] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                   <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                     <PieChartIcon className="w-5 h-5 text-orange-400" /> Participation
                   </h3>
                   <p className="text-xs text-orange-200/60 font-medium">Taux de réponse aux sondages</p>
                </div>
                <div className="bg-orange-500/20 px-3 py-1 rounded-lg border border-orange-500/30 text-orange-300 font-bold text-xs">
                   {classStudentCount} Étudiants
                </div>
              </div>
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="relative w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                       <span className="text-2xl font-black text-white">{participationRate}%</span>
                    </div>
                 </div>
                 <div className="flex-1 space-y-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-orange-100">Votes Totaux</span>
                          <span className="text-lg font-black text-white">{totalVotesCast}</span>
                       </div>
                       <div className="w-full bg-white/10 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(participationRate, 100)}%` }}></div>
                       </div>
                    </div>
                    <p className="text-xs text-orange-200/70 italic leading-relaxed">
                       Un taux supérieur à 70% indique une excellente dynamique de classe.
                    </p>
                 </div>
              </div>
           </div>

           {/* Card Charge de Travail */}
           <div className="bg-white rounded-3xl shadow-sm border-2 border-[#D6C0B0] overflow-hidden">
              <div className="p-6 border-b-2 border-[#D6C0B0] flex justify-between items-center bg-[#FFF8F0]">
                <div>
                   <h3 className="text-xl font-black text-[#2D1B0E] uppercase tracking-wide flex items-center gap-2">
                     <BarChart3 className="w-5 h-5 text-indigo-600" /> Charge Examen
                   </h3>
                   <p className="text-xs text-[#8D6E63] font-medium">Répartition par matière</p>
                </div>
              </div>
              <div className="p-6">
                 {barData.length > 0 ? (
                   <div className="h-48 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 700, fill: '#4B3621'}} />
                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#2D1B0E', color: 'white'}} />
                         <Bar dataKey="count" fill="#EA580C" radius={[0, 4, 4, 0]} barSize={20} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-[#8D6E63] opacity-50">
                       <BarChart3 className="w-12 h-12 mb-2" />
                       <span className="font-bold text-sm">Pas assez de données</span>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Exams Card */}
        <div className="bg-white rounded-3xl shadow-sm border-2 border-[#D6C0B0] overflow-hidden">
          <div className="p-6 border-b-2 border-[#D6C0B0] flex justify-between items-center bg-[#FFF8F0]">
             <h3 className="text-xl font-black text-[#2D1B0E] uppercase tracking-wide">Calendrier des DS</h3>
             <button onClick={() => onNavigate('ds')} className="text-sm text-indigo-700 font-bold hover:underline">Voir tout</button>
          </div>
          <div className="p-6">
            {upcomingExams.length > 0 ? (
              <div className="space-y-4">
                {upcomingExams.map(exam => (
                  <div key={exam.id} className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50 border-2 border-orange-100">
                    <div className="bg-white p-3 rounded-xl text-center min-w-[4rem] shadow-sm border border-orange-100">
                      <div className="text-xs text-[#8D6E63] font-black uppercase">{new Date(exam.date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                      <div className="text-2xl font-black text-[#EA580C]">{new Date(exam.date).getDate()}</div>
                    </div>
                    <div>
                      <h4 className="font-black text-[#2D1B0E] text-lg">{exam.subject}</h4>
                      <p className="text-sm text-[#5D4037] font-medium">{new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {exam.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-10 text-[#2D1B0E]" />
                <p className="font-bold text-[#8D6E63]">Aucun examen dans les 7 prochains jours.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Polls Summary */}
        <div className="space-y-8">
           {/* Admin Quick Action */}
           {user?.role === Role.RESPONSIBLE && (
             <div className="pattern-wax p-8 rounded-3xl shadow-[0_10px_20px_rgba(49,46,129,0.3)] text-white border-4 border-[#312E81]">
                <h3 className="text-2xl font-black mb-2 tracking-tight">Contrôle Enseignant</h3>
                <p className="text-indigo-200 mb-6 font-medium">Créez rapidement des annonces ou planifiez des examens pour votre classe.</p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => onNavigate('infos')} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black hover:bg-indigo-50 transition shadow-lg uppercase text-sm tracking-wide">
                    Nouvelle Annonce
                  </button>
                  <button onClick={() => onNavigate('ds')} className="bg-[#4F46E5] text-white px-6 py-3 rounded-xl font-black hover:bg-[#4338ca] transition shadow-lg uppercase text-sm tracking-wide border-2 border-[#4338ca]">
                    Ajouter DS
                  </button>
                </div>
             </div>
           )}

           {/* Active Polls Snippet */}
           <div className="bg-white rounded-3xl shadow-sm border-2 border-[#D6C0B0] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-[#2D1B0E] uppercase tracking-wide">Sondages Actifs</h3>
                <button onClick={() => onNavigate('polls')} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full border border-transparent hover:border-indigo-100 transition">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {activePolls.slice(0, 3).map(poll => (
                  <div key={poll.id} className="p-4 border-2 border-[#EFEBE9] rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer" onClick={() => onNavigate('polls')}>
                    <p className="font-bold text-[#2D1B0E] text-lg">{poll.question}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="bg-[#FFF8F0] px-3 py-1.5 rounded-lg border border-[#D6C0B0] font-bold text-[#5D4037]">{poll.options.reduce((a, b) => a + b.voterIds.length, 0)} votes</span>
                      {poll.options.some(opt => opt.voterIds.includes(user?.id || '')) ? <span className="text-emerald-700 font-bold">✓ Voté</span> : <span className="text-[#EA580C] font-bold">Voter maintenant</span>}
                    </div>
                  </div>
                ))}
                {activePolls.length === 0 && <p className="text-[#8D6E63] italic py-4 text-center font-medium">Aucun sondage actif pour le moment.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
