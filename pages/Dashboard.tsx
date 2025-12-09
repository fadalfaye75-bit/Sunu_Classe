import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Video, AlertCircle, TrendingUp, ArrowRight, PieChart as PieChartIcon, BarChart3, Users, Zap } from 'lucide-react';
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
  
  const nextExams = exams
    .filter(e => new Date(e.date) >= new Date(today.setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const urgentAnnouncements = announcements.filter(a => a.urgency === 'URGENT');
  const activePolls = polls.filter(p => p.active);

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
  // Modern Blue Palette for Charts
  const PIE_COLORS = ['#0EA5E9', '#E2E8F0']; // Sky-500, Slate-200

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
      <header className="mb-8 flex items-center gap-5">
        <UserAvatar user={user} size="xl" className="border-4 border-white shadow-lg hidden md:flex" />
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Bonjour, <span className="text-sky-600">{user?.name}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg font-medium">
            {isResponsibleOrAdmin 
              ? "Voici l'état actuel de votre classe et le suivi pédagogique."
              : "Prêt pour une nouvelle journée d'apprentissage ?"}
          </p>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-start justify-between group hover:border-sky-500 transition-all duration-300">
          <div>
            <p className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-1 tracking-wide">Examens à venir</p>
            <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{nextExams.length}</h3>
          </div>
          <div className="bg-sky-50 dark:bg-sky-900/30 p-3.5 rounded-xl text-sky-600 border border-sky-100 dark:border-sky-800 group-hover:bg-sky-600 group-hover:text-white transition">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-start justify-between group hover:border-indigo-500 transition-all duration-300">
          <div>
            <p className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-1 tracking-wide">Sondages Actifs</p>
            <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{activePolls.length}</h3>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3.5 rounded-xl text-indigo-600 border border-indigo-100 dark:border-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-start justify-between group hover:border-red-500 transition-all duration-300">
          <div>
            <p className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-1 tracking-wide">Urgences</p>
            <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{urgentAnnouncements.length}</h3>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-3.5 rounded-xl text-red-600 border border-red-100 dark:border-red-800 group-hover:bg-red-600 group-hover:text-white transition">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION ANALYTICS */}
      {isResponsibleOrAdmin && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8">
             <div className="bg-sky-600 p-1.5 rounded-lg text-white">
               <BarChart3 className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white">Statistiques de Participation</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
             {/* Card Participation */}
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-xl text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div>
                     <h3 className="text-lg font-bold flex items-center gap-2">
                       <PieChartIcon className="w-5 h-5 text-sky-400" /> Engagement
                     </h3>
                     <p className="text-xs text-slate-300">Taux de réponse aux sondages</p>
                  </div>
                  <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2 border border-white/10">
                     <Users className="w-3 h-3 text-sky-300" /> {classStudentCount} Étudiants
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
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#38BDF8' : '#334155'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                         <span className="text-2xl font-black text-white">{participationRate}%</span>
                      </div>
                   </div>
                   <div className="flex-1 w-full space-y-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">Votes Totaux</span>
                            <span className="text-lg font-bold text-white">{totalVotesCast}</span>
                         </div>
                         <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(participationRate, 100)}%` }}></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Card Charge de Travail */}
             <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <div>
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-indigo-500" /> Répartition DS
                     </h3>
                     <p className="text-xs text-slate-500">Examens par matière</p>
                  </div>
                </div>
                <div className="p-6 flex-1 min-h-[250px]">
                   {barData.length > 0 ? (
                     <div className="h-full w-full min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 12, fontWeight: 600, fill: '#475569'}} />
                           <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#1E293B'}} />
                           <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} barSize={20}>
                              {barData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0EA5E9' : '#38BDF8'} />
                              ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                         <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                         <span className="font-medium text-sm">Pas assez de données</span>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Exams Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white">Prochains Examens</h3>
             <button onClick={() => onNavigate('ds')} className="text-sm text-sky-600 dark:text-sky-400 font-semibold hover:underline">Voir tout</button>
          </div>
          <div className="p-6">
            {nextExams.length > 0 ? (
              <div className="space-y-4">
                {nextExams.map(exam => {
                  const isCurrentWeek = isSameWeek(new Date(exam.date), new Date(), { weekStartsOn: 1 });
                  return (
                    <div 
                      key={exam.id} 
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                        isCurrentWeek 
                          ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-100 dark:border-sky-800'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-sky-200'
                      }`}
                    >
                      <div className={`
                        p-3 rounded-xl text-center min-w-[4rem]
                        ${isCurrentWeek ? 'bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-800 text-sky-600' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500'}
                      `}>
                        <div className="text-xs font-bold uppercase">{format(new Date(exam.date), 'MMM', { locale: fr })}</div>
                        <div className="text-2xl font-black">{new Date(exam.date).getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight">{exam.subject}</h4>
                          {isCurrentWeek && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                              Cette semaine
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                           {format(new Date(exam.date), 'EEEE HH:mm', { locale: fr })} • {exam.room}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Aucun examen à venir.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Polls Summary */}
        <div className="space-y-8">
           {/* Admin Quick Action */}
           {user?.role === Role.RESPONSIBLE && (
             <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-8 rounded-3xl shadow-lg text-white">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-300"/> Actions Rapides</h3>
                <p className="text-sky-100 mb-6 text-sm">Gérez votre classe efficacement.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onNavigate('infos')} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold transition backdrop-blur-md border border-white/20 shadow-sm text-sm">
                    Publier Annonce
                  </button>
                  <button onClick={() => onNavigate('ds')} className="bg-white text-sky-700 px-5 py-2.5 rounded-xl font-bold hover:bg-sky-50 transition shadow-sm text-sm">
                    Ajouter DS
                  </button>
                </div>
             </div>
           )}

           {/* Active Polls Snippet */}
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sondages en cours</h3>
                <button onClick={() => onNavigate('polls')} className="text-sky-600 dark:text-sky-400 hover:bg-sky-50 p-2 rounded-full transition">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {activePolls.slice(0, 3).map(poll => (
                  <div key={poll.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition cursor-pointer group" onClick={() => onNavigate('polls')}>
                    <p className="font-semibold text-slate-800 dark:text-white">{poll.question}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 font-medium">{poll.options.reduce((a, b) => a + b.voterIds.length, 0)} votes</span>
                      {poll.options.some(opt => opt.voterIds.includes(user?.id || '')) 
                        ? <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">✓ Voté</span> 
                        : <span className="text-sky-600 font-medium group-hover:underline">Voter</span>}
                    </div>
                  </div>
                ))}
                {activePolls.length === 0 && <p className="text-slate-400 italic py-4 text-center text-sm">Aucun sondage actif.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};