
import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { generateAnnouncementContent, correctFrenchText } from '../services/gemini';
import { Megaphone, Trash2, Clock, Sparkles, Pencil, Plus, X, ArrowUpDown, Filter, Send, Mail, User, AlertCircle, Timer, Search, Archive, Wand2, Eye, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const Infos: React.FC = () => {
  const { 
    user, 
    announcements, 
    users, 
    addAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement, 
    shareResource,
    highlightedItemId,
    setHighlightedItemId,
    addNotification
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // View Modal State
  const [viewingItem, setViewingItem] = useState<Announcement | null>(null);
  
  // Share Confirmation State
  const [shareConfirmation, setShareConfirmation] = useState<Announcement | null>(null);

  // Sorting & Filtering State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // État pour voir les archives
  
  // Real-time auto-hide
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // Recherche (Optimisée)
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery); // Fluidité de frappe

  // Filtres
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'ALL'>('ALL');
  const [filterAuthorId, setFilterAuthorId] = useState<string>('ALL');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [durationHours, setDurationHours] = useState<number | ''>(''); // State for duration
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  // Permission globale pour créer (réservé aux responsables/admins dans ce contexte)
  const canCreate = user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER BY CLASS (Memoized) ---
  const myAnnouncements = useMemo(() => {
    return isAdmin ? announcements : announcements.filter(a => a.classId === user?.classId);
  }, [isAdmin, announcements, user?.classId]);

  // --- REAL-TIME TIMER ---
  // Met à jour l'heure actuelle toutes les minutes pour déclencher le masquage automatique
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute
    return () => clearInterval(timer);
  }, []);

  // Récupérer la liste unique des auteurs ayant posté des annonces (dans mon scope)
  const uniqueAuthors = useMemo(() => {
    const authorIds = Array.from(new Set(myAnnouncements.map(a => a.authorId)));
    return authorIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  }, [myAnnouncements, users]);

  // --- DEEP LINKING (Auto Open) ---
  useEffect(() => {
    if (highlightedItemId) {
      const itemToOpen = myAnnouncements.find(a => a.id === highlightedItemId);
      if (itemToOpen) {
        setViewingItem(itemToOpen);
        // Clear the highlight after opening so it doesn't reopen if we close and navigate back
        setHighlightedItemId(null);
      }
    }
  }, [highlightedItemId, myAnnouncements, setHighlightedItemId]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, showArchived, sortOrder]);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setUrgency(Urgency.NORMAL);
    setDurationHours('');
    setTargetRoles([]); 
    setIsModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setUrgency(item.urgency);
    setDurationHours(item.durationHours || '');
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

  const handleCorrection = async () => {
    if (!content) return;
    setIsCorrecting(true);
    try {
      const corrected = await correctFrenchText(content);
      if (corrected !== content) {
        setContent(corrected);
        addNotification("Texte corrigé avec succès !", "SUCCESS");
      } else {
        addNotification("Aucune correction nécessaire détectée.", "INFO");
      }
    } catch (e) {
      addNotification("Erreur lors de la correction.", "ERROR");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      title, 
      content, 
      urgency,
      durationHours: durationHours === '' ? undefined : Number(durationHours)
    };

    if (editingId) {
      updateAnnouncement(editingId, payload);
    } else {
      addAnnouncement({
        ...payload,
        date: new Date().toISOString(),
      }, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const handleConfirmShare = () => {
    if (shareConfirmation) {
      shareResource('ANNOUNCEMENT', shareConfirmation);
      setShareConfirmation(null);
    }
  };

  const handleCopy = (item: Announcement) => {
    const textToCopy = `${item.title.toUpperCase()}\n\n${item.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      addNotification("Annonce copiée dans le presse-papier", "SUCCESS");
    }).catch(() => {
      addNotification("Erreur lors de la copie", "ERROR");
    });
  };

  // --- HEAVY COMPUTATION MEMOIZATION ---
  const filteredAnnouncements = useMemo(() => {
    const sorted = [...myAnnouncements].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return sorted.filter(item => {
      const itemDate = new Date(item.date);

      // 0. Filtre de durée
      if (item.durationHours && item.durationHours > 0) {
        const expirationDate = addHours(itemDate, item.durationHours);
        const isExpired = isAfter(currentTime, expirationDate);
        
        if (!showArchived && isExpired) {
          return false;
        }
      }

      // 1. Recherche (Utilise deferredSearchQuery pour ne pas bloquer l'UI)
      if (deferredSearchQuery.trim()) {
        const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const query = normalize(deferredSearchQuery.trim());
        const titleStr = normalize(item.title || '');
        const contentStr = normalize(item.content || '');
        
        if (!titleStr.includes(query) && !contentStr.includes(query)) {
          return false;
        }
      }

      // 2. Filtre Date
      if (filterStartDate) {
        const start = startOfDay(new Date(filterStartDate));
        if (isBefore(itemDate, start)) return false;
      }
      if (filterEndDate) {
        const end = endOfDay(new Date(filterEndDate));
        if (isAfter(itemDate, end)) return false;
      }

      // 3. Filtre Urgence
      if (filterUrgency !== 'ALL' && item.urgency !== filterUrgency) return false;

      // 4. Filtre Auteur
      if (filterAuthorId !== 'ALL' && item.authorId !== filterAuthorId) return false;

      return true;
    });
  }, [myAnnouncements, sortOrder, deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, showArchived, currentTime]);

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentAnnouncements = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  
  const clearFilters = () => { 
    setFilterStartDate(''); 
    setFilterEndDate(''); 
    setFilterUrgency('ALL');
    setFilterAuthorId('ALL');
    setSearchQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-[#87CEEB]/20 dark:bg-[#87CEEB]/30 border border-[#87CEEB]/40 p-2 rounded-2xl text-[#0EA5E9] dark:text-[#87CEEB]"><Megaphone className="w-8 h-8" /></span>
            Annonces
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Actualités et communiqués officiels.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={() => setShowArchived(!showArchived)}
             className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showArchived ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
             title={showArchived ? "Masquer les archives" : "Voir les archives"}
          >
             <Archive className="w-5 h-5" />
          </button>

          <button 
             onClick={toggleSort}
             className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none justify-center"
             title={sortOrder === 'desc' ? "Plus récents d'abord" : "Plus anciens d'abord"}
          >
             <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showFilters ? 'bg-[#87CEEB]/20 text-[#0369A1] border-[#87CEEB]/40' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
          >
             <Filter className="w-5 h-5" />
          </button>

          {canCreate && (
            <button 
              onClick={openCreate}
              className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md shadow-[#87CEEB]/30"
            >
              <Plus className="w-5 h-5" /> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche toujours visible */}
      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#87CEEB] transition-colors" />
        </div>
        <input 
          type="text" 
          aria-label="Rechercher une annonce"
          placeholder="Rechercher une annonce (titre, contenu)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-11 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all shadow-sm font-medium"
        />
        {searchQuery && (
           <button 
             onClick={() => setSearchQuery('')}
             className="absolute inset-y-0 right-0 pr-3 flex items-center"
           >
             <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
               <X className="w-4 h-4" />
             </div>
           </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Du</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#87CEEB]/30" />
             </div>
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Au</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#87CEEB]/30" />
             </div>
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Urgence</label>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value as Urgency | 'ALL')} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#87CEEB]/30 appearance-none">
                  <option value="ALL">Toutes</option>
                  <option value={Urgency.INFO}>Info</option>
                  <option value={Urgency.NORMAL}>Normal</option>
                  <option value={Urgency.URGENT}>Urgent</option>
                </select>
             </div>
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><User className="w-3 h-3"/> Auteur</label>
                <select value={filterAuthorId} onChange={e => setFilterAuthorId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#87CEEB]/30 appearance-none">
                  <option value="ALL">Tous les auteurs</option>
                  {uniqueAuthors.map(u => (
                    <option key={u?.id} value={u?.id}>{u?.name}</option>
                  ))}
                </select>
             </div>
           </div>
           <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
              <button onClick={clearFilters} className="text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-4 rounded-lg transition flex items-center gap-1">
                 <X className="w-3 h-3" /> Réinitialiser les filtres
              </button>
           </div>
        </div>
      )}

      {/* Compteur de résultats */}
      <div className="mb-4 px-2 flex justify-between items-center">
         <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {filteredAnnouncements.length} annonce{filteredAnnouncements.length > 1 ? 's' : ''} {showArchived ? '(archives incluses)' : ''}
         </span>
         {showArchived && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
               Mode Archives Actif
            </span>
         )}
      </div>

      <div className="space-y-6">
        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
             <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucun résultat ne correspond à vos critères.</p>
          </div>
        )}
        {currentAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           const isAuthor = user?.id === item.authorId;
           const expirationDate = item.durationHours ? addHours(new Date(item.date), item.durationHours) : null;
           const isExpired = expirationDate ? isAfter(currentTime, expirationDate) : false;

           return (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`
                bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none
                border border-slate-100 dark:border-slate-800 p-5 md:p-8 relative overflow-hidden 
                group cursor-pointer transition-all duration-300 
                hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(135,206,235,0.15)] dark:hover:shadow-lg dark:hover:shadow-[#87CEEB]/5
                hover:bg-slate-50 dark:hover:bg-slate-800/30
                ${isExpired ? 'opacity-70 grayscale-[0.5]' : ''}
              `}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.urgency === 'URGENT' ? 'bg-red-500' : item.urgency === 'INFO' ? 'bg-[#87CEEB]' : 'bg-orange-500'}`}></div>

              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-5 pl-2 md:pl-3">
                 <div className="flex items-center gap-3">
                    <div className="ring-2 ring-white dark:ring-slate-900 rounded-full shadow-sm bg-slate-100 dark:bg-slate-800">
                      <UserAvatar user={author} size="md" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{author?.name || 'Inconnu'}</p>
                      <p className="text-[10px] md:text-xs font-medium text-slate-400 flex items-center gap-1 mt-0.5 capitalize">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.date), 'EEEE dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${item.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-100' : item.urgency === 'INFO' ? 'bg-sky-50 text-[#0369A1] border-sky-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {item.urgency}
                    </span>
                    {item.durationHours && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                          <Timer className="w-3 h-3" /> {isExpired ? 'Expiré' : `${item.durationHours}h`}
                      </span>
                    )}
                 </div>
              </div>

              {/* Contenu */}
              <div className="pl-2 md:pl-3 md:pr-10">
                <h3 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white mb-2 md:mb-3 leading-tight group-hover:text-[#0EA5E9] transition-colors duration-300">
                  {isExpired && <span className="text-red-500 mr-2 text-base md:text-lg">[EXPIRÉ]</span>}
                  {item.title}
                </h3>
                <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base font-medium mb-3 md:mb-4 line-clamp-3">
                  {item.content}
                </div>
                <div className="flex items-center gap-1 text-[#87CEEB] font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
                    <span>Lire la suite</span> <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex flex-wrap gap-2 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                  <button onClick={(e) => { e.stopPropagation(); setViewingItem(item); }} className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-[#0EA5E9] hover:border-[#87CEEB] rounded-xl transition shadow-sm" title="Voir"><Eye className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleCopy(item); }} className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-[#0EA5E9] hover:border-[#87CEEB] rounded-xl transition shadow-sm" title="Copier"><Copy className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setShareConfirmation(item); }} className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-emerald-500 hover:border-emerald-400 rounded-xl transition shadow-sm" title="Partager"><Send className="w-4 h-4" /></button>
                  {isAuthor && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-[#0EA5E9] hover:border-[#87CEEB] rounded-xl transition shadow-sm" title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteAnnouncement(item.id); }} className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-red-500 hover:border-red-400 rounded-xl transition shadow-sm" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
              </div>
            </div>
           );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
         <div className="flex justify-center items-center gap-2 mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex gap-2">
               {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button key={number} onClick={() => paginate(number)} className={`w-12 h-12 rounded-2xl text-sm font-bold flex items-center justify-center transition shadow-sm ${currentPage === number ? 'bg-[#0EA5E9] text-white shadow-[#87CEEB]/40' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{number}</button>
               ))}
            </div>
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"><ChevronRight className="w-5 h-5" /></button>
         </div>
      )}

      {/* --- MODALS (View, Confirm, Edit) --- */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingItem(null)}>
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingItem(null)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10 text-slate-500"><X className="w-5 h-5" /></button>
              <div className="p-8 md:p-10">
                 <div className="flex items-start gap-4 mb-8">
                    <UserAvatar user={users.find(u => u.id === viewingItem.authorId)} size="lg" />
                    <div className="flex-1">
                       <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-3">{viewingItem.title}</h3>
                       <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${viewingItem.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : viewingItem.urgency === 'INFO' ? 'bg-sky-50 text-[#0369A1] border-sky-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{viewingItem.urgency}</span>
                          <span className="text-slate-500 font-bold text-sm flex items-center gap-2">par {users.find(u => u.id === viewingItem.authorId)?.name}</span>
                          <span className="text-slate-300 font-light text-sm hidden md:inline">•</span>
                          <span className="text-slate-400 font-medium text-sm flex items-center gap-1 capitalize"><Clock className="w-3 h-3" /> {format(new Date(viewingItem.date), 'EEEE dd MMM yyyy à HH:mm', { locale: fr })}</span>
                       </div>
                       {viewingItem.durationHours && (<p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1"><Timer className="w-3 h-3"/> Expire après {viewingItem.durationHours}h</p>)}
                    </div>
                 </div>
                 <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-medium">{viewingItem.content}</div>
                 <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button onClick={() => handleCopy(viewingItem)} className="px-5 py-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2"><Copy className="w-4 h-4"/> <span className="hidden md:inline">Copier le texte</span></button>
                    <button onClick={() => setViewingItem(null)} className="px-8 py-3 bg-[#0EA5E9] text-white font-bold rounded-2xl hover:bg-[#0284C7] shadow-lg shadow-[#87CEEB]/30 transition">Fermer</button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {shareConfirmation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[170] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Mail className="w-10 h-10" /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Confirmer le partage</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">Voulez-vous envoyer l'annonce <strong>"{shareConfirmation.title}"</strong> par email à tous les membres de la classe ?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShareConfirmation(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={handleConfirmShare} className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">Envoyer</button>
              </div>
           </div>
        </div>
      )}
      {isModalOpen && canCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0 rounded-t-[2rem]">
              <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="w-2 h-6 bg-[#0EA5E9] rounded-full"></span>{editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 p-2 rounded-full transition shadow-sm border border-slate-100 dark:border-slate-800"><X className="w-6 h-6" /></button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto p-8 bg-white dark:bg-slate-900 flex-1">
              <form id="annonce-form" onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Titre</label>
                    <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-lg font-bold focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#0EA5E9] outline-none transition text-slate-800 dark:text-white placeholder-slate-400" placeholder="Ex: Sortie pédagogique..." />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Contenu</label>
                       <div className="flex gap-3">
                        <button type="button" onClick={handleCorrection} disabled={isCorrecting || !content} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-50 transition">{isCorrecting ? <span className="animate-spin">⏳</span> : <Wand2 className="w-3 h-3" />} Corriger</button>
                        <button type="button" onClick={handleGenerateAI} disabled={isGenerating || !title} className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50 transition">{isGenerating ? <span className="animate-spin">✨</span> : <Sparkles className="w-3 h-3" />} IA</button>
                       </div>
                    </div>
                    <textarea required value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-base min-h-[200px] focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#0EA5E9] outline-none transition leading-relaxed text-slate-800 dark:text-white placeholder-slate-400 font-medium resize-none" placeholder="Détails de l'annonce..." />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Niveau d'urgence</label>
                        <div className="flex gap-2">
                        {[Urgency.INFO, Urgency.NORMAL, Urgency.URGENT].map(u => (
                            <button key={u} type="button" onClick={() => setUrgency(u)} className={`flex-1 py-3 rounded-2xl text-xs font-bold border-2 transition capitalize ${urgency === u ? u === Urgency.URGENT ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : u === Urgency.INFO ? 'bg-sky-50 border-sky-500 text-sky-600 shadow-sm' : 'bg-orange-50 border-orange-500 text-orange-600 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{u}</button>
                        ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Durée (Heures)</label>
                        <div className="relative">
                            <Timer className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <input type="number" min="1" value={durationHours} onChange={e => setDurationHours(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pl-12 text-base font-bold focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#0EA5E9] outline-none transition text-slate-800 dark:text-white placeholder-slate-400" placeholder="Illimité" />
                        </div>
                    </div>
                 </div>
              </form>
            </div>
            
            {/* Fixed Footer with Buttons */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-[2rem] flex flex-col-reverse md:flex-row gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">Annuler</button>
                <button type="submit" form="annonce-form" className="w-full md:w-2/3 bg-[#0EA5E9] text-white py-3.5 rounded-2xl font-bold hover:bg-[#0284C7] shadow-lg shadow-[#87CEEB]/30 transition active:scale-95 flex items-center justify-center gap-2">{editingId ? 'Mettre à jour' : 'Publier l\'annonce'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
