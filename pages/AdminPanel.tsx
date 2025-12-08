import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User, ClassGroup } from '../types';
import { Users, Shield, Trash2, Plus, Pencil, Save, AlertTriangle, Download, Upload, School, UserCircle, X, Copy, Check, Mail, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const AdminPanel: React.FC = () => {
  const { 
    user, users, classes, schoolName, setSchoolName,
    addClass, updateClass, deleteClass, 
    addUser, importUsers, updateUser, deleteUser, 
    getCurrentClass, auditLogs, sentEmails, dismissNotification 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs' | 'emails'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  
  // School Name Edit State
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Class Form
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [classEmail, setClassEmail] = useState('');

  // User Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>(Role.STUDENT);
  const [userClassId, setUserClassId] = useState('');

  // Check permissions: Strict separation
  const isAdmin = user?.role === Role.ADMIN;
  // Responsible can view but NOT edit in this panel (Supervision limited to their own class usually, but AdminPanel is global)
  // According to prompt: Admin creates access. Responsible manages content. 
  // So AdminPanel is strictly for Admin actions.
  
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

  // --- CSV Import Logic ---

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

      // Skip header (i=1)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [name, email, roleStr, className] = line.split(',').map(s => s.trim());
        
        if (!name || !email) {
          errorCount++;
          continue;
        }

        // Validate Role
        let role = Role.STUDENT;
        if (roleStr?.toUpperCase() === 'ADMIN') role = Role.ADMIN;
        if (roleStr?.toUpperCase() === 'RESPONSIBLE') role = Role.RESPONSIBLE;
        
        // Find Class ID by Name
        let classId = undefined;
        if (className) {
          const foundClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
          if (foundClass) classId = foundClass.id;
        }

        usersToImport.push({
          name: name.replace(/"/g, ''), // Remove potential quotes
          email: email.replace(/"/g, ''),
          role,
          classId
        });
      }

      if (usersToImport.length > 0) {
        await importUsers(usersToImport);
        if (errorCount > 0) {
          alert(`Importé ${usersToImport.length} utilisateurs. ${errorCount} lignes ignorées (erreurs).`);
        }
      } else {
        alert("Aucun utilisateur valide trouvé dans le fichier.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] flex items-center gap-3 tracking-tight">
          {isAdmin ? <span className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl border-2 border-red-300 dark:border-red-700 shadow-[4px_4px_0_#F87171]"><Shield className="text-red-600 dark:text-red-300 w-6 h-6 md:w-8 md:h-8" /></span> : <span className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 shadow-[4px_4px_0_#818CF8]"><Users className="text-indigo-600 dark:text-indigo-300 w-6 h-6 md:w-8 md:h-8" /></span>}
          {isAdmin ? 'Panneau Admin' : 'Gestion des Étudiants'}
        </h1>
        <p className="text-[#5D4037] dark:text-[#A1887F] mt-3 font-bold text-base md:text-lg">
           {isAdmin 
             ? 'Gérez l\'ensemble de l\'écosystème scolaire.' 
             : `Vue d'ensemble de la classe.`}
        </p>
      </div>
      
      {/* School Name Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#2D1B0E] p-5 md:p-6 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.1)] border-2 border-[#D6C0B0] dark:border-[#431407] mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="text-center md:text-left">
              <h3 className="font-black text-[#2D1B0E] dark:text-[#fcece4] text-lg uppercase">Nom de l'établissement</h3>
              <p className="text-sm text-[#5D4037] dark:text-[#D6C0B0] font-medium">Ce nom s'affichera sur toute la plateforme.</p>
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              {isEditingSchoolName ? (
                <div className="flex w-full gap-2">
                  <input 
                    value={tempSchoolName}
                    onChange={(e) => setTempSchoolName(e.target.value)}
                    className="bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl px-4 py-2 font-bold text-[#2D1B0E] dark:text-[#fcece4] outline-none focus:border-[#EA580C] w-full"
                  />
                  <button onClick={saveSchoolName} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition">
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-[#FFF8F0] dark:bg-[#1a100a] px-6 py-3 rounded-xl border-2 border-[#D6C0B0] dark:border-[#5D4037]">
                   <span className="font-black text-xl text-[#2D1B0E] dark:text-[#fcece4]">{schoolName}</span>
                   <button onClick={() => { setTempSchoolName(schoolName); setIsEditingSchoolName(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                     <Pencil className="w-4 h-4" />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-4 mb-8 border-b-2 border-[#D6C0B0] dark:border-[#431407] overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 md:px-6 font-black transition whitespace-nowrap text-base md:text-lg ${activeTab === 'users' ? 'text-indigo-800 dark:text-indigo-400 border-b-4 border-indigo-800 dark:border-indigo-400' : 'text-[#8D6E63] dark:text-[#A1887F] hover:text-[#5D4037] dark:hover:text-[#D6C0B0]'}`}
          >
            Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`pb-3 px-4 md:px-6 font-black transition whitespace-nowrap text-base md:text-lg ${activeTab === 'classes' ? 'text-indigo-800 dark:text-indigo-400 border-b-4 border-indigo-800 dark:border-indigo-400' : 'text-[#8D6E63] dark:text-[#A1887F] hover:text-[#5D4037] dark:hover:text-[#D6C0B0]'}`}
          >
            Classes
          </button>
          <button 
            onClick={() => setActiveTab('emails')}
            className={`pb-3 px-4 md:px-6 font-black transition whitespace-nowrap text-base md:text-lg flex items-center gap-2 ${activeTab === 'emails' ? 'text-indigo-800 dark:text-indigo-400 border-b-4 border-indigo-800 dark:border-indigo-400' : 'text-[#8D6E63] dark:text-[#A1887F] hover:text-[#5D4037] dark:hover:text-[#D6C0B0]'}`}
          >
            <Mail className="w-4 h-4" /> Emails
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-4 md:px-6 font-black transition whitespace-nowrap text-base md:text-lg flex items-center gap-2 ${activeTab === 'logs' ? 'text-indigo-800 dark:text-indigo-400 border-b-4 border-indigo-800 dark:border-indigo-400' : 'text-[#8D6E63] dark:text-[#A1887F] hover:text-[#5D4037] dark:hover:text-[#D6C0B0]'}`}
          >
            <Shield className="w-4 h-4" /> Journal
          </button>
        </div>
      )}

      {/* Buttons Actions (ADMIN ONLY) */}
      {activeTab !== 'logs' && activeTab !== 'emails' && isAdmin && (
        <div className="flex flex-col md:flex-row flex-wrap gap-3 justify-end mb-6">
          {activeTab === 'users' && (
            <>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <button onClick={handleDownloadTemplate} className="flex items-center justify-center gap-2 bg-white dark:bg-[#2D1B0E] text-indigo-700 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-800 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition active:scale-95">
                <Download className="w-5 h-5" /> <span className="inline">Modèle CSV</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-700 px-4 py-3 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition active:scale-95">
                <Upload className="w-5 h-5" /> Importer CSV
              </button>
            </>
          )}
          <button onClick={openCreate} className="btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wide">
            <Plus className="w-5 h-5" /> 
            <span className="inline">
              {activeTab === 'classes' ? 'Ajouter Classe' : 'Ajouter Compte'}
            </span>
          </button>
        </div>
      )}

      {/* --- LOGS TAB --- */}
      {activeTab === 'logs' && isAdmin && (
        <div className="bg-white dark:bg-[#2D1B0E] rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-[#FFF8F0] dark:bg-[#1a100a] text-[#5D4037] dark:text-[#A1887F] text-xs uppercase font-black tracking-wider border-b-2 border-[#D6C0B0] dark:border-[#431407]">
                 <tr>
                    <th className="p-4 md:p-6">Heure</th>
                    <th className="p-4 md:p-6">Type</th>
                    <th className="p-4 md:p-6">Auteur</th>
                    <th className="p-4 md:p-6">Action</th>
                    <th className="p-4 md:p-6">Détails</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#D6C0B0] dark:divide-[#431407]">
                 {auditLogs.length === 0 && (
                   <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">Aucune activité enregistrée.</td></tr>
                 )}
                 {auditLogs.map((log) => (
                   <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#3E2723] transition text-sm">
                      <td className="p-4 md:p-6 font-mono text-[#5D4037] dark:text-[#D6C0B0] font-bold whitespace-nowrap">
                        {format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}
                      </td>
                      <td className="p-4 md:p-6">
                        {log.severity === 'CRITICAL' && <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-black"><AlertTriangle className="w-4 h-4"/> CRITIQUE</span>}
                        {log.severity === 'WARNING' && <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">ATTENTION</span>}
                        {log.severity === 'INFO' && <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">INFO</span>}
                      </td>
                      <td className="p-4 md:p-6 font-bold text-[#2D1B0E] dark:text-[#fcece4]">
                         {log.author} <span className="text-xs font-normal text-slate-400">({log.role})</span>
                      </td>
                      <td className="p-4 md:p-6 font-black text-[#4B3621] dark:text-[#A1887F] uppercase tracking-wide text-xs">
                         {log.action}
                      </td>
                      <td className="p-4 md:p-6 text-[#5D4037] dark:text-[#D6C0B0] font-medium max-w-[200px] truncate">
                         {log.details}
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EMAILS TAB (SENT HISTORY) --- */}
      {activeTab === 'emails' && isAdmin && (
        <div className="bg-white dark:bg-[#2D1B0E] rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-[#FFF8F0] dark:bg-[#1a100a] text-[#5D4037] dark:text-[#A1887F] text-xs uppercase font-black tracking-wider border-b-2 border-[#D6C0B0] dark:border-[#431407]">
                 <tr>
                    <th className="p-4 md:p-6">Date</th>
                    <th className="p-4 md:p-6">Type</th>
                    <th className="p-4 md:p-6">Envoyé par</th>
                    <th className="p-4 md:p-6">Destinataire</th>
                    <th className="p-4 md:p-6">Sujet</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#D6C0B0] dark:divide-[#431407]">
                 {sentEmails.length === 0 && (
                   <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">Aucun email envoyé pour le moment.</td></tr>
                 )}
                 {sentEmails.map((email) => (
                   <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-[#3E2723] transition text-sm">
                      <td className="p-4 md:p-6 font-mono text-[#5D4037] dark:text-[#D6C0B0] font-bold whitespace-nowrap flex items-center gap-2">
                        <Calendar className="w-3 h-3 opacity-50"/> {format(new Date(email.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </td>
                      <td className="p-4 md:p-6">
                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border shrink-0 ${
                            email.resource_type === 'ANNOUNCEMENT' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            email.resource_type === 'MEET' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            email.resource_type === 'EXAM' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-purple-100 text-purple-800 border-purple-200'
                          }`}>
                          {email.resource_type}
                        </span>
                      </td>
                      <td className="p-4 md:p-6 font-bold text-[#2D1B0E] dark:text-[#fcece4]">
                         {email.sender_name}
                      </td>
                      <td className="p-4 md:p-6 font-medium text-[#5D4037] dark:text-[#D6C0B0]">
                         {email.recipient_email || 'Inconnu'}
                      </td>
                      <td className="p-4 md:p-6 text-[#5D4037] dark:text-[#D6C0B0] font-bold truncate max-w-[250px]">
                         {email.subject}
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Classes List (Admin Only) */}
      {activeTab === 'classes' && isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white dark:bg-[#2D1B0E] p-6 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.1)] border-2 border-[#D6C0B0] dark:border-[#431407] flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition">
              <div>
                   <h3 className="text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{cls.name}</h3>
                   <p className="text-sm text-[#5D4037] dark:text-[#D6C0B0] mt-2 font-bold">{cls.description}</p>
                   {cls.email && (
                     <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-black flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded">
                        <Mail className="w-3 h-3" /> {cls.email}
                     </p>
                   )}
                   <div className="mt-4 text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 inline-block px-3 py-1.5 rounded uppercase tracking-wider">
                      {users.filter(u => u.classId === cls.id).length} membres
                   </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t-2 border-slate-100 dark:border-slate-800 pt-4">
                 <button onClick={() => openEditClass(cls)} className="text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition border border-indigo-100 dark:border-indigo-800">
                   <Pencil className="w-5 h-5"/>
                 </button>
                 <button onClick={() => deleteClass(cls.id)} className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-100 dark:border-red-800">
                   <Trash2 className="w-5 h-5"/>
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users List - Desktop Table */}
      {activeTab === 'users' && (
        <>
          <div className="hidden md:block bg-white dark:bg-[#2D1B0E] rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FFF8F0] dark:bg-[#1a100a] text-[#5D4037] dark:text-[#A1887F] text-xs uppercase font-black tracking-wider border-b-2 border-[#D6C0B0] dark:border-[#431407]">
                <tr>
                  <th className="p-6 w-16">Avatar</th>
                  <th className="p-6">Nom</th>
                  <th className="p-6">Email</th>
                  <th className="p-6">Rôle</th>
                  <th className="p-6">Classe</th>
                  {isAdmin && <th className="p-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6C0B0] dark:divide-[#431407]">
                {filteredUsers.map(u => {
                  const uClass = classes.find(c => c.id === u.classId);
                  const isCopied = copiedUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-orange-50 dark:hover:bg-[#3E2723] transition">
                      <td className="p-6">
                        <UserAvatar user={u} size="sm" />
                      </td>
                      <td className="p-6 font-bold text-[#2D1B0E] dark:text-[#fcece4]">{u.name}</td>
                      <td className="p-6 text-[#5D4037] dark:text-[#D6C0B0] font-medium">{u.email}</td>
                      <td className="p-6">
                        <span className={`text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider border ${
                          u.role === Role.ADMIN ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' :
                          u.role === Role.RESPONSIBLE ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 text-[#5D4037] dark:text-[#D6C0B0] font-bold">{uClass?.name || '-'}</td>
                      {isAdmin && (
                        <td className="p-6 text-right flex justify-end gap-2">
                           <button 
                             onClick={() => copyUserInfo(u)} 
                             className={`p-2.5 rounded-lg transition border border-transparent ${isCopied ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3E2723] hover:text-slate-600 dark:hover:text-slate-300'}`}
                             title="Copier les infos"
                           >
                             {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                           </button>
                           <button onClick={() => openEditUser(u)} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-2.5 rounded-lg transition border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"><Pencil className="w-4 h-4"/></button>
                           <button onClick={() => deleteUser(u.id)} className="text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 p-2.5 rounded-lg transition border border-transparent hover:border-red-100 dark:hover:border-red-800"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Users List - Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredUsers.map(u => {
              const uClass = classes.find(c => c.id === u.classId);
              const isCopied = copiedUserId === u.id;
              
              return (
                <div key={u.id} className="bg-white dark:bg-[#2D1B0E] p-5 rounded-2xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="md" />
                      <div className="overflow-hidden">
                        <h3 className="font-black text-[#2D1B0E] dark:text-[#fcece4] text-lg truncate">{u.name}</h3>
                        <p className="text-sm text-[#5D4037] dark:text-[#D6C0B0] font-medium truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border shrink-0 ${
                        u.role === Role.ADMIN ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                        u.role === Role.RESPONSIBLE ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}>
                      {u.role === Role.ADMIN ? 'Admin' : u.role === Role.RESPONSIBLE ? 'Resp.' : 'Élève'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-[#5D4037] dark:text-[#D6C0B0] mb-5 flex items-center gap-2 font-bold bg-[#FFF8F0] dark:bg-[#1a100a] p-3 rounded-lg border border-[#D6C0B0] dark:border-[#5D4037]">
                    <School className="w-4 h-4 text-[#EA580C]" />
                    {uClass?.name || 'Aucune classe'}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => copyUserInfo(u)} 
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition border ${isCopied ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-[#3E2723] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#4E342E]'}`}
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEditUser(u)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition border border-indigo-200 dark:border-indigo-800 active:scale-95">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl font-black text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-200 dark:border-red-800 active:scale-95">
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

      {/* Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="font-black text-lg md:text-xl uppercase tracking-wide">
                {activeTab === 'classes'
                   ? (editingId ? 'Modifier Classe' : 'Nouvelle Classe') 
                   : (editingId ? 'Modifier Compte' : 'Nouveau Compte')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              {activeTab === 'classes' ? (
                <form onSubmit={handleCreateClass} className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Nom de la classe</label>
                    <input required placeholder="ex: DUT Informatique" value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Description</label>
                    <input placeholder="ex: Promotion 2026" value={classDesc} onChange={e => setClassDesc(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                  </div>
                  
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <label className="block text-sm font-black text-indigo-900 dark:text-indigo-300 mb-2 uppercase flex items-center gap-2">
                       <Mail className="w-4 h-4" /> Email de la classe (Mailing List)
                    </label>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-3 font-medium">
                       Si renseigné, le bouton "Partager / Envoyer" utilisera cette adresse pour envoyer les annonces et ressources à toute la classe en un clic.
                    </p>
                    <input 
                      type="email" 
                      placeholder="ex: dut2-promo26@ecole.com" 
                      value={classEmail} 
                      onChange={e => setClassEmail(e.target.value)} 
                      className="w-full bg-white dark:bg-[#0f0906] border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-base focus:border-indigo-500 outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" 
                    />
                  </div>
                  
                  <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
                      {editingId ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div>
                     <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Nom Complet</label>
                     <input required placeholder="ex: Jean Dupont" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                  </div>
                  <div>
                     <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Adresse Email</label>
                     <input required type="email" placeholder="email@ecole.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Rôle</label>
                    <div className="relative">
                      <select value={userRole} onChange={e => setUserRole(e.target.value as Role)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4] appearance-none">
                        <option value={Role.ADMIN}>Administrateur</option>
                        <option value={Role.RESPONSIBLE}>Responsable</option>
                        <option value={Role.STUDENT}>Étudiant</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#5D4037] dark:text-[#D6C0B0]">▼</div>
                    </div>
                  </div>

                  {userRole !== Role.ADMIN && (
                    <div>
                      <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Classe</label>
                       <div className="relative">
                         <select value={userClassId} onChange={e => setUserClassId(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-4 text-base focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4] appearance-none">
                           <option value="">Sélectionner une classe</option>
                           {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#5D4037] dark:text-[#D6C0B0]">▼</div>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
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