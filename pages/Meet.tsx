import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, MeetSession } from '../types';
import { Video, Plus, Trash2, ExternalLink, AlertCircle, Pencil, User, BellRing, X } from 'lucide-react';
import { format, isBefore, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Meet: React.FC = () => {
  const { user, meets, addMeet, updateMeet, deleteMeet } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [link, setLink] = useState('');
  const [date, setDate] = useState('');

  // Notification Target State
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

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
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] flex items-center gap-3 tracking-tight">
            <span className="bg-emerald-100 border-2 border-emerald-300 p-2 rounded-xl shadow-[4px_4px_0_#10B981]"><Video className="text-emerald-700 w-6 h-6 md:w-8 md:h-8" /></span>
            Visio & Meet
          </h1>
          <p className="text-[#5D4037] mt-2 font-bold text-base md:text-lg">Accès direct aux cours en ligne.</p>
        </div>
        {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
          <button onClick={openCreate} className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wide">
            <Plus className="w-5 h-5"/> <span>Nouveau Meet</span>
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {sortedMeets.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-[#D6C0B0]">
             <Video className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E]" />
             <p className="font-bold text-xl text-[#8D6E63]">Aucun cours vidéo programmé.</p>
          </div>
        )}
        {sortedMeets.map((meet) => {
           const meetDate = new Date(meet.date);
           const now = new Date();
           const isSoon = isBefore(now, meetDate) && isBefore(addMinutes(now, 30), meetDate) === false;
           const isLive = isBefore(meetDate, now) && isBefore(now, addMinutes(meetDate, 60));

           return (
            <div key={meet.id} className="bg-white rounded-2xl border-2 border-[#D6C0B0] p-5 md:p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:-translate-y-1 transition group">
               
               {/* Date & Time */}
               <div className="w-full md:w-auto flex justify-between md:block items-center border-b-2 md:border-b-0 pb-4 md:pb-0 border-[#D6C0B0] mb-2 md:mb-0 md:min-w-[100px]">
                 <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-[#8D6E63] uppercase tracking-wide">{format(meetDate, 'MMM', { locale: fr })}</span>
                    <span className="text-3xl md:text-4xl font-black text-[#2D1B0E]">{format(meetDate, 'd')}</span>
                    <span className="text-xs md:text-sm font-bold text-white bg-[#2D1B0E] px-3 py-1 rounded-full mt-2">{format(meetDate, 'HH:mm')}</span>
                 </div>
                 
                 {(isSoon || isLive) && (
                    <div className="md:hidden inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black animate-pulse border border-red-200">
                        <AlertCircle className="w-3 h-3" />
                        {isLive ? 'EN DIRECT' : 'Bientôt'}
                    </div>
                 )}
               </div>
               
               {/* Details */}
               <div className="flex-1 w-full text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-black text-[#2D1B0E] mb-2 leading-tight">{meet.subject}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-[#5D4037] font-bold text-sm">
                    <User className="w-4 h-4 text-emerald-600" /> 
                    {meet.teacherName}
                  </div>
                  
                  {(isSoon || isLive) && (
                     <div className="hidden md:inline-flex mt-4 items-center gap-2 bg-red-100 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-xs font-black animate-pulse uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4" />
                        {isLive ? 'SESSION EN COURS' : 'DÉMARRE DANS QUELQUES INSTANTS'}
                     </div>
                  )}
               </div>

               {/* Actions */}
               <div className="flex flex-col w-full md:w-auto gap-3">
                 <a 
                   href={meet.link} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="w-full md:w-auto bg-emerald-600 text-white px-6 py-4 rounded-xl font-black hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none uppercase tracking-wide"
                 >
                   <span>Rejoindre</span> <ExternalLink className="w-5 h-5" />
                 </a>
                 {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
                   <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => openEdit(meet)}
                        className="flex-1 p-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex justify-center items-center transition border-2 border-indigo-100 active:scale-95"
                        title="Modifier"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteMeet(meet.id)}
                        className="flex-1 p-3 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl flex justify-center items-center transition border-2 border-red-100 active:scale-95"
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="font-black text-lg md:text-xl uppercase tracking-wide">
                {editingId ? 'Modifier la session' : 'Programmer un Meet'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 md:p-8 bg-white">
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Matière</label>
                    <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-3 md:p-4 focus:border-emerald-500 focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Enseignant</label>
                    <input required type="text" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-3 md:p-4 focus:border-emerald-500 focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Date & Heure</label>
                    <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-3 md:p-4 text-sm focus:border-emerald-500 outline-none transition font-bold" />
                 </div>
                 <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Lien Google Meet</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input required type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl pl-12 p-3 md:p-4 focus:border-emerald-500 focus:bg-white outline-none transition font-bold text-emerald-700" placeholder="https://meet.google.com/..." />
                    </div>
                 </div>

                 {!editingId && (
                  <div className="bg-[#FFF8F0] border-2 border-[#D6C0B0] p-4 rounded-xl">
                    <label className="block text-sm font-black text-[#2D1B0E] mb-3 uppercase tracking-wide flex items-center gap-2">
                      <BellRing className="w-4 h-4" /> Notifier
                    </label>
                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
                      {[
                        { role: Role.STUDENT, label: 'Étudiants', color: 'emerald' },
                        { role: Role.RESPONSIBLE, label: 'Responsables', color: 'indigo' },
                        { role: Role.ADMIN, label: 'Admins', color: 'red' }
                      ].map(target => (
                        <button 
                          key={target.role}
                          type="button" 
                          onClick={() => toggleTargetRole(target.role)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition active:scale-95 ${targetRoles.includes(target.role) ? `bg-${target.color}-100 border-${target.color}-300 text-${target.color}-800` : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                 
                 <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] bg-[#EFEBE9] hover:bg-[#D7CCC8] transition border-2 border-transparent active:scale-95">
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