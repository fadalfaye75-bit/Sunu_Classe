import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Video, AlertCircle, TrendingUp, ArrowRight, PieChart as PieChartIcon, BarChart3, Users } from 'lucide-react';
import { Role } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { format, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, users, exams, announcements, polls } = useApp();

  const today = new Date();
  
  // LOGIQUE EXAMENS : Les 3 prochains à venir
  const nextExams = exams
    .filter(e => new Date(e.date) >= new Date(today.setHours(0,0,0,0))) // Examens futurs ou aujourd'hui
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Tri chronologique
    .slice(0, 3); // Garder les 3 premiers

  const urgentAnnouncements = announcements.filter(a => a.urgency === 'URGENT');
  const activePolls = polls.filter(p => p.active);

  // --- STATISTIQUES LOGIC (Pour Responsable/Admin) ---
  
  // 1. Calcul Participation Sondages
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
    { name: 'Votes reçus', value: participationRate },
    { name: 'Abstentions', value: Math.max(0, 100 - participationRate) },
  ];
  const PIE_COLORS = ['#EA580C', '#FED7AA']; // Orange theme

  // 2. Calcul Répartition Examens par Matière
  const examsBySubject = exams.reduce((acc, exam) => {
    acc[exam.subject] = (acc[exam.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(examsBySubject).map(subject => ({
    name: subject.length > 15 ? subject.substring(0, 15) + '...' : subject,
    count: examsBySubject[subject]
  })).slice(0, 5);

  const isResponsibleOrAdmin = user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;

  return (
    <div className="space-y-8 pb-10">
      <header className="mb-8 flex items-center gap-4">
        <UserAvatar user={user} size="xl" className="border-4 border-white dark:border-[#2D1B0E] shadow-md hidden md:flex" />
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] tracking-tight flex items-center gap-2">
            Dalal-jamm, <span className="text-[#EA580C]">{user?.name}</span>
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 text-base md:text-lg font-medium">
            {isResponsibleOrAdmin 
              ? "Voici l'état actuel de votre classe et le suivi pédagogique."
              : "Voici ce qui se passe dans votre classe aujourd'hui."}
          </p>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#2D1B0E] p-5 md:p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] dark:shadow-[0_6px_0_#431407] border-2 border-[#D6C0B0] dark:border-[#431407] flex items-start justify-between group hover:border-[#EA580C] transition">
          <div>
            <p className="text-xs md:text-sm font-black text-[#8D6E63] dark:text-[#A1887F] mb-1 uppercase tracking-wide">Prochains Examens</p>
            <h3 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{nextExams.length}</h3>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 md:p-4 rounded-xl text-orange-600 border-2 border-orange-200 dark:border-orange-800/50 group-hover:bg-orange-600 group-hover:text-white transition">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#2D1B0E] p-5 md:p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] dark:shadow-[0_6px_0_#431407] border-2 border-[#D6C0B0] dark:border-[#431407] flex items-start justify-between group hover:border-indigo-500 transition">
          <div>
            <p className="text-xs md:text-sm font-black text-[#8D6E63] dark:text-[#A1887F] mb-1 uppercase tracking-wide">Sondages Actifs</p>
            <h3 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{activePolls.length}</h3>
          </div>
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 md:p-4 rounded-xl text-indigo-600 border-2 border-indigo-200 dark:border-indigo-800/50 group-hover:bg-indigo-600 group-hover:text-white transition">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#2D1B0E] p-5 md:p-6 rounded-2xl shadow-[0_6px_0_#D6C0B0] dark:shadow-[0_6px_0_#431407] border-2 border-[#D6C0B0] dark:border-[#431407] flex items-start justify-between group hover:border-red-500 transition">
          <div>
            <p className="text-xs md:text-sm font-black text-[#8D6E63] dark:text-[#A1887F] mb-1 uppercase tracking-wide">Urgences</p>
            <h3 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{urgentAnnouncements.length}</h3>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 p-3 md:p-4 rounded-xl text-red-600 border-2 border-red-200 dark:border-red-800/50 group-hover:bg-red-600 group-hover:text-white transition">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      {/* SECTION ANALYTICS (VISIBLE SEULEMENT PAR RESPONSABLE/ADMIN) */}
      {isResponsibleOrAdmin && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8">
             <div className="bg-[#2D1B0E] dark:bg-[#431407] p-2 rounded-lg text-orange-400">
               <BarChart3 className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-black text-[#2D1B0E] dark:text-[#fcece4] uppercase tracking-wide">Statistiques de Participation</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
             {/* Card Participation */}
             <div className="bg-[#2D1B0E] dark:bg-[#1a100a] rounded-3xl shadow-xl border-4 border-[#431407] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div>
                     <h3 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                       <PieChartIcon className="w-5 h-5 text-orange-400" /> Engagement Classe
                     </h3>
                     <p className="text-xs text-orange-200/60 font-medium">Basé sur les votes aux sondages</p>
                  </div>
                  <div className="bg-orange-500/20 px-3 py-1 rounded-lg border border-orange-500/30 text-orange-300 font-bold text-xs flex items-center gap-2">
                     <Users className="w-3 h-3" /> {classStudentCount} Étudiants
                  </div>
                </div>
                <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="relative w-40 h-40 shrink-0">
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
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                         <span className="text-2xl font-black text-white">{participationRate}%</span>
                         <span className="text-[10px] text-orange-200/50 uppercase font-bold">Actifs</span>
                      </div>
                   </div>
                   <div className="flex-1 w-full space-y-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-orange-100">Activité Totale</span>
                            <span className="text-lg font-black text-white">{totalVotesCast} votes</span>
                         </div>
                         <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(participationRate, 100)}%` }}></div>
                         </div>
                      </div>
                      <div className="text-xs text-orange-200/70 font-medium bg-orange-950/30 p-3 rounded-lg border border-orange-900/50">
                         💡 Astuce : Lancez des sondages réguliers pour maintenir l'engagement des étudiants élevé.
                      </div>
                   </div>
                </div>
             </div>

             {/* Card Charge de Travail */}
             <div className="bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden flex flex-col">
                <div className="p-6 border-b-2 border-[#D6C0B0] dark:border-[#431407] flex justify-between items-center bg-[#FFF8F0] dark:bg-[#1a100a]">
                  <div>
                     <h3 className="text-lg font-black text-[#2D1B0E] dark:text-[#fcece4] uppercase tracking-wide flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-indigo-600" /> Charge Examens
                     </h3>
                     <p className="text-xs text-[#8D6E63] dark:text-[#A1887F] font-medium">Volume d'évaluations par matière</p>
                  </div>
                </div>
                <div className="p-6 flex-1 min-h-[250px]">
                   {barData.length > 0 ? (
                     <div className="h-full w-full min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fontWeight: 700, fill: '#4B3621'}} />
                           <Tooltip cursor={{fill: '#FFF8F0'}} contentStyle={{borderRadius: '8px', border: '2px solid #D6C0B0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#2D1B0E', color: 'white', fontWeight: 'bold'}} />
                           <Bar dataKey="count" fill="#EA580C" radius={[0, 4, 4, 0]} barSize={24}>
                              {barData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#EA580C' : '#F97316'} />
                              ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-[#8D6E63] opacity-50">
                         <BarChart3 className="w-12 h-12 mb-2" />
                         <span className="font-bold text-sm">Pas assez de données pour le graphique</span>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Exams Card - Liste des 3 prochains */}
        <div className="bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden">
          <div className="p-6 border-b-2 border-[#D6C0B0] dark:border-[#431407] flex justify-between items-center bg-[#FFF8F0] dark:bg-[#1a100a]">
             <h3 className="text-xl font-black text-[#2D1B0E] dark:text-[#fcece4] uppercase tracking-wide">3 Prochains DS</h3>
             <button onClick={() => onNavigate('ds')} className="text-sm text-indigo-700 dark:text-indigo-400 font-bold hover:underline">Calendrier complet</button>
          </div>
          <div className="p-6">
            {nextExams.length > 0 ? (
              <div className="space-y-4">
                {nextExams.map(exam => {
                  // Vérifier si c'est cette semaine
                  const isCurrentWeek = isSameWeek(new Date(exam.date), new Date(), { weekStartsOn: 1 });
                  
                  return (
                    <div 
                      key={exam.id} 
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-colors ${
                        isCurrentWeek 
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' // Highlight This Week
                          : 'bg-white dark:bg-[#2D1B0E] border-slate-100 dark:border-slate-800 hover:border-orange-100 dark:hover:border-orange-900/50'
                      }`}
                    >
                      <div className={`
                        p-3 rounded-xl text-center min-w-[4rem] shadow-sm border
                        ${isCurrentWeek ? 'bg-white dark:bg-[#2D1B0E] border-orange-100 dark:border-orange-800 text-[#EA580C]' : 'bg-[#FFF8F0] dark:bg-[#1a100a] border-[#D6C0B0] dark:border-[#431407] text-[#8D6E63] dark:text-[#A1887F]'}
                      `}>
                        <div className="text-xs font-black uppercase">{format(new Date(exam.date), 'MMM', { locale: fr })}</div>
                        <div className="text-2xl font-black">{new Date(exam.date).getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-[#2D1B0E] dark:text-[#fcece4] text-lg leading-tight line-clamp-1">{exam.subject}</h4>
                          {isCurrentWeek && (
                            <span className="text-[10px] uppercase font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 ml-2 whitespace-nowrap shrink-0">
                              Cette semaine
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#5D4037] dark:text-[#D6C0B0] font-medium mt-1 flex items-center gap-2">
                           <span>{format(new Date(exam.date), 'EEEE HH:mm', { locale: fr })}</span>
                           <span className="w-1 h-1 rounded-full bg-[#D6C0B0] dark:bg-[#5D4037]"></span>
                           <span className="truncate">{exam.room}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-10 text-[#2D1B0E] dark:text-white" />
                <p className="font-bold text-[#8D6E63] dark:text-[#A1887F]">Aucun examen à venir.</p>
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
           <div className="bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-[#2D1B0E] dark:text-[#fcece4] uppercase tracking-wide">Sondages Actifs</h3>
                <button onClick={() => onNavigate('polls')} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-full border border-transparent hover:border-indigo-100 transition">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {activePolls.slice(0, 3).map(poll => (
                  <div key={poll.id} className="p-4 border-2 border-[#EFEBE9] dark:border-[#431407] rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition cursor-pointer" onClick={() => onNavigate('polls')}>
                    <p className="font-bold text-[#2D1B0E] dark:text-[#fcece4] text-lg">{poll.question}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="bg-[#FFF8F0] dark:bg-[#1a100a] px-3 py-1.5 rounded-lg border border-[#D6C0B0] dark:border-[#5D4037] font-bold text-[#5D4037] dark:text-[#A1887F]">{poll.options.reduce((a, b) => a + b.voterIds.length, 0)} votes</span>
                      {poll.options.some(opt => opt.voterIds.includes(user?.id || '')) ? <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ Voté</span> : <span className="text-[#EA580C] font-bold">Voter maintenant</span>}
                    </div>
                  </div>
                ))}
                {activePolls.length === 0 && <p className="text-[#8D6E63] dark:text-[#A1887F] italic py-4 text-center font-medium">Aucun sondage actif pour le moment.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};