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
  
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

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
      updateAnnouncement(editingId, { title, content, urgency });
    } else {
      addAnnouncement({
        title, content, date: new Date().toISOString(), urgency,
      }, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

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

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const clearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 p-2 rounded-xl text-sky-600"><Megaphone className="w-8 h-8" /></span>
            Annonces
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Actualités et communiqués officiels.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={toggleSort}
             className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 active:scale-95 shadow-sm"
             title={sortOrder === 'desc' ? "Plus récents d'abord" : "Plus anciens d'abord"}
          >
             <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-3 rounded-xl border transition flex items-center gap-2 active:scale-95 shadow-sm ${showFilters ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 border-sky-200 dark:border-sky-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
          >
             <Filter className="w-5 h-5" />
          </button>

          {canManage && (
            <button 
              onClick={openCreate}
              className="flex-1 md:flex-none btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" /> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-2">
           <div className="flex-1">
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Du</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-medium text-slate-800 dark:text-white" />
           </div>
           <div className="flex-1">
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Au</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-medium text-slate-800 dark:text-white" />
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
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
             <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucune annonce pour le moment.</p>
          </div>
        )}
        {filteredAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           return (
            <div key={item.id} className={`
              bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 ease-out
              border-l-[4px] p-6 relative group cursor-pointer active:scale-[0.99] hover:-translate-y-1
              ${item.urgency === 'URGENT' ? 'border-l-red-500 shadow-red-100 dark:shadow-red-900/10' : item.urgency === 'INFO' ? 'border-l-sky-500 shadow-sky-100 dark:shadow-sky-900/10' : 'border-l-orange-500 shadow-orange-100 dark:shadow-orange-900/10'}
              border-t border-r border-b border-slate-200 dark:border-slate-800
            `}>
              {/* Badge Urgence */}
              <div className="absolute top-4 right-4 md:right-6">
                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    item.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : 
                    item.urgency === 'INFO' ? 'bg-sky-50 text-sky-600 border-sky-200' : 
                    'bg-orange-50 text-orange-600 border-orange-200'
                 }`}>
                   {item.urgency}
                 </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                 <UserAvatar user={author} size="md" />
                 <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{author?.name || 'Inconnu'}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                       <Clock className="w-3 h-3" />
                       {format(new Date(item.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                 </div>
              </div>

              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 pr-20 md:pr-0">{item.title}</h3>
              <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base">
                {item.content}
              </div>

              {canManage && (
                <div className="flex gap-2 w-full md:w-auto mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); shareResource('ANNOUNCEMENT', item); }}
                    className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition active:scale-95 flex items-center gap-2"
                    title="Envoyer par email"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEdit(item); }} 
                    className="p-2 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition active:scale-95"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteAnnouncement(item.id); }} 
                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
           );
        })}
      </div>

      {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-wide">
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition active:scale-90">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Titre</label>
                   <input 
                     required 
                     value={title} 
                     onChange={e => setTitle(e.target.value)} 
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" 
                     placeholder="Ex: Rentrée 2026"
                   />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Niveau d'urgence</label>
                   <div className="flex gap-2">
                      {(['INFO', 'NORMAL', 'URGENT'] as Urgency[]).map(u => (
                         <button
                           type="button"
                           key={u}
                           onClick={() => setUrgency(u)}
                           className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
                             urgency === u 
                               ? u === 'URGENT' ? 'bg-red-50 border-red-500 text-red-700' : u === 'INFO' ? 'bg-sky-50 border-sky-500 text-sky-700' : 'bg-orange-50 border-orange-500 text-orange-700' 
                               : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500'
                           }`}
                         >
                           {u}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Contenu</label>
                      <button 
                        type="button" 
                        onClick={handleGenerateAI}
                        disabled={!title || isGenerating}
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50 transition"
                      >
                         <Sparkles className="w-3 h-3" /> {isGenerating ? '...' : 'IA'}
                      </button>
                   </div>
                   <textarea 
                     required 
                     value={content} 
                     onChange={e => setContent(e.target.value)} 
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition min-h-[120px] font-medium text-slate-800 dark:text-white" 
                     placeholder="Votre message ici..."
                   />
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                      Annuler
                   </button>
                   <button type="submit" className="w-full md:w-2/3 bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-500/20 transition active:scale-95">
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