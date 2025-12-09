import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User, ClassGroup } from '../types';
import { Users, Shield, Trash2, Plus, Pencil, Save, AlertTriangle, Download, Upload, School, UserCircle, X, Copy, Check, Mail, Calendar, Info, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const AdminPanel: React.FC = () => {
  const { 
    user, users, classes, schoolName, setSchoolName,
    addClass, updateClass, deleteClass, 
    addUser, importUsers, updateUser, deleteUser, 
    getCurrentClass, auditLogs, sentEmails, dismissNotification, addNotification,
    resendEmail
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs' | 'emails'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [classEmail, setClassEmail] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>(Role.STUDENT);
  const [userClassId, setUserClassId] = useState('');

  const isAdmin = user?.role === Role.ADMIN;
  
  const filteredUsers = isAdmin 
    ? users 
    : users.filter(u => u.classId === user?.classId);

  const saveSchoolName = () => {
    setSchoolName(tempSchoolName);
    setIsEditingSchoolName(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setClassName('');
    setClassDesc('');
    setClassEmail('');
    setUserName('');
    setUserEmail('');
    setUserRole(Role.STUDENT);
    setUserClassId('');
    setIsModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserClassId(u.classId || '');
    setIsModalOpen(true);
  };

  const copyUserInfo = (u: User) => {
    const uClass = classes.find(c => c.id === u.classId)?.name || 'Sans classe';
    const text = `📋 FICHE UTILISATEUR\n------------------\nNom : ${u.name}\nEmail : ${u.email}\nRôle : ${u.role}\nClasse : ${uClass}\n------------------\n${schoolName}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUserId(u.id);
      setTimeout(() => setCopiedUserId(null), 2000);
      addNotification("Infos copiées", "INFO");
    });
  };

  const openEditClass = (c: ClassGroup) => {
    setEditingId(c.id);
    setClassName(c.name);
    setClassDesc(c.description || '');
    setClassEmail(c.email || '');
    setIsModalOpen(true);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClass(editingId, { name: className, description: classDesc, email: classEmail });
    } else {
      addClass(className, classDesc, classEmail);
    }
    setIsModalOpen(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        name: userName,
        email: userEmail,
        role: userRole,
        classId: userClassId
    };
    if (editingId) {
        updateUser(editingId, payload);
    } else {
        addUser(payload);
    }
    setIsModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const headers = "Nom,Email,Role,NomClasse";
    const example = "Jean Dupont,jean@example.com,STUDENT,DUT Informatique";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_utilisateurs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const usersToImport: Omit<User, 'id'>[] = [];
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, email, roleStr, className] = line.split(',').map(s => s.trim());
        if (!name || !email) { errorCount++; continue; }

        let role = Role.STUDENT;
        if (roleStr?.toUpperCase() === 'ADMIN') role = Role.ADMIN;
        if (roleStr?.toUpperCase() === 'RESPONSIBLE') role = Role.RESPONSIBLE;
        
        let classId = undefined;
        if (className) {
          const foundClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
          if (foundClass) classId = foundClass.id;
        }

        usersToImport.push({
          name: name.replace(/"/g, ''),
          email: email.replace(/"/g, ''),
          role,
          classId
        });
      }

      if (usersToImport.length > 0) {
        await importUsers(usersToImport);
        if (errorCount > 0) addNotification(`Importé ${usersToImport.length}. ${errorCount} erreurs.`, "WARNING");
      } else {
        addNotification("Aucun utilisateur valide trouvé.", "ERROR");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
          {isAdmin ? <span className="bg-red-50 dark:bg-red-900/30 p-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600"><Shield className="w-8 h-8" /></span> : <span className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600"><Users className="w-8 h-8" /></span>}
          {isAdmin ? 'Panneau Admin' : 'Gestion des Étudiants'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg">
           {isAdmin ? 'Gérez l\'ensemble de l\'écosystème scolaire.' : `Vue d'ensemble de la classe.`}
        </p>
      </div>
      
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="text-center md:text-left">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Nom de l'établissement</h3>
              <p className="text-sm text-slate-500 font-medium">Ce nom s'affichera sur toute la plateforme.</p>
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              {isEditingSchoolName ? (
                <div className="flex w-full gap-2">
                  <input 
                    value={tempSchoolName}
                    onChange={(e) => setTempSchoolName(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 font-medium text-slate-800 dark:text-white outline-none focus:border-sky-500 w-full"
                  />
                  <button onClick={saveSchoolName} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition">
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-slate-50 dark:bg-slate-950 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
                   <span className="font-bold text-xl text-slate-800 dark:text-white">{schoolName}</span>
                   <button onClick={() => { setTempSchoolName(schoolName); setIsEditingSchoolName(true); }} className="text-sky-600 hover:text-sky-700">
                     <Pencil className="w-4 h-4" />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 font-bold transition whitespace-nowrap text-base ${activeTab === 'users' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`pb-3 px-4 font-bold transition whitespace-nowrap text-base ${activeTab === 'classes' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Classes
          </button>
          <button 
            onClick={() => setActiveTab('emails')}
            className={`pb-3 px-4 font-bold transition whitespace-nowrap text-base flex items-center gap-2 ${activeTab === 'emails' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Mail className="w-4 h-4" /> Emails
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-4 font-bold transition whitespace-nowrap text-base flex items-center gap-2 ${activeTab === 'logs' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Shield className="w-4 h-4" /> Journal
          </button>
        </div>
      )}

      {activeTab !== 'logs' && activeTab !== 'emails' && isAdmin && (
        <div className="flex flex-col md:flex-row flex-wrap gap-3 justify-end mb-6">
          {activeTab === 'users' && (
            <>
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={handleDownloadTemplate} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 text-sm">
                <Download className="w-4 h-4" /> <span className="inline">Modèle CSV</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition active:scale-95 text-sm">
                <Upload className="w-4 h-4" /> Importer CSV
              </button>
            </>
          )}
          <button onClick={openCreate} className="btn-primary text-white px-5 py-2.5 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md text-sm uppercase tracking-wide">
            <Plus className="w-4 h-4" /> 
            <span className="inline">
              {activeTab === 'classes' ? 'Ajouter Classe' : 'Ajouter Compte'}
            </span>
          </button>
        </div>
      )}

      {/* --- LOGS TAB --- */}
      {activeTab === 'logs' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                 <tr>
                    <th className="p-4">Heure</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Auteur</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Détails</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {auditLogs.length === 0 && (
                   <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Aucune activité enregistrée.</td></tr>
                 )}
                 {auditLogs.map((log) => (
                   <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-sm">
                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}
                      </td>
                      <td className="p-4">
                        {log.severity === 'CRITICAL' && <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">CRITIQUE</span>}
                        {log.severity === 'WARNING' && <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded">ATTENTION</span>}
                        {log.severity === 'INFO' && <span className="text-sky-600 font-bold text-xs bg-sky-50 px-2 py-1 rounded">INFO</span>}
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-white">
                         {log.author} <span className="text-xs font-normal text-slate-400">({log.role})</span>
                      </td>
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
                         {log.action}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                         {log.details}
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EMAILS TAB --- */}
      {activeTab === 'emails' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                 <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Envoyé par</th>
                    <th className="p-4">Destinataire</th>
                    <th className="p-4">Sujet</th>
                    <th className="p-4 text-right">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {sentEmails.length === 0 && (
                   <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium">Aucun email envoyé pour le moment.</td></tr>
                 )}
                 {sentEmails.map((email) => (
                   <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-sm">
                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                         {format(new Date(email.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border shrink-0 ${
                            email.resource_type === 'ANNOUNCEMENT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            email.resource_type === 'MEET' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            email.resource_type === 'EXAM' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                          {email.resource_type}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-white">
                         {email.sender_name}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                         {email.recipient_email || 'Inconnu'}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                         {email.subject}
                      </td>
                      <td className="p-4 text-right">
                         <button 
                           onClick={() => resendEmail(email)}
                           className="text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition flex items-center gap-1 ml-auto"
                           title="Renvoyer"
                         >
                           <RefreshCw className="w-4 h-4" /> <span className="font-bold hidden md:inline text-xs">Renvoyer</span>
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Classes List */}
      {activeTab === 'classes' && isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-sky-500 transition-all duration-300">
              <div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white">{cls.name}</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cls.description}</p>
                   {cls.email && (
                     <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 font-medium flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded">
                        <Mail className="w-3 h-3" /> {cls.email}
                     </p>
                   )}
                   <div className="mt-4 text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-900/30 inline-block px-3 py-1 rounded-full uppercase tracking-wide border border-sky-100 dark:border-sky-800">
                      {users.filter(u => u.classId === cls.id).length} membres
                   </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                 <button onClick={() => openEditClass(cls)} className="text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition">
                   <Pencil className="w-5 h-5"/>
                 </button>
                 <button onClick={() => deleteClass(cls.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition">
                   <Trash2 className="w-5 h-5"/>
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users List */}
      {activeTab === 'users' && (
        <>
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-6 w-16">Avatar</th>
                  <th className="p-6">Nom</th>
                  <th className="p-6">Email</th>
                  <th className="p-6">Rôle</th>
                  <th className="p-6">Classe</th>
                  {isAdmin && <th className="p-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(u => {
                  const uClass = classes.find(c => c.id === u.classId);
                  const isCopied = copiedUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-6">
                        <UserAvatar user={u} size="sm" />
                      </td>
                      <td className="p-6 font-bold text-slate-800 dark:text-white">{u.name}</td>
                      <td className="p-6 text-slate-500 dark:text-slate-400 font-medium">{u.email}</td>
                      <td className="p-6">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${
                          u.role === Role.ADMIN ? 'bg-red-50 text-red-700 border-red-200' :
                          u.role === Role.RESPONSIBLE ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 text-slate-600 dark:text-slate-300 font-medium">{uClass?.name || '-'}</td>
                      {isAdmin && (
                        <td className="p-6 text-right flex justify-end gap-2">
                           <button 
                             onClick={() => copyUserInfo(u)} 
                             className={`p-2 rounded-lg transition ${isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                             title="Copier"
                           >
                             {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                           </button>
                           <button onClick={() => openEditUser(u)} className="text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition"><Pencil className="w-4 h-4"/></button>
                           <button onClick={() => deleteUser(u.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {filteredUsers.map(u => {
              const uClass = classes.find(c => c.id === u.classId);
              const isCopied = copiedUserId === u.id;
              
              return (
                <div key={u.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="md" />
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate">{u.name}</h3>
                        <p className="text-sm text-slate-500 font-medium truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border shrink-0 ${
                        u.role === Role.ADMIN ? 'bg-red-50 text-red-700 border-red-200' :
                        u.role === Role.RESPONSIBLE ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                      {u.role === Role.ADMIN ? 'Admin' : u.role === Role.RESPONSIBLE ? 'Resp.' : 'Élève'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-600 dark:text-slate-300 mb-5 flex items-center gap-2 font-medium bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                    <School className="w-4 h-4 text-sky-500" />
                    {uClass?.name || 'Aucune classe'}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => copyUserInfo(u)} 
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition border ${isCopied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEditUser(u)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-sky-50 text-sky-600 rounded-lg font-bold text-sm border border-sky-200">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm border border-red-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-wide">
                {activeTab === 'classes' ? (editingId ? 'Modifier Classe' : 'Nouvelle Classe') : (editingId ? 'Modifier Compte' : 'Nouveau Compte')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition active:scale-90">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              {activeTab === 'classes' ? (
                <form onSubmit={handleCreateClass} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nom de la classe</label>
                    <input required placeholder="ex: DUT Informatique" value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Description</label>
                    <input placeholder="ex: Promotion 2026" value={classDesc} onChange={e => setClassDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                  
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase flex items-center gap-2">
                       <Mail className="w-4 h-4" /> Email Mailing List
                    </label>
                    <input 
                      type="email" 
                      placeholder="ex: dut2@ecole.com" 
                      value={classEmail} 
                      onChange={e => setClassEmail(e.target.value)} 
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 text-base focus:border-indigo-500 outline-none transition font-medium text-slate-800 dark:text-white" 
                    />
                  </div>
                  
                  <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-500/20 transition active:scale-95">
                      {editingId ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-5">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nom Complet</label>
                     <input required placeholder="ex: Jean Dupont" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Adresse Email</label>
                     <input required type="email" placeholder="email@ecole.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Rôle</label>
                    <div className="relative">
                      <select value={userRole} onChange={e => setUserRole(e.target.value as Role)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white appearance-none">
                        <option value={Role.ADMIN}>Administrateur</option>
                        <option value={Role.RESPONSIBLE}>Responsable</option>
                        <option value={Role.STUDENT}>Étudiant</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">▼</div>
                    </div>
                  </div>

                  {userRole !== Role.ADMIN && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Classe</label>
                       <div className="relative">
                         <select value={userClassId} onChange={e => setUserClassId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white appearance-none">
                           <option value="">Sélectionner une classe</option>
                           {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">▼</div>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-500/20 transition active:scale-95">
                      {editingId ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};