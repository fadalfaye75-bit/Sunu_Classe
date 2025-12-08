
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Poll } from '../types';
import { Vote, Trash2, Plus, BarChart2, CheckCircle, Eye, EyeOff, Pencil, X, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Polls: React.FC = () => {
  const { user, polls, addPoll, updatePoll, votePoll, deletePoll, shareResource } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Creation State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [optionsStr, setOptionsStr] = useState(''); // Comma separated for simplicity
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Permissions Check: Strictly RESPONSIBLE can manage. Admin observes. Student reads.
  const canManage = user?.role === Role.RESPONSIBLE;

  const openCreate = () => {
    setEditingId(null);
    setQuestion('');
    setOptionsStr('');
    setIsAnonymous(false);
    setIsModalOpen(true);
  };

  const openEdit = (poll: Poll) => {
    setEditingId(poll.id);
    setQuestion(poll.question);
    setOptionsStr(poll.options.map(o => o.label).join(', '));
    setIsAnonymous(poll.isAnonymous);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const optionsList = optionsStr.split(',').map(s => ({
      id: Math.random().toString(36).substr(2, 5),
      label: s.trim(),
      voterIds: []
    })).filter(o => o.label.length > 0);

    if (editingId) {
       updatePoll(editingId, {
         question,
         isAnonymous,
         // Note: Editing options resets votes in this implementation for simplicity
         options: optionsList 
       });
    } else {
        addPoll({
          question,
          type: 'SINGLE',
          options: optionsList,
          active: true,
          isAnonymous
        });
    }
    setIsModalOpen(false);
  };

  const COLORS = ['#EA580C', '#4F46E5', '#D97706', '#DC2626', '#059669'];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] flex items-center gap-3 tracking-tight">
            <span className="bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700 p-2 rounded-xl shadow-[4px_4px_0_#9333EA]"><Vote className="text-purple-700 dark:text-purple-300 w-6 h-6 md:w-8 md:h-8" /></span>
            Sondages
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 font-bold text-base md:text-lg">La voix de la classe compte.</p>
        </div>
        {canManage && (
          <button 
            onClick={openCreate}
            className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition shadow-orange-200 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wide"
          >
            <Plus className="w-5 h-5"/> <span>Nouveau Sondage</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {polls.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#2D1B0E] rounded-3xl border-4 border-dashed border-[#D6C0B0] dark:border-[#431407]">
             <Vote className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E] dark:text-white" />
             <p className="font-bold text-xl text-[#8D6E63] dark:text-[#A1887F]">Aucun sondage actif.</p>
          </div>
        )}
        {polls.map(poll => {
          const totalVotes = poll.options.reduce((acc, curr) => acc + curr.voterIds.length, 0);
          
          // Check if user has voted in ANY option of this poll
          const userVotedOptionId = poll.options.find(opt => opt.voterIds.includes(user?.id || ''))?.id;
          const hasVoted = !!userVotedOptionId;
          const canViewResults = hasVoted || user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;

          // Prepare data for chart
          const chartData = poll.options.map(o => ({ ...o, votes: o.voterIds.length }));

          return (
            <div key={poll.id} className="bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] p-5 md:p-8 hover:border-purple-300 dark:hover:border-purple-700 transition group">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 gap-4">
                <div className="flex-1 w-full">
                   <h3 className="text-xl md:text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4] leading-tight">{poll.question}</h3>
                   <div className="flex items-center gap-3 mt-3 md:mt-4">
                      {poll.isAnonymous ? (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded uppercase font-black border border-slate-200 dark:border-slate-700 tracking-wider flex items-center gap-2">
                           <EyeOff className="w-3 h-3" /> Anonyme
                        </span>
                      ) : (
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded uppercase font-black border border-indigo-100 dark:border-indigo-800 tracking-wider flex items-center gap-2">
                           <Eye className="w-3 h-3" /> Public
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#8D6E63] dark:text-[#A1887F]">• {totalVotes} votes</span>
                   </div>
                </div>
                {canManage && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => shareResource('POLL', poll)} 
                      className="flex-1 md:flex-none justify-center text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 p-3 rounded-xl transition border border-emerald-100 dark:border-emerald-800 active:scale-95"
                      title="Envoyer par mail"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    <button onClick={() => openEdit(poll)} className="flex-1 md:flex-none justify-center text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 p-3 rounded-xl transition border border-indigo-100 dark:border-indigo-800 active:scale-95">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => deletePoll(poll.id)} className="flex-1 md:flex-none justify-center text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 p-3 rounded-xl transition border border-red-100 dark:border-red-800 active:scale-95">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                {/* Voting Section */}
                <div className="space-y-3 md:space-y-4">
                  {poll.options.map((opt) => {
                    const isSelected = opt.id === userVotedOptionId;
                    const voteCount = opt.voterIds.length;
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={() => votePoll(poll.id, opt.id)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                          isSelected 
                            ? 'cursor-default border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 shadow-inner' 
                            : 'hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 border-[#EFEBE9] dark:border-[#431407] text-[#2D1B0E] dark:text-[#fcece4] active:scale-98 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-center z-10 relative">
                          <span className={`font-bold text-base md:text-lg ${isSelected ? 'flex items-center gap-2' : ''}`}>
                             {isSelected && <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                             {opt.label}
                          </span>
                          {canViewResults && (voteCount > 0) && (
                             <span className="text-xs font-black bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 px-2 py-1 rounded">{Math.round((voteCount / totalVotes) * 100)}%</span>
                          )}
                        </div>
                        {/* Progress bar background */}
                        {canViewResults && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-purple-200/50 dark:bg-purple-900/30 z-0 transition-all duration-700 ease-out opacity-50" 
                            style={{ width: `${(voteCount / totalVotes) * 100}%` }}
                          />
                        )}
                      </button>
                    );
                  })}
                  
                  {hasVoted && (
                    <p className="text-center text-xs text-purple-600 dark:text-purple-400 font-bold mt-2 animate-pulse">
                       Vous pouvez changer votre choix en cliquant sur une autre option.
                    </p>
                  )}
                </div>

                {/* Results Section */}
                <div className="min-h-[220px] flex flex-col justify-center items-center bg-[#FFF8F0] dark:bg-[#1a100a] rounded-2xl border-2 border-[#EFEBE9] dark:border-[#431407] p-4 md:p-6">
                  {!canViewResults ? (
                     <div className="text-center text-[#8D6E63] dark:text-[#A1887F]">
                       <BarChart2 className="w-16 h-16 mx-auto mb-3 opacity-20" />
                       <p className="font-bold">Votez pour voir les résultats</p>
                     </div>
                  ) : totalVotes === 0 ? (
                    <div className="text-center text-[#8D6E63] dark:text-[#A1887F]">
                       <p className="font-bold">Aucun vote pour le moment.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="label" type="category" width={100} tick={{fontSize: 12, fontWeight: 700, fill: '#4B3621'}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: '2px solid #EFEBE9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Inter'}} />
                        <Bar dataKey="votes" radius={[0, 8, 8, 0]} barSize={24}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">
                {editingId ? 'Modifier Sondage' : 'Nouveau Sondage'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Question</label>
                  <input required type="text" value={question} onChange={e => setQuestion(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-purple-500 focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                </div>
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Options (séparées par virgule)</label>
                  <textarea required value={optionsStr} onChange={e => setOptionsStr(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-purple-500 focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" placeholder="Option 1, Option 2, Option 3" rows={3}/>
                  {editingId && <p className="text-xs text-red-500 mt-2 font-bold">⚠️ Modifier les options réinitialise les votes.</p>}
                </div>
                
                <div className="flex items-center gap-3 p-3 md:p-4 bg-[#FFF8F0] dark:bg-[#1a100a] rounded-xl border-2 border-[#D6C0B0] dark:border-[#5D4037] cursor-pointer hover:border-[#A1887F] transition active:bg-orange-50 dark:active:bg-orange-900/20">
                   <input 
                     type="checkbox" 
                     id="anon"
                     checked={isAnonymous}
                     onChange={e => setIsAnonymous(e.target.checked)}
                     className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                   />
                   <label htmlFor="anon" className="text-sm text-[#5D4037] dark:text-[#D6C0B0] flex items-center gap-2 cursor-pointer font-bold select-none uppercase tracking-wide flex-1">
                      <EyeOff className="w-4 h-4 text-[#8D6E63] dark:text-[#A1887F]" /> Vote Anonyme
                   </label>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                    Annuler
                  </button>
                  <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
                    {editingId ? 'Mettre à jour' : 'Lancer le vote'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};