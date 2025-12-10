

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { generateAnnouncementContent, correctFrenchText } from '../services/gemini';
import { Megaphone, Trash2, Clock, Sparkles, Pencil, Plus, X, ArrowUpDown, Filter, Send, Mail, User, AlertCircle, Timer, Search, Archive, Wand2, Eye, Copy } from 'lucide-react';
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
  
  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

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

  // --- FILTER BY CLASS ---
  const myAnnouncements = isAdmin ? announcements : announcements.filter(a => a.classId === user?.classId);

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

  const sortedAnnouncements = [...myAnnouncements].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const filteredAnnouncements = sortedAnnouncements.filter(item => {
    const itemDate = new Date(item.date);
    const now = new Date();

    // 0. Filtre de durée (Masquage automatique ou Archives)
    if (item.durationHours && item.durationHours > 0) {
      const expirationDate = addHours(itemDate, item.durationHours);
      const isExpired = isAfter(now, expirationDate);
      
      if (!showArchived && isExpired) {
        return false; // Masqué si expiré et qu'on ne regarde pas les archives
      }
    }

    // 1. Recherche par mot-clé (Titre ou Contenu) avec gestion des accents
    if (searchQuery.trim()) {
      // Normalisation pour ignorer les accents (ex: "é" == "e")
      const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const query = normalize(searchQuery.trim());
      const titleStr = normalize(item.title || '');
      const contentStr = normalize(item.content || '');
      
      const matchesTitle = titleStr.includes(query);
      const matchesContent = contentStr.includes(query);
      
      if (!matchesTitle && !matchesContent) {
        return false;
      }
    }

    // 2. Filtre Date (Manuel)
    if (filterStartDate) {
      const start = startOfDay(new Date(filterStartDate));
      if (isBefore(itemDate, start)) return false;
    }
    if (filterEndDate) {
      const end = endOfDay(new Date(filterEndDate));
      if (isAfter(itemDate, end)) return false;
    }

    // 3. Filtre Urgence
    if (filterUrgency !== 'ALL' && item.urgency !== filterUrgency) {
      return false;
    }

    // 4. Filtre Auteur
    if (filterAuthorId !== 'ALL' && item.authorId !== filterAuthorId) {
      return false;
    }

    return true;
  });

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  
  const clearFilters = () => { 
    setFilterStartDate(''); 
    setFilterEndDate(''); 
    setFilterUrgency('ALL');
    setFilterAuthorId('ALL');
    setSearchQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 p-2 rounded-xl text-sky-600"><Megaphone className="w-8 h-8" /></span>
            Annonces
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Actualités et communiqués officiels.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={() => setShowArchived(!showArchived)}
             className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showArchived ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
             title={showArchived ? "Masquer les archives" : "Voir les archives"}
          >
             <Archive className="w-5 h-5" />
          </button>

          <button 
             onClick={toggleSort}
             className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none justify-center"
             title={sortOrder === 'desc' ? "Plus récents d'abord" : "Plus anciens d'abord"}
          >
             <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showFilters ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 border-sky-200 dark:border-sky-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
          >
             <Filter className="w-5 h-5" />
          </button>

          {canCreate && (
            <button 
              onClick={openCreate}
              className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" /> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche toujours visible */}
      <div className="relative mb-6 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="Rechercher une annonce (titre, contenu)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-11 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all shadow-sm font-medium"
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Filtre Date Début */}
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Du</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20" />
             </div>
             
             {/* Filtre Date Fin */}
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Au</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20" />
             </div>

             {/* Filtre Urgence */}
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Urgence</label>
                <select 
                  value={filterUrgency} 
                  onChange={e => setFilterUrgency(e.target.value as Urgency | 'ALL')}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none"
                >
                  <option value="ALL">Toutes</option>
                  <option value={Urgency.INFO}>Info</option>
                  <option value={Urgency.NORMAL}>Normal</option>
                  <option value={Urgency.URGENT}>Urgent</option>
                </select>
             </div>

             {/* Filtre Auteur */}
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1"><User className="w-3 h-3"/> Auteur</label>
                <select 
                  value={filterAuthorId} 
                  onChange={e => setFilterAuthorId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none"
                >
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

      <div className="space-y-4 md:space-y-6">
        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
             <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucune annonce ne correspond à vos critères.</p>
             {(searchQuery || filterStartDate || filterEndDate || filterUrgency !== 'ALL' || filterAuthorId !== 'ALL') && (
               <button onClick={clearFilters} className="text-sky-600 font-bold text-sm mt-2 hover:underline">Effacer la recherche</button>
             )}
          </div>
        )}
        {filteredAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           const isAuthor = user?.id === item.authorId;
           
           // Check expiration
           const expirationDate = item.durationHours ? addHours(new Date(item.date), item.durationHours) : null;
           const isExpired = expirationDate ? isAfter(new Date(), expirationDate) : false;

           return (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`
              bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 ease-out
              border-l-[4px] p-4 md:p-6 relative group cursor-pointer active:scale-[0.99] hover:-translate-y-1 hover:bg-slate-50 dark:hover:bg-slate-800/50
              ${item.urgency === 'URGENT' ? 'border-l-red-500 shadow-red-100 dark:shadow-red-900/10' : item.urgency === 'INFO' ? 'border-l-sky-500 shadow-sky-100 dark:shadow-sky-900/10' : 'border-l-orange-500 shadow-orange-100 dark:shadow-orange-900/10'}
              border-t border-r border-b border-slate-200 dark:border-slate-800
              ${isExpired ? 'opacity-70 grayscale-[0.5]' : ''}
            `}>
              {/* Badge Urgence */}
              <div className="absolute top-3 right-3 md:top-4 md:right-6 flex flex-col items-end gap-1">
                 <span className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${
                    item.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : 
                    item.urgency === 'INFO' ? 'bg-sky-50 text-sky-600 border-sky-200' : 
                    'bg-orange-50 text-orange-600 border-orange-200'
                 }`}>
                   {item.urgency}
                 </span>
                 {item.durationHours && (
                   <span className={`text-[9px] md:text-[10px] font-bold flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                      <Timer className="w-3 h-3" /> 
                      <span className="hidden md:inline">{isExpired ? 'Expiré' : 'Temporaire'}</span>
                   </span>
                 )}
              </div>

              <div className="flex items-center gap-3 mb-3 md:mb-4">
                 <div className="scale-90 md:scale-100 origin-left">
                   <UserAvatar user={author} size="md" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{author?.name || 'Inconnu'}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                       <Clock className="w-3 h-3" />
                       {format(new Date(item.date), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                 </div>
              </div>

              <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white mb-2 md:mb-3 pr-16 md:pr-0 line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-300">
                {isExpired && <span className="text-red-500 mr-2">[EXPIRÉ]</span>}
                {item.title}
              </h3>
              
              <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base line-clamp-3">
                {item.content}
              </div>
              <div className="mt-2 flex items-center gap-1 text-sky-600 font-bold text-sm opacity-80 group-hover:opacity-100 transition">
                  <Eye className="w-4 h-4"/> Lire la suite
              </div>

              {/* Barre d'actions */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4 md:mt-6 border-t border-slate-100 dark:border-slate-800 pt-3 md:pt-4 justify-end">
                  {/* Bouton Voir */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingItem(item); }}
                    className="flex-1 md:flex-none p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                    title="Voir les détails"
                  >
                    <Eye className="w-4 h-4" /> <span className="md:hidden text-xs font-bold">Voir</span>
                  </button>

                  {/* Bouton Copier */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCopy(item); }}
                    className="flex-1 md:flex-none p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                    title="Copier le contenu"
                  >
                    <Copy className="w-4 h-4" /> <span className="md:hidden text-xs font-bold">Copier</span>
                  </button>

                  {/* Bouton Partager */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShareConfirmation(item); }}
                    className="flex-1 md:flex-none p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                    title="Envoyer par email"
                  >
                    <Send className="w-4 h-4" /> <span className="md:hidden text-xs font-bold">Partager</span>
                  </button>
                  
                  {isAuthor && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }} 
                        className="flex-1 md:flex-none p-2 rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                        style={{ color: '#87CEEB', backgroundColor: 'rgba(135, 206, 235, 0.1)' }}
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" /> <span className="md:hidden text-xs font-bold">Modifier</span>
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAnnouncement(item.id); }} 
                        className="flex-1 md:flex-none p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" /> <span className="md:hidden text-xs font-bold">Supprimer</span>
                      </button>
                    </>
                  )}
              </div>
            </div>
           );
        })}
      </div>

      {/* --- MODAL DETAIL (VIEWING ITEM) --- */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingItem(null)}>
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingItem(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10">
                <X className="w-5 h-5 text-slate-500" />
              </button>
              
              <div className="p-6 md:p-8">
                 <div className="flex items-start gap-4 mb-6">
                    <UserAvatar user={users.find(u => u.id === viewingItem.authorId)} size="lg" />
                    <div className="flex-1">
                       <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{viewingItem.title}</h3>
                       
                       <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                              viewingItem.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : 
                              viewingItem.urgency === 'INFO' ? 'bg-sky-50 text-sky-600 border-sky-200' : 
                              'bg-orange-50 text-orange-600 border-orange-200'
                          }`}>
                            {viewingItem.urgency}
                          </span>
                          <span className="text-slate-500 font-medium text-sm flex items-center gap-1">
                            {users.find(u => u.id === viewingItem.authorId)?.name}
                          </span>
                          <span className="text-slate-400 font-medium text-sm flex items-center gap-1">
                            • <Clock className="w-3 h-3" /> {format(new Date(viewingItem.date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </span>
                       </div>

                       {viewingItem.durationHours && (
                         <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1">
                            <Timer className="w-3 h-3"/> Expire après {viewingItem.durationHours}h
                         </p>
                       )}
                    </div>
                 </div>
                 
                 <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg whitespace-pre-wrap">
                    {viewingItem.content}
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button onClick={() => handleCopy(viewingItem)} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2">
                        <Copy className="w-4 h-4"/> Copier
                    </button>
                    <button onClick={() => setViewingItem(null)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition w-full md:w-auto">Fermer</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL CONFIRMATION PARTAGE --- */}
      {shareConfirmation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[170] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirmer le partage</h3>
              <p className="text-slate-500 mb-6">
                Voulez-vous envoyer l'annonce <strong>"{shareConfirmation.title}"</strong> par email à tous les membres de la classe ?
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setShareConfirmation(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
                 <button onClick={handleConfirmShare} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20">Envoyer</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL CREATION/EDITION --- */}
      {isModalOpen && canCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-wide">
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Titre</label>
                    <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition text-slate-800 dark:text-white" placeholder="Ex: Sortie pédagogique..." />
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase">Contenu</label>
                       <div className="flex gap-2">
                        <button type="button" onClick={handleCorrection} disabled={isCorrecting || !content} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50">
                            {isCorrecting ? <span className="animate-spin">⏳</span> : <Wand2 className="w-3 h-3" />} Corriger l'orthographe
                        </button>
                        <button type="button" onClick={handleGenerateAI} disabled={isGenerating || !title} className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50">
                            {isGenerating ? <span className="animate-spin">✨</span> : <Sparkles className="w-3 h-3" />} Générer avec IA
                        </button>
                       </div>
                    </div>
                    <textarea required value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base min-h-[150px] focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition leading-relaxed text-slate-800 dark:text-white" placeholder="Détails de l'annonce..." />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Urgence</label>
                        <div className="flex gap-3">
                        {[Urgency.INFO, Urgency.NORMAL, Urgency.URGENT].map(u => (
                            <button
                                key={u}
                                type="button"
                                onClick={() => setUrgency(u)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition capitalize ${
                                urgency === u 
                                ? u === Urgency.URGENT ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-500/20' : u === Urgency.INFO ? 'bg-sky-50 border-sky-200 text-sky-600 ring-2 ring-sky-500/20' : 'bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {u}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Durée (Heures) - Optionnel</label>
                        <div className="relative">
                            <Timer className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input 
                                type="number" 
                                min="1"
                                value={durationHours} 
                                onChange={e => setDurationHours(e.target.value === '' ? '' : Number(e.target.value))} 
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-base font-bold focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition text-slate-800 dark:text-white" 
                                placeholder="Illimité" 
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">L'annonce sera masquée automatiquement après ce délai.</p>
                    </div>
                 </div>

                 <div className="flex flex-col-reverse md:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
