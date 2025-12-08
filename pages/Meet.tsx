
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, MeetSession } from '../types';
import { Video, Plus, Trash2, ExternalLink, AlertCircle, Pencil, User, BellRing, X, Send } from 'lucide-react';
import { format, isBefore, addMinutes, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Meet: React.FC = () => {
  const { user, meets, addMeet, updateMeet, deleteMeet, shareResource } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [link, setLink] = useState('');
  const [date, setDate] = useState('');

  // Notification Target State
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  // Permissions Check: Strictly RESPONSIBLE can manage. Admin observes. Student reads.
  const canManage = user?.role === Role.RESPONSIBLE;

  const openCreate = () => {
    setEditingId(null);
    setSubject('');
    setTeacher(user?.name || '');
    setLink('');
    setDate('');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const openEdit = (item: MeetSession) => {
    setEditingId(item.id);
    setSubject(item.subject);
    setTeacher(item.teacherName);
    setLink(item.link);
    setDate(new Date(item.date).toISOString().slice(0, 16));
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      subject,
      teacherName: teacher,
      link,
      date: new Date(date).toISOString(),
    };

    if (editingId) {
      updateMeet(editingId, payload);
    } else {
      addMeet(payload, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const toggleTargetRole = (role: Role) => {
    setTargetRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const sortedMeets = [...meets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] flex items-center gap-3 tracking-tight">
            <span className="bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-300 dark:border-emerald-700 p-2 rounded-xl shadow-[4px_4px_0_#10B981]"><Video className="text-emerald-700 dark:text-emerald-300 w-6 h-6 md:w-8 md:h-8" /></span>
            Visio & Meet
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 font-bold text-base md:text-lg">Accès direct aux cours en ligne.</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wide">
            <Plus className="w-5 h-5"/> <span>Nouveau Meet</span>
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {sortedMeets.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#2D1B0E] rounded-3xl border-4 border-dashed border-[#D6C0B0] dark:border-[#431407]">
             <Video className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E] dark:text-white" />
             <p className="font-bold text-xl text-[#8D6E63] dark:text-[#A1887F]">Aucun cours vidéo programmé.</p>
          </div>
        )}
        {sortedMeets.map((meet) => {
           const meetDate = new Date(meet.date);
           const now = new Date();
           
           const isSoon = isAfter(meetDate, now) && isBefore(meetDate, addMinutes(now, 60));
           const isLive = isBefore(meetDate, now) && isBefore(now, addMinutes(meetDate, 60));

           return (
            <div key={meet.id} className={`bg-white dark:bg-[#2D1B0E] rounded-2xl border-2 p-5 md:p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:-translate-y-1 transition group ${isLive || isSoon ? 'border-emerald-400 dark:border-emerald-700 shadow-md ring-1 ring-emerald-100 dark:ring-emerald-900' : 'border-[#D6C0B0] dark:border-[#431407]'}`}>
               
               {/* Date & Time */}
               <div className="w-full md:w-auto flex justify-between md:block items-center border-b-2 md:border-b-0 pb-4 md:pb-0 border-[#D6C0B0] dark:border-[#431407] mb-2 md:mb-0 md:min-w-[100px]">
                 <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-[#8D6E63] dark:text-[#A1887F] uppercase tracking-wide">{format(meetDate, 'MMM', { locale: fr })}</span>
                    <span className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{format(meetDate, 'd')}</span>
                    <span className={`text-xs md:text-sm font-bold text-white px-3 py-1 rounded-full mt-2 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-[#2D1B0E] dark:bg-[#431407]'}`}>
                      {format(meetDate, 'HH:mm')}
                    </span>
                 </div>
                 
                 {(isSoon || isLive) && (
                    <div className="md:hidden inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-black animate-pulse border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-3 h-3" />
                        {isLive ? 'EN DIRECT' : 'Bientôt'}
                    </div>
                 )}
               </div>
               
               {/* Details */}
               <div className="flex-1 w-full text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4] mb-2 leading-tight">{meet.subject}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-[#5D4037] dark:text-[#D6C0B0] font-bold text-sm">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 
                    {meet.teacherName}
                  </div>
                  
                  {(isSoon || isLive) && (
                     <div className="hidden md:inline-flex mt-4 items-center gap-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-2 rounded-lg text-xs font-black animate-pulse uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4" />
                        {isLive ? 'SESSION EN COURS' : 'DÉMARRE DANS MOINS D\'UNE HEURE'}
                     </div>
                  )}
               </div>

               {/* Actions */}
               <div className="flex flex-col w-full md:w-auto gap-3">
                 <a 
                   href={meet.link} 
                   target="_blank" 
                   rel="noreferrer" 
                   className={`w-full md:w-auto text-white px-6 py-4 rounded-xl font-black transition flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none uppercase tracking-wide
                     ${isLive || isSoon ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_0_#047857]' : 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 shadow-[0_4px_0_#334155] dark:shadow-[0_4px_0_#1e293b]'}
                   `}
                 >
                   <span>Rejoindre</span> <ExternalLink className="w-5 h-5" />
                 </a>
                 {canManage && (
                   <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => shareResource('MEET', meet)}
                        className="flex-1 p-3 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl flex justify-center items-center transition border-2 border-emerald-100 dark:border-emerald-800 active:scale-95"
                        title="Envoyer par mail"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openEdit(meet)}
                        className="flex-1 p-3 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl flex justify-center items-center transition border-2 border-indigo-100 dark:border-indigo-800 active:scale-95"
                        title="Modifier"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteMeet(meet.id)}
                        className="flex-1 p-3 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl flex justify-center items-center transition border-2 border-red-100 dark:border-red-800 active:scale-95"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                 )}
               </div>
            </div>
           );
        })}
      </div>

      {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="font-black text-lg md:text-xl uppercase tracking-wide">
                {editingId ? 'Modifier la session' : 'Programmer un Meet'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Matière</label>
                    <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Enseignant</label>
                    <input required type="text" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Date & Heure</label>
                    <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-emerald-500 outline-none transition font-bold" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Lien Google Meet</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input required type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl pl-12 p-4 text-base focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-emerald-700 dark:text-emerald-400" placeholder="https://meet.google.com/..." />
                    </div>
                 </div>
                 
                 <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 shadow-[0_4px_0_#047857] hover:shadow-[0_2px_0_#047857] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
                      {editingId ? 'Sauvegarder' : 'Ajouter'}
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