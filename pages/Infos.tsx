
import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { Megaphone, Trash2, Clock, Plus, X, ArrowUpDown, Filter, Send, Mail, User, AlertCircle, Timer, Search, Archive, Eye, Copy, ChevronLeft, ChevronRight, Pencil, School, Calendar, AlertTriangle, FileText, Info } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

// Configuration visuelle par niveau d'urgence
const URGENCY_CONFIG = {
  [Urgency.URGENT]: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-100 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    label: 'Urgent'
  },
  [Urgency.INFO]: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-100 dark:border-sky-800',
    badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
    label: 'Info'
  },
  [Urgency.NORMAL]: {
    icon: FileText,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    label: 'Normal'
  }
};

export const Infos: React.FC = () => {
  const { 
    user, 
    announcements, 
    users, 
    classes,
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

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sorting & Filtering State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // État pour voir les archives
  
  // Real-time auto-hide
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6; // Augmenté pour la grille
  
  // Recherche (Optimisée)
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery); // Fluidité de frappe

  // Filtres
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'ALL'>('ALL');
  const [filterAuthorId, setFilterAuthorId] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [durationHours, setDurationHours] = useState<number | ''>(''); // State for duration
  
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
  }, [deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, filterClassId, showArchived, sortOrder]);

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

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteAnnouncement(deleteId);
      setDeleteId(null);
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

      // 5. Filtre Classe
      if (filterClassId !== 'ALL' && item.classId !== filterClassId) return false;

      return true;
    });
  }, [myAnnouncements, sortOrder, deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, filterClassId, showArchived, currentTime]);

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
    setFilterClassId('ALL');
    setSearchQuery('');
  };

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-0 animate-in fade-in duration-500">
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
             <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
               <X className="w-4 h-4" />
             </div>
           </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><School className="w-3 h-3"/> Classe</label>
                <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#87CEEB]/30 appearance-none">
                  <option value="ALL">Toutes les classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAnnouncements.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
             <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucun résultat ne correspond à vos critères.</p>
          </div>
        )}
        {currentAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           const isAuthor = user?.id === item.authorId;
           const expirationDate = item.durationHours ? addHours(new Date(item.date), item.durationHours) : null;
           const isExpired = expirationDate ? isAfter(currentTime, expirationDate) : false;
           const style = URGENCY_CONFIG[item.urgency];
           const UrgencyIcon = style.icon;

           return (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`
                bg-white dark:bg-slate-900 rounded-[2rem] border relative overflow-hidden flex flex-col
                group cursor-pointer transition-all duration-300 
                hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none
                ${style.border} ${isExpired ? 'opacity-60 grayscale-[0.8]' : ''}
              `}
            >
              {/* Header avec métadonnées */}
              <div className={`px-6 py-4 flex items-center justify-between ${style.bg} border-b ${style.border}`}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${style.badge} ${style.border}`}>
                      <UrgencyIcon className="w-3.5 h-3.5" />
                      {style.label}
                  </div>
                  
                  <div className="flex items-center gap-3">
                      {item.durationHours && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                           <Timer className="w-3 h-3" />
                           {isExpired ? 'Expiré' : `${item.durationHours}h`}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(item.date), 'dd MMM', { locale: fr })}
                      </div>
                  </div>
              </div>

              {/* Contenu Principal */}
              <div className="p-6 flex-1 flex flex-col">
                 <h3 className={`text-xl font-bold mb-3 line-clamp-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors ${style.color}`}>
                    {isExpired && <span className="text-red-500 text-sm mr-2">[EXPIRÉ]</span>}
                    {item.title}
                 </h3>
                 <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-3 mb-6 font-medium">
                    {item.content}
                 </p>

                 {/* Footer : Auteur et Actions */}
                 <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                       <UserAvatar user={author} size="sm" className="ring-2 ring-white dark:ring-slate-900" />
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{author?.name || 'Inconnu'}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{format(new Date(item.date), 'HH:mm')}</span>
                       </div>
                    </div>

                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(item); }} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition" title="Copier"><Copy className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShareConfirmation(item); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition" title="Partager"><Send className="w-4 h-4" /></button>
                        {isAuthor && (
                          <>
                             <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Modifier"><Pencil className="w-4 h-4" /></button>
                             <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                    </div>
                 </div>
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

      {/* --- MODALS (View, Confirm, Edit, Delete) --- */}
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
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${viewingItem.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : viewingItem.urgency === 'INFO' ? 'bg-sky-50 text-[#0369A1] border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{viewingItem.urgency}</span>
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
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer l'annonce ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20">Supprimer</button>
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
                    </div>
                    <textarea required value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-base min-h-[200px] focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#0EA5E9] outline-none transition leading-relaxed text-slate-800 dark:text-white placeholder-slate-400 font-medium resize-none" placeholder="Détails de l'annonce..." />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Niveau d'urgence</label>
                        <div className="flex gap-2">
                        {[Urgency.INFO, Urgency.NORMAL, Urgency.URGENT].map(u => {
                            const style = URGENCY_CONFIG[u];
                            const Icon = style.icon;
                            return (
                                <button key={u} type="button" onClick={() => setUrgency(u)} className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1 ${urgency === u ? `${style.bg} ${style.border} ${style.color} ring-2 ring-offset-1 ring-sky-200 dark:ring-sky-900` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    <Icon className="w-4 h-4" />
                                    {style.label}
                                </button>
                            );
                        })}
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
