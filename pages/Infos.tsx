
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { generateAnnouncementContent } from '../services/gemini';
import { Megaphone, Trash2, Clock, Sparkles, Pencil, Plus, BellRing, X, ArrowUpDown, Filter, Calendar, Send } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const Infos: React.FC = () => {
  const { user, announcements, users, addAnnouncement, updateAnnouncement, deleteAnnouncement, shareResource } = useApp();
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

  // Permissions Check: Strictly RESPONSIBLE can manage. Admin observes. Student reads.
  const canManage = user?.role === Role.RESPONSIBLE;

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
    const generated = await generateAnnouncementContent(title, 'Responsable');
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
            <span className="bg-[#FFEDD5] dark:bg-orange-900 border-2 border-[#FB923C] dark:border-orange-700 p-2 rounded-xl shadow-[4px_4px_0_#EA580C]"><Megaphone className="text-[#EA580C] dark:text-orange-300 w-6 h-6 md:w-8 md:h-8" /></span>
            Tableau d'affichage
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 font-bold text-base md:text-lg">Actualités et communiqués officiels.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={toggleSort}
             className="bg-white dark:bg-[#2D1B0E] text-[#5D4037] dark:text-[#D6C0B0] border-2 border-[#D6C0B0] dark:border-[#431407] p-3 rounded-xl hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723] transition flex items-center gap-2 active:scale-95 shadow-sm"
             title={sortOrder === 'desc' ? "Plus récents d'abord" : "Plus anciens d'abord"}
          >
             <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-3 rounded-xl border-2 transition flex items-center gap-2 active:scale-95 shadow-sm ${showFilters ? 'bg-orange-100 dark:bg-orange-900/30 text-[#EA580C] dark:text-orange-300 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-[#2D1B0E] text-[#5D4037] dark:text-[#D6C0B0] border-[#D6C0B0] dark:border-[#431407] hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723]'}`}
             title="Filtrer par date"
          >
             <Filter className="w-5 h-5" />
          </button>

          {canManage && (
            <button 
              onClick={openCreate}
              className="flex-1 md:flex-none btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wide shadow-md"
            >
              <Plus className="w-5 h-5" /> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-[#2D1B0E] p-4 rounded-2xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] mb-6 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-2">
           <div className="flex-1">
              <label className="text-xs font-black uppercase text-[#8D6E63] dark:text-[#A1887F] mb-1 block">Du</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border border-[#D6C0B0] dark:border-[#5D4037] rounded-lg p-2 text-sm font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
           </div>
           <div className="flex-1">
              <label className="text-xs font-black uppercase text-[#8D6E63] dark:text-[#A1887F] mb-1 block">Au</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border border-[#D6C0B0] dark:border-[#5D4037] rounded-lg p-2 text-sm font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
           </div>
           <div className="flex items-end">
              <button onClick={clearFilters} className="text-sm text-red-500 font-bold hover:underline flex items-center gap-1 py-2 px-3">
                 <X className="w-4 h-4" /> Effacer
              </button>
           </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-[#2D1B0E] rounded-3xl border-4 border-dashed border-[#D6C0B0] dark:border-[#431407]">
             <Megaphone className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E] dark:text-white" />
             <p className="font-bold text-xl text-[#8D6E63] dark:text-[#A1887F]">Aucune annonce pour le moment.</p>
          </div>
        )}
        {filteredAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           return (
            <div key={item.id} className={`
              bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm hover:shadow-md transition-all duration-300
              border-l-[6px] p-5 md:p-8 relative group
              ${item.urgency === 'URGENT' ? 'border-l-red-500 shadow-red-100 dark:shadow-red-900/10' : item.urgency === 'INFO' ? 'border-l-indigo-500 shadow-indigo-100 dark:shadow-indigo-900/10' : 'border-l-orange-500 shadow-orange-100 dark:shadow-orange-900/10'}
              border-t-2 border-r-2 border-b-2 border-[#D6C0B0] dark:border-[#431407]
            `}>
              {/* Badge Urgence */}
              <div className="absolute top-4 right-4 md:right-8">
                 <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                    item.urgency === 'URGENT' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' : 
                    item.urgency === 'INFO' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 
                    'bg-orange-100 dark:bg-orange-900/30 text-[#EA580C] dark:text-orange-400 border-orange-200 dark:border-orange-800'
                 }`}>
                   {item.urgency}
                 </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                 <UserAvatar user={author} size="md" />
                 <div>
                    <p className="text-sm font-black text-[#2D1B0E] dark:text-[#fcece4] leading-tight">{author?.name || 'Inconnu'}</p>
                    <p className="text-xs font-bold text-[#8D6E63] dark:text-[#A1887F] flex items-center gap-1 mt-0.5">
                       <Clock className="w-3 h-3" />
                       {format(new Date(item.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                 </div>
              </div>

              <h3 className="text-xl md:text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4] mb-3 pr-20 md:pr-0">{item.title}</h3>
              <div className="text-[#5D4037] dark:text-[#D6C0B0] leading-relaxed whitespace-pre-wrap font-medium">
                {item.content}
              </div>

              {canManage && (
                <div className="flex gap-2 w-full md:w-auto mt-6 md:mt-4 border-t-2 md:border-t-0 border-[#EFEBE9] dark:border-[#431407] pt-4 md:pt-0 justify-end">
                  <button 
                    onClick={() => shareResource('ANNOUNCEMENT', item)}
                    className="p-3 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition border border-emerald-100 dark:border-emerald-800 active:scale-95 flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" /> <span className="text-sm font-bold">Envoyer</span>
                  </button>
                  <button 
                    onClick={() => openEdit(item)} 
                    className="p-3 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition border border-indigo-100 dark:border-indigo-800 active:scale-95"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteAnnouncement(item.id)} 
                    className="p-3 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition border border-red-100 dark:border-red-800 active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
           );
        })}
      </div>

      {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="font-black text-lg md:text-xl uppercase tracking-wide">
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Titre</label>
                   <input 
                     required 
                     value={title} 
                     onChange={e => setTitle(e.target.value)} 
                     className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" 
                     placeholder="Ex: Rentrée 2026"
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Niveau d'urgence</label>
                   <div className="flex gap-2">
                      {(['INFO', 'NORMAL', 'URGENT'] as Urgency[]).map(u => (
                         <button
                           type="button"
                           key={u}
                           onClick={() => setUrgency(u)}
                           className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-black border-2 transition active:scale-95 ${
                             urgency === u 
                               ? u === 'URGENT' ? 'bg-red-100 border-red-500 text-red-800' : u === 'INFO' ? 'bg-indigo-100 border-indigo-500 text-indigo-800' : 'bg-orange-100 border-orange-500 text-[#EA580C]' 
                               : 'bg-[#FFF8F0] dark:bg-[#1a100a] border-[#D6C0B0] dark:border-[#5D4037] text-[#8D6E63] dark:text-[#A1887F] opacity-70 hover:opacity-100'
                           }`}
                         >
                           {u}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] uppercase">Contenu</label>
                      <button 
                        type="button" 
                        onClick={handleGenerateAI}
                        disabled={!title || isGenerating}
                        className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50 transition border border-indigo-200 dark:border-indigo-800"
                      >
                         <Sparkles className="w-3 h-3" /> {isGenerating ? 'Génération...' : 'Assistant IA'}
                      </button>
                   </div>
                   <textarea 
                     required 
                     value={content} 
                     onChange={e => setContent(e.target.value)} 
                     className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition min-h-[150px] font-medium text-[#2D1B0E] dark:text-[#fcece4]" 
                     placeholder="Votre message ici..."
                   />
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                      Annuler
                   </button>
                   <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
                      {editingId ? 'Mettre à jour' : 'Publier'}
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