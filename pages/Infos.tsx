import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { generateAnnouncementContent } from '../services/gemini';
import { Megaphone, Trash2, Clock, Sparkles, Pencil, Plus, BellRing, X, ArrowUpDown, Filter, Calendar } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const Infos: React.FC = () => {
  const { user, announcements, users, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Sorting & Filtering State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Notification Target State
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setUrgency(Urgency.NORMAL);
    setTargetRoles([]); 
    setIsModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setUrgency(item.urgency);
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleGenerateAI = async () => {
    if (!title) return;
    setIsGenerating(true);
    const generated = await generateAnnouncementContent(title, user?.role === Role.RESPONSIBLE ? 'Enseignant' : 'Responsable');
    setContent(generated);
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateAnnouncement(editingId, {
        title,
        content,
        urgency
      });
    } else {
      addAnnouncement({
        title,
        content,
        date: new Date().toISOString(),
        urgency,
      }, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const toggleTargetRole = (role: Role) => {
    setTargetRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // 1. Sorting Logic
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // 2. Filtering Logic
  const filteredAnnouncements = sortedAnnouncements.filter(item => {
    const itemDate = new Date(item.date);
    
    if (filterStartDate) {
      const start = startOfDay(new Date(filterStartDate));
      if (isBefore(itemDate, start)) return false;
    }

    if (filterEndDate) {
      const end = endOfDay(new Date(filterEndDate));
      if (isAfter(itemDate, end)) return false;
    }

    return true;
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] flex items-center gap-3 tracking-tight">
            <span className="bg-[#FFEDD5] dark:bg-orange-900 border-2 border-[#FB923C] dark:border-orange-700 p-2 rounded-xl text-[#EA580C] shadow-[4px_4px_0_#FB923C]"><Megaphone className="w-6 h-6 md:w-8 md:h-8" /></span>
            Annonces
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 font-bold text-base md:text-lg">Le fil d'actualité de la classe.</p>
        </div>
        
        <div className="flex flex-wrap w-full md:w-auto gap-2 md:gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 md:flex-none btn-secondary bg-white dark:bg-[#2D1B0E] text-[#5D4037] dark:text-[#D6C0B0] border-2 px-4 py-3 rounded-xl font-bold active:scale-95 flex items-center justify-center gap-2 shadow-sm transition ${showFilters ? 'border-[#EA580C] text-[#EA580C] bg-orange-50 dark:bg-orange-900/20' : 'border-[#D6C0B0] dark:border-[#431407] hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723]'}`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filtrer</span>
          </button>

          <button 
            onClick={toggleSort}
            className="flex-1 md:flex-none btn-secondary bg-white dark:bg-[#2D1B0E] text-[#5D4037] dark:text-[#D6C0B0] border-2 border-[#D6C0B0] dark:border-[#431407] px-4 py-3 rounded-xl font-bold hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723] active:scale-95 flex items-center justify-center gap-2 shadow-sm transition"
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Récents' : 'Anciens'}</span>
          </button>

          {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
            <button 
              onClick={openCreate}
              className="flex-1 md:flex-none btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide shadow-md"
            >
              <Plus className="w-5 h-5"/> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-[#2D1B0E] border-2 border-[#D6C0B0] dark:border-[#431407] rounded-2xl p-4 md:p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
           <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="w-full md:flex-1">
                 <label className="block text-xs font-black text-[#8D6E63] dark:text-[#A1887F] uppercase mb-2">À partir du</label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl pl-10 p-3 font-bold text-[#2D1B0E] dark:text-[#fcece4] focus:border-[#EA580C] outline-none"
                    />
                 </div>
              </div>
              <div className="hidden md:block pb-4 text-[#D6C0B0] dark:text-[#5D4037]">
                 ➜
              </div>
              <div className="w-full md:flex-1">
                 <label className="block text-xs font-black text-[#8D6E63] dark:text-[#A1887F] uppercase mb-2">Jusqu'au</label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl pl-10 p-3 font-bold text-[#2D1B0E] dark:text-[#fcece4] focus:border-[#EA580C] outline-none"
                    />
                 </div>
              </div>
              <div>
                 <button 
                   onClick={clearFilters}
                   disabled={!filterStartDate && !filterEndDate}
                   className="w-full md:w-auto px-6 py-3.5 rounded-xl font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-2 border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                 >
                   <X className="w-5 h-5" /> Effacer
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="space-y-6 md:space-y-8">
        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#2D1B0E] rounded-3xl border-4 border-dashed border-[#D6C0B0] dark:border-[#431407]">
             <Megaphone className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E] dark:text-white" />
             <p className="font-bold text-xl text-[#8D6E63] dark:text-[#A1887F]">
               {announcements.length === 0 ? "Aucune annonce publiée." : "Aucune annonce ne correspond aux filtres."}
             </p>
             {(filterStartDate || filterEndDate) && (
               <button onClick={clearFilters} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                 Réinitialiser les filtres
               </button>
             )}
          </div>
        )}
        {filteredAnnouncements.map((item) => {
           const isUrgent = item.urgency === Urgency.URGENT;
           const isInfo = item.urgency === Urgency.INFO;
           const author = users.find(u => u.id === item.authorId);

           return (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-[#2D1B0E] rounded-2xl shadow-sm border-2 p-5 md:p-8 transition-transform ${
                isUrgent ? 'border-l-[8px] md:border-l-[12px] border-l-red-500 border-red-100 dark:border-red-900/20' : 
                isInfo ? 'border-l-[8px] md:border-l-[12px] border-l-emerald-500 border-emerald-100 dark:border-emerald-900/20' :
                'border-l-[8px] md:border-l-[12px] border-l-indigo-500 border-indigo-100 dark:border-indigo-900/20'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-4">
                      {/* Author Avatar Display */}
                      <div className="flex items-center gap-2">
                         <UserAvatar user={author} size="sm" />
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-[#2D1B0E] dark:text-[#fcece4] leading-none">{author?.name || 'Inconnu'}</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> {format(new Date(item.date), "d MMM à HH:mm", { locale: fr })}
                            </span>
                         </div>
                      </div>

                      <span className={`text-[10px] md:text-xs font-black px-2 py-1 md:px-3 md:py-1.5 rounded uppercase tracking-wider shadow-sm border ${
                        isUrgent ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' : 
                        isInfo ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 
                        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {item.urgency}
                      </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4] mb-2 leading-tight">{item.title}</h3>
                  <div className="prose prose-sm md:prose-base text-[#4B3621] dark:text-[#D6C0B0] leading-relaxed whitespace-pre-wrap font-medium">
                    {item.content}
                  </div>
                </div>

                {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
                  <div className="grid grid-cols-2 md:flex md:flex-col gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 md:min-w-[120px]">
                    <button 
                      onClick={() => openEdit(item)}
                      className="flex items-center justify-center gap-2 p-3 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition font-bold text-sm border border-indigo-100 dark:border-indigo-800 active:scale-95"
                    >
                      <Pencil className="w-4 h-4" /> <span className="md:inline">Modifier</span>
                    </button>
                    <button 
                      onClick={() => deleteAnnouncement(item.id)}
                      className="flex items-center justify-center gap-2 p-3 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition font-bold text-sm border border-red-100 dark:border-red-800 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" /> <span className="md:inline">Supprimer</span>
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
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-wide">
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase tracking-wide">Titre du message</label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" placeholder="Ex: Changement de salle..." />
                </div>
                
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 flex justify-between items-center uppercase tracking-wide">
                    Contenu
                    <button type="button" onClick={handleGenerateAI} disabled={isGenerating || !title} className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition font-black disabled:opacity-50 border border-indigo-200 dark:border-indigo-800 shadow-sm active:scale-95">
                      <Sparkles className="w-3 h-3" /> <span className="hidden sm:inline">Assistant</span> IA
                    </button>
                  </label>
                  <textarea required value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-medium text-[#2D1B0E] dark:text-[#fcece4]" placeholder="Votre message ici..." />
                </div>

                <div>
                   <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-3 uppercase tracking-wide">Importance</label>
                   <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {[
                        { val: Urgency.NORMAL, label: 'Normal', color: 'indigo' },
                        { val: Urgency.URGENT, label: 'Urgent', color: 'red' },
                        { val: Urgency.INFO, label: 'Info', color: 'emerald' }
                      ].map(opt => (
                        <label key={opt.val} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${urgency === opt.val ? `bg-${opt.color}-50 dark:bg-${opt.color}-900/30 border-${opt.color}-600 text-${opt.color}-700 dark:text-${opt.color}-300 shadow-[0_2px_0_currentColor]` : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                          <input type="radio" name="urgency" className="hidden" checked={urgency === opt.val} onChange={() => setUrgency(opt.val)} />
                          <span className="font-bold text-sm md:text-base dark:text-[#D6C0B0]">{opt.label}</span>
                        </label>
                      ))}
                   </div>
                </div>

                {!editingId && (
                  <div className="bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] p-4 rounded-xl">
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-3 uppercase tracking-wide flex items-center gap-2">
                      <BellRing className="w-4 h-4" /> Notifier
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { role: Role.STUDENT, label: 'Étudiants', color: 'emerald' },
                        { role: Role.RESPONSIBLE, label: 'Responsables', color: 'indigo' },
                        { role: Role.ADMIN, label: 'Admins', color: 'red' }
                      ].map(target => (
                        <button 
                          key={target.role}
                          type="button" 
                          onClick={() => toggleTargetRole(target.role)}
                          className={`flex-1 min-w-[100px] px-3 py-3 rounded-lg text-sm font-bold border-2 transition active:scale-95 ${targetRoles.includes(target.role) ? `bg-${target.color}-100 dark:bg-${target.color}-900/30 border-${target.color}-300 dark:border-${target.color}-700 text-${target.color}-800 dark:text-${target.color}-300` : 'bg-white dark:bg-[#2D1B0E] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                    {targetRoles.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Aucune notification spécifique.</p>}
                  </div>
                )}

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                    Annuler
                  </button>
                  <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wide">
                    {editingId ? 'Sauvegarder' : 'Publier'}
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