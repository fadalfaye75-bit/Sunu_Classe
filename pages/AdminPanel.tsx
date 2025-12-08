
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User, ClassGroup } from '../types';
import { Users, School, Trash2, Plus, Shield, Pencil, Save, AlertTriangle, FileText, CheckCircle, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const AdminPanel: React.FC = () => {
  const { 
    user, users, classes, schoolName, setSchoolName,
    addClass, updateClass, deleteClass, 
    addUser, importUsers, updateUser, deleteUser, 
    getCurrentClass, auditLogs 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // School Name Edit State
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Class Form
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');

  // User Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>(Role.STUDENT);
  const [userClassId, setUserClassId] = useState('');

  // Check permissions
  const currentClass = getCurrentClass();
  const isAdmin = user?.role === Role.ADMIN;
  
  const filteredUsers = isAdmin 
    ? users 
    : users.filter(u => u.classId === user?.classId && u.role === Role.STUDENT);

  const saveSchoolName = () => {
    setSchoolName(tempSchoolName);
    setIsEditingSchoolName(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setClassName('');
    setClassDesc('');
    setUserName('');
    setUserEmail('');
    // Par défaut, si admin => étudiant, si responsable => étudiant forcé
    setUserRole(Role.STUDENT);
    setUserClassId(isAdmin ? '' : user?.classId || '');
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

  const openEditClass = (c: ClassGroup) => {
    setEditingId(c.id);
    setClassName(c.name);
    setClassDesc(c.description || '');
    setIsModalOpen(true);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClass(editingId, { name: className, description: classDesc });
    } else {
      addClass(className, classDesc);
    }
    setIsModalOpen(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        name: userName,
        email: userEmail,
        role: userRole,
        classId: isAdmin ? userClassId : user?.classId // Responsable can only add to their class
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

        // Security check for Responsible (can only import to own class)
        if (!isAdmin) {
          classId = user?.classId;
          role = Role.STUDENT; // Force student role if imported by responsible
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
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-12">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#2D1B0E] flex items-center gap-3 tracking-tight">
          {isAdmin ? <span className="bg-red-100 p-2 rounded-xl border-2 border-red-300 shadow-[4px_4px_0_#F87171]"><Shield className="text-red-600 w-8 h-8" /></span> : <span className="bg-indigo-100 p-2 rounded-xl border-2 border-indigo-300 shadow-[4px_4px_0_#818CF8]"><Users className="text-indigo-600 w-8 h-8" /></span>}
          {isAdmin ? 'Panneau Admin' : 'Gestion des Étudiants'}
        </h1>
        <p className="text-[#5D4037] mt-3 font-bold text-lg">
           {isAdmin 
             ? 'Gérez l\'ensemble de l\'écosystème scolaire.' 
             : `Gérez les dossiers étudiants de la classe ${currentClass?.name}.`}
        </p>
      </div>
      
      {/* School Name Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.1)] border-2 border-[#D6C0B0] mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
              <h3 className="font-black text-[#2D1B0E] text-lg uppercase">Nom de l'établissement</h3>
              <p className="text-sm text-[#5D4037] font-medium">Ce nom s'affichera sur toute la plateforme.</p>
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              {isEditingSchoolName ? (
                <>
                  <input 
                    value={tempSchoolName}
                    onChange={(e) => setTempSchoolName(e.target.value)}
                    className="bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl px-4 py-2 font-bold text-[#2D1B0E] outline-none focus:border-[#EA580C]"
                  />
                  <button onClick={saveSchoolName} className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-200 hover:bg-emerald-200 transition">
                    <Save className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 bg-[#FFF8F0] px-6 py-3 rounded-xl border-2 border-[#D6C0B0]">
                   <span className="font-black text-xl text-[#2D1B0E]">{schoolName}</span>
                   <button onClick={() => { setTempSchoolName(schoolName); setIsEditingSchoolName(true); }} className="text-indigo-600 hover:text-indigo-800">
                     <Pencil className="w-4 h-4" />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-4 mb-8 border-b-2 border-[#D6C0B0] overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-6 font-black transition whitespace-nowrap text-lg ${activeTab === 'users' ? 'text-indigo-800 border-b-4 border-indigo-800' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
          >
            Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`pb-4 px-6 font-black transition whitespace-nowrap text-lg ${activeTab === 'classes' ? 'text-indigo-800 border-b-4 border-indigo-800' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
          >
            Classes
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`pb-4 px-6 font-black transition whitespace-nowrap text-lg flex items-center gap-2 ${activeTab === 'logs' ? 'text-indigo-800 border-b-4 border-indigo-800' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
          >
            <Shield className="w-4 h-4" /> Journal de Sécurité
          </button>
        </div>
      )}

      {/* Buttons Actions */}
      {activeTab !== 'logs' && (
        <div className="flex flex-wrap gap-3 justify-end mb-6">
          {activeTab === 'users' && (
            <>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white text-indigo-700 border-2 border-indigo-100 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition">
                <Download className="w-5 h-5" /> <span className="hidden md:inline">Modèle CSV</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 border-2 border-indigo-200 px-4 py-3 rounded-xl font-bold hover:bg-indigo-200 transition">
                <Upload className="w-5 h-5" /> Importer CSV
              </button>
            </>
          )}
          <button onClick={openCreate} className="btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center gap-2 uppercase tracking-wide">
            <Plus className="w-5 h-5" /> 
            <span className="hidden md:inline">
              {activeTab === 'classes' && isAdmin 
                ? 'Ajouter une Classe' 
                : (isAdmin ? 'Ajouter un Compte' : 'Ajouter un Étudiant')}
            </span>
            <span className="md:hidden">Ajouter</span>
          </button>
        </div>
      )}

      {/* --- LOGS TAB --- */}
      {activeTab === 'logs' && isAdmin && (
        <div className="bg-white rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-[#D6C0B0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FFF8F0] text-[#5D4037] text-xs uppercase font-black tracking-wider border-b-2 border-[#D6C0B0]">
                 <tr>
                    <th className="p-6">Heure</th>
                    <th className="p-6">Type</th>
                    <th className="p-6">Auteur</th>
                    <th className="p-6">Action</th>
                    <th className="p-6">Détails</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#D6C0B0]">
                 {auditLogs.length === 0 && (
                   <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">Aucune activité enregistrée.</td></tr>
                 )}
                 {auditLogs.map((log) => (
                   <tr key={log.id} className="hover:bg-slate-50 transition text-sm">
                      <td className="p-6 font-mono text-[#5D4037] font-bold">
                        {format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}
                      </td>
                      <td className="p-6">
                        {log.severity === 'CRITICAL' && <span className="flex items-center gap-1 text-red-700 font-black"><AlertTriangle className="w-4 h-4"/> CRITIQUE</span>}
                        {log.severity === 'WARNING' && <span className="flex items-center gap-1 text-orange-600 font-bold">ATTENTION</span>}
                        {log.severity === 'INFO' && <span className="flex items-center gap-1 text-indigo-600 font-bold">INFO</span>}
                      </td>
                      <td className="p-6 font-bold text-[#2D1B0E]">
                         {log.author} <span className="text-xs font-normal text-slate-400">({log.role})</span>
                      </td>
                      <td className="p-6 font-black text-[#4B3621] uppercase tracking-wide text-xs">
                         {log.action}
                      </td>
                      <td className="p-6 text-[#5D4037] font-medium">
                         {log.details}
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
            <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.1)] border-2 border-[#D6C0B0] flex flex-col justify-between hover:border-indigo-400 transition">
              <div>
                   <h3 className="text-2xl font-black text-[#2D1B0E]">{cls.name}</h3>
                   <p className="text-sm text-[#5D4037] mt-2 font-bold">{cls.description}</p>
                   <div className="mt-4 text-xs font-black text-indigo-700 bg-indigo-100 inline-block px-3 py-1.5 rounded uppercase tracking-wider">
                      {users.filter(u => u.classId === cls.id).length} membres
                   </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t-2 border-slate-100 pt-4">
                 <button onClick={() => openEditClass(cls)} className="text-indigo-700 bg-indigo-50 p-3 rounded-lg hover:bg-indigo-100 transition border border-indigo-100">
                   <Pencil className="w-5 h-5"/>
                 </button>
                 <button onClick={() => deleteClass(cls.id)} className="text-red-700 bg-red-50 p-3 rounded-lg hover:bg-red-100 transition border border-red-100">
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
          <div className="hidden md:block bg-white rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-[#D6C0B0] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FFF8F0] text-[#5D4037] text-xs uppercase font-black tracking-wider border-b-2 border-[#D6C0B0]">
                <tr>
                  <th className="p-6">Nom</th>
                  <th className="p-6">Email</th>
                  <th className="p-6">Rôle</th>
                  <th className="p-6">Classe</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6C0B0]">
                {filteredUsers.map(u => {
                  const uClass = classes.find(c => c.id === u.classId);
                  return (
                    <tr key={u.id} className="hover:bg-orange-50 transition">
                      <td className="p-6 font-bold text-[#2D1B0E]">{u.name}</td>
                      <td className="p-6 text-[#5D4037] font-medium">{u.email}</td>
                      <td className="p-6">
                        <span className={`text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider border ${
                          u.role === Role.ADMIN ? 'bg-red-100 text-red-800 border-red-200' :
                          u.role === Role.RESPONSIBLE ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 text-[#5D4037] font-bold">{uClass?.name || '-'}</td>
                      <td className="p-6 text-right flex justify-end gap-2">
                         <button onClick={() => openEditUser(u)} className="text-indigo-600 hover:bg-indigo-50 p-2.5 rounded-lg transition border border-transparent hover:border-indigo-100"><Pencil className="w-4 h-4"/></button>
                         <button onClick={() => deleteUser(u.id)} className="text-slate-400 hover:bg-red-50 hover:text-red-600 p-2.5 rounded-lg transition border border-transparent hover:border-red-100"><Trash2 className="w-4 h-4"/></button>
                      </td>
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
              return (
                <div key={u.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-[#D6C0B0]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-[#2D1B0E] text-lg">{u.name}</h3>
                      <p className="text-sm text-[#5D4037] font-medium">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border ${
                        u.role === Role.ADMIN ? 'bg-red-100 text-red-700 border-red-200' :
                        u.role === Role.RESPONSIBLE ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                      {u.role === Role.ADMIN ? 'Admin' : u.role === Role.RESPONSIBLE ? 'Resp.' : 'Élève'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-[#5D4037] mb-5 flex items-center gap-2 font-bold bg-[#FFF8F0] p-3 rounded-lg border border-[#D6C0B0]">
                    <School className="w-4 h-4 text-[#EA580C]" />
                    {uClass?.name || 'Aucune classe'}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => openEditUser(u)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-black text-sm hover:bg-indigo-100 transition border border-indigo-200">
                      <Pencil className="w-4 h-4" /> Modifier
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl font-black text-sm hover:bg-red-100 transition border border-red-200">
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden border-4 border-[#7C2D12]">
            <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center pattern-bogolan text-white">
              <h3 className="font-black text-xl uppercase tracking-wide">
                {activeTab === 'classes' && isAdmin
                   ? (editingId ? 'Modifier Classe' : 'Nouvelle Classe') 
                   : (editingId 
                      ? (isAdmin ? 'Modifier Utilisateur' : 'Modifier Étudiant') 
                      : (isAdmin ? 'Nouveau Compte' : 'Ajouter Étudiant'))}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 bg-white">
              {activeTab === 'classes' && isAdmin ? (
                <form onSubmit={handleCreateClass} className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Nom de la classe</label>
                    <input required placeholder="ex: DUT Informatique" value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Description</label>
                    <input placeholder="ex: Promotion 2025" value={classDesc} onChange={e => setClassDesc(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                  </div>
                  
                  <div className="flex flex-col-reverse md:flex-row gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] bg-[#EFEBE9] hover:bg-[#D7CCC8] transition border-2 border-transparent">
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
                     <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Nom Complet</label>
                     <input required placeholder="ex: Jean Dupont" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                  </div>
                  <div>
                     <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Adresse Email</label>
                     <input required type="email" placeholder="email@ecole.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E]" />
                  </div>
                  
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Rôle</label>
                      <div className="relative">
                        <select value={userRole} onChange={e => setUserRole(e.target.value as Role)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E] appearance-none">
                          <option value={Role.ADMIN}>Administrateur</option>
                          <option value={Role.RESPONSIBLE}>Responsable</option>
                          <option value={Role.STUDENT}>Étudiant</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#5D4037]">▼</div>
                      </div>
                    </div>
                  )}

                  {isAdmin && userRole !== Role.ADMIN && (
                    <div>
                      <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase">Classe</label>
                       <div className="relative">
                         <select value={userClassId} onChange={e => setUserClassId(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E] appearance-none">
                           <option value="">Sélectionner une classe</option>
                           {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#5D4037]">▼</div>
                       </div>
                    </div>
                  )}
                  
                  {!isAdmin && (
                     <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-700 text-sm font-bold">
                        Ce compte "Étudiant" sera automatiquement ajouté à votre classe : {currentClass?.name}.
                     </div>
                  )}

                  <div className="flex flex-col-reverse md:flex-row gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] bg-[#EFEBE9] hover:bg-[#D7CCC8] transition border-2 border-transparent">
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
