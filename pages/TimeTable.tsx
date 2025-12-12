import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Role, TimeTable as TimeTableType } from '../types';
import { FileSpreadsheet, Upload, Trash2, Download, Eye, Plus, Calendar, AlertTriangle, Check, X, History } from 'lucide-react';
import { format, startOfWeek, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TimeTable: React.FC = () => {
  const { user, timeTables, addTimeTable, deleteTimeTable, users, addNotification } = useApp();
  
  // --- STATES ---
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Confirmation States
  const [pendingFile, setPendingFile] = useState<File | null>(null); // Pour confirmer l'upload
  const [deleteId, setDeleteId] = useState<string | null>(null); // Pour confirmer la suppression

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERMISSIONS ---
  const canManage = user?.role === Role.RESPONSIBLE;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTERING LOGIC ---
  const myTimeTables = isAdmin ? timeTables : timeTables.filter(t => t.classId === user?.classId);

  // Filtrer par semaine (Masquer les précédents)
  const displayedTimeTables = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Lundi = début semaine

    return myTimeTables.filter(t => {
      if (showHistory) return true;
      const itemDate = new Date(t.dateAdded);
      // On garde l'item s'il a été ajouté APRÈS ou PENDANT le début de la semaine en cours
      // (On suppose que dateAdded correspond à la date de validité de l'EDT)
      return isAfter(itemDate, startOfCurrentWeek) || itemDate.getTime() >= startOfCurrentWeek.getTime();
    }).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()); // Plus récents en premier
  }, [myTimeTables, showHistory]);

  // --- HANDLERS ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      prepareFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      prepareFileUpload(e.target.files[0]);
    }
  };

  const prepareFileUpload = (file: File) => {
    // Vérification extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      addNotification("Seuls les fichiers Excel (.xlsx, .xls) sont autorisés.", "ERROR");
      return;
    }
    // Ouvre la modale de confirmation
    setPendingFile(file);
  };

  const confirmUpload = () => {
    if (!pendingFile) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const title = pendingFile.name.replace(/\.[^/.]+$/, ""); // Retire l'extension
      
      addTimeTable({
        title: title,
        fileUrl: base64,
        fileName: pendingFile.name,
      });
      setIsUploading(false);
      setPendingFile(null); // Fermer modale
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(pendingFile);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTimeTable(deleteId);
      setDeleteId(null);
    }
  };

  const handleDownload = (item: TimeTableType) => {
    // Action directe (pas de confirmation nécessaire pour télécharger, sauf si demandé explicitement, mais UX lourde)
    // Pour respecter "confirmation avant action", on pourrait mettre une modale, mais c'est très intrusif pour un download.
    // Je laisse en direct pour fluidité, mais je mets une notif.
    addNotification(`Téléchargement de "${item.title}" lancé...`, "INFO");
    
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (item: TimeTableType) => {
    addNotification("Préparation de l'aperçu...", "INFO");
    handleDownload(item);
  };

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-0 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 p-2 rounded-2xl text-sky-600"><FileSpreadsheet className="w-8 h-8" /></span>
            Emploi du Temps
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Planning hebdomadaire des cours.</p>
        </div>

        <button 
           onClick={() => setShowHistory(!showHistory)}
           className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition border ${showHistory ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
        >
           <History className="w-4 h-4" /> {showHistory ? 'Masquer l\'historique' : 'Voir les semaines passées'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Zone de dépôt (Visible Responsable Only) */}
        {canManage && (
          <div className="lg:col-span-1">
            <div 
              className={`
                bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed p-8 text-center transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[300px]
                ${dragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-sky-400'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-20 h-20 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-6 text-sky-600">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Nouvel Emploi du Temps</h3>
              <p className="text-slate-500 text-sm mb-6">Glissez le fichier Excel de la semaine ici.</p>
              
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleChange}
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? 'Traitement...' : <><Plus className="w-5 h-5" /> Sélectionner</>}
              </button>
              <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-wide">Format : .xlsx</p>
            </div>
          </div>
        )}

        {/* Liste des fichiers */}
        <div className={canManage ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-4">
             {/* Titre de section */}
             <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  {showHistory ? 'Tous les fichiers' : 'Semaine en cours'}
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                  {displayedTimeTables.length} fichier(s)
                </span>
             </div>

             {displayedTimeTables.length === 0 ? (
               <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-slate-200 dark:border-slate-800">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium text-lg">Aucun emploi du temps pour cette semaine.</p>
                  {!showHistory && <p className="text-sm text-slate-400 mt-2">Cliquez sur "Voir les semaines passées" pour l'historique.</p>}
               </div>
             ) : (
               displayedTimeTables.map((item) => {
                 const author = users.find(u => u.id === item.authorId);
                 const isOld = isBefore(new Date(item.dateAdded), startOfWeek(new Date(), { weekStartsOn: 1 }));

                 return (
                   <div key={item.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition group flex flex-col md:flex-row items-start md:items-center gap-4 ${isOld ? 'border-amber-200 dark:border-amber-900/30 opacity-80' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${isOld ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{item.title}</h3>
                           {isOld && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Passé</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                             <Calendar className="w-3 h-3" /> Ajouté le {format(new Date(item.dateAdded), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                             Par {author?.name || 'Admin'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button 
                          onClick={() => handleDownload(item)}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" /> <span className="md:hidden lg:inline">Télécharger</span>
                        </button>
                        
                        <button 
                          onClick={() => handlePreview(item)}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 font-bold rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/30 transition flex items-center justify-center gap-2 text-sm border border-sky-100 dark:border-sky-800"
                        >
                          <Eye className="w-4 h-4" /> <span className="md:hidden lg:inline">Consulter</span>
                        </button>

                        {canManage && (
                          <button 
                            onClick={() => setDeleteId(item.id)}
                            className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL: UPLOAD --- */}
      {pendingFile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Confirmer l'envoi ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Vous êtes sur le point de publier ce fichier pour la classe :</p>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-mono text-sm mb-6 text-slate-700 dark:text-slate-300 break-all border border-slate-100 dark:border-slate-700">
                 {pendingFile.name}
              </div>
              <div className="flex gap-3">
                 <button onClick={() => { setPendingFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Annuler
                 </button>
                 <button onClick={confirmUpload} disabled={isUploading} className="flex-1 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2">
                    {isUploading ? 'Envoi...' : <><Check className="w-4 h-4" /> Publier</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: DELETE --- */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer ce fichier ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Cette action est irréversible. L'emploi du temps ne sera plus accessible aux élèves.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Annuler
                 </button>
                 <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20">
                    Supprimer
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};