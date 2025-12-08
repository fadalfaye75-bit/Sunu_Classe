import React, { createContext, useContext, useState, PropsWithChildren, useMemo, useEffect } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, PollOption, SentEmail } from '../types';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { INITIAL_CLASSES, INITIAL_USERS, INITIAL_ANNOUNCEMENTS, INITIAL_MEETS, INITIAL_EXAMS, INITIAL_POLLS } from '../constants';

interface AppContextType {
  user: User | null;
  users: User[]; 
  classes: ClassGroup[];
  schoolName: string;
  setSchoolName: (name: string) => void;
  
  // Data
  announcements: Announcement[];
  meets: MeetSession[];
  exams: Exam[];
  polls: Poll[];
  sentEmails: SentEmail[];
  
  // Security & UX
  auditLogs: AuditLog[];
  notifications: Notification[];
  notificationHistory: Notification[];
  addNotification: (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', targetPage?: string) => void;
  dismissNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotificationHistory: () => void;

  // Actions
  login: (email: string) => Promise<boolean>; 
  logout: () => void;
  getCurrentClass: () => ClassGroup | undefined;
  
  // Content Management (CRUD)
  addAnnouncement: (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => Promise<void>;
  updateAnnouncement: (id: string, item: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  
  addMeet: (item: Omit<MeetSession, 'id' | 'classId'>, targetRoles?: Role[]) => Promise<void>;
  updateMeet: (id: string, item: Partial<MeetSession>) => Promise<void>;
  deleteMeet: (id: string) => Promise<void>;
  
  addExam: (item: Omit<Exam, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => Promise<void>;
  updateExam: (id: string, item: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  
  addPoll: (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => Promise<void>;
  updatePoll: (id: string, item: Partial<Poll>) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;

  // Sharing
  shareResource: (type: 'ANNOUNCEMENT' | 'MEET' | 'EXAM' | 'POLL', item: any) => Promise<void>;
  resendEmail: (email: SentEmail) => void;

  // Admin / Class Management
  addClass: (name: string, description: string, email: string) => Promise<void>;
  updateClass: (id: string, item: Partial<ClassGroup>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  importUsers: (usersData: Omit<User, 'id'>[]) => Promise<void>;
  updateUser: (id: string, item: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // State Initialization with Constants Fallback
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [classes, setClasses] = useState<ClassGroup[]>(INITIAL_CLASSES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [meets, setMeets] = useState<MeetSession[]>(INITIAL_MEETS);
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [polls, setPolls] = useState<Poll[]>(INITIAL_POLLS);
  const [schoolName, setSchoolNameState] = useState('SunuClasse');
  
  // UX / Logs
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  // --- Helpers ---
  const getCurrentClass = () => classes.find(c => c.id === user?.classId);

  const addNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', targetPage?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notif: Notification = { id, message, type, timestamp: new Date().toISOString(), read: false, targetPage };
    
    // Toast (temporary)
    setNotifications(prev => [...prev, notif]);
    // History (persistent)
    setNotificationHistory(prev => [notif, ...prev]);

    // Auto dismiss toast
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markNotificationAsRead = (id: string) => {
    setNotificationHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotificationHistory(prev => prev.filter(n => n.id !== id));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const logAction = async (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    if (!user) return;
    const log: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      details,
      author: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
      severity
    };
    setAuditLogs(prev => [log, ...prev]);
    
    // Persist to Supabase
    try {
      await supabase.from('audit_logs').insert([{
        action: log.action,
        details: log.details,
        author: log.author,
        role: log.role,
        severity: log.severity,
        timestamp: log.timestamp
      }]);
    } catch (e) { console.error("Log error", e); }
  };

  // --- Fetch Data ---
  const refreshAllData = async () => {
    try {
      // 1. Classes
      const { data: classesData } = await supabase.from('classes').select('*');
      if (classesData) setClasses(classesData);

      // 2. Users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        const mappedUsers = usersData.map((u: any) => ({
          ...u,
          classId: u.class_id, // Map snake_case to camelCase
        }));
        setUsers(mappedUsers);
      }
      
      // 3. Sent Emails (for Admin)
      const { data: emailData } = await supabase.from('sent_emails').select('*').order('created_at', { ascending: false });
      if (emailData) setSentEmails(emailData);

      // 4. Audit Logs
      const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      if (logsData) setAuditLogs(logsData as AuditLog[]);
      
      // 5. Settings
      const { data: settingsData } = await supabase.from('app_settings').select('*').eq('key', 'school_name').single();
      if (settingsData) setSchoolNameState(settingsData.value);

    } catch (err) {
      console.error("Erreur chargement données:", err);
    }
  };

  // Initial Load
  useEffect(() => {
    refreshAllData();
  }, [user]); // Refresh when user logs in

  // --- Auth ---
  const login = async (email: string) => {
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !dbUser) {
        // Fallback to constants for demo if DB is empty/fails
        const localUser = users.find(u => u.email === email);
        if (localUser) {
           setUser(localUser);
           logAction('LOGIN', 'Connexion locale');
           return true;
        }
        return false;
      }

      const appUser: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as Role,
        classId: dbUser.class_id,
        avatar: dbUser.avatar
      };

      setUser(appUser);
      logAction('LOGIN', 'Connexion réussie');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    logAction('LOGOUT', 'Déconnexion');
    setUser(null);
  };

  const setSchoolName = async (name: string) => {
    setSchoolNameState(name);
    await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
    logAction('CONFIG', `Changement nom école: ${name}`, 'WARNING');
  };

  // --- Content Management Wrappers ---
  // Note: For simplicity in this demo, we are updating local state. 
  // In a real app, these would be Supabase calls.

  const addAnnouncement = async (item: any, targetRoles?: Role[]) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), authorId: user?.id, classId: user?.classId };
    setAnnouncements(prev => [newItem, ...prev]);
    addNotification('Annonce publiée avec succès', 'SUCCESS');
    logAction('PUBLICATION', `Annonce: ${item.title}`);
  };

  const updateAnnouncement = async (id: string, item: any) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...item } : a));
    addNotification('Annonce mise à jour', 'SUCCESS');
    logAction('MODIFICATION', `Annonce ID: ${id}`);
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    addNotification('Annonce supprimée', 'INFO');
    logAction('SUPPRESSION', `Annonce ID: ${id}`, 'WARNING');
  };

  const addMeet = async (item: any, targetRoles?: Role[]) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), classId: user?.classId };
    setMeets(prev => [...prev, newItem]);
    addNotification('Session Meet programmée', 'SUCCESS');
    logAction('CREATION', `Meet: ${item.subject}`);
  };

  const updateMeet = async (id: string, item: any) => {
    setMeets(prev => prev.map(m => m.id === id ? { ...m, ...item } : m));
    addNotification('Session Meet mise à jour', 'SUCCESS');
  };

  const deleteMeet = async (id: string) => {
    setMeets(prev => prev.filter(m => m.id !== id));
    addNotification('Session Meet supprimée', 'INFO');
  };

  const addExam = async (item: any, targetRoles?: Role[]) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), authorId: user?.id, classId: user?.classId };
    setExams(prev => [...prev, newItem]);
    addNotification('Examen planifié', 'SUCCESS');
    logAction('CREATION', `Examen: ${item.subject}`);
  };

  const updateExam = async (id: string, item: any) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
    addNotification('Examen mis à jour', 'SUCCESS');
  };

  const deleteExam = async (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    addNotification('Examen supprimé', 'INFO');
  };

  const addPoll = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), classId: user?.classId };
    setPolls(prev => [newItem, ...prev]);
    addNotification('Sondage publié', 'SUCCESS');
    logAction('CREATION', `Sondage: ${item.question}`);
  };

  const updatePoll = async (id: string, item: any) => {
    setPolls(prev => prev.map(p => p.id === id ? { ...p, ...item } : p));
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    setPolls(prev => prev.map(poll => {
      if (poll.id !== pollId) return poll;
      
      // Remove previous vote if any (Single choice behavior)
      const cleanedOptions = poll.options.map(opt => ({
        ...opt,
        voterIds: opt.voterIds.filter(vid => vid !== user.id)
      }));

      // Add new vote
      const updatedOptions = cleanedOptions.map(opt => 
        opt.id === optionId ? { ...opt, voterIds: [...opt.voterIds, user.id] } : opt
      );

      return { ...poll, options: updatedOptions };
    }));
    addNotification('Vote enregistré', 'SUCCESS');
  };

  const deletePoll = async (id: string) => {
    setPolls(prev => prev.filter(p => p.id !== id));
    addNotification('Sondage supprimé', 'INFO');
  };

  // --- SHARE FUNCTION (EMAIL) ---
  const shareResource = async (type: 'ANNOUNCEMENT' | 'MEET' | 'EXAM' | 'POLL', item: any) => {
    if (!user) return;

    const currentClass = getCurrentClass();
    
    // 1. Déterminer les destinataires
    // Priorité : Email de la classe (Mailing List) > Liste des emails des élèves > Vide
    let targetEmails = currentClass?.email;
    let recipientLabel = currentClass?.email ? `Mailing List (${currentClass.email})` : 'Membres de la classe';

    if (!targetEmails) {
       // Fallback : Récupérer les emails individuels des étudiants de la classe
       const students = users.filter(u => u.classId === user.classId && u.role === Role.STUDENT);
       const emails = students.map(u => u.email).filter(e => e && e.includes('@')); // Basic validation
       if (emails.length > 0) {
         targetEmails = emails.join(',');
         recipientLabel = `${emails.length} Étudiants`;
       }
    }
    
    // 2. Générer le contenu (Formatage strict avec \r\n pour Outlook/Gmail)
    let subject = '';
    let body = '';
    // Double CRLF for new paragraphs in Outlook
    const footer = `\r\n\r\n--\r\nEnvoyé depuis ${schoolName} - Portail Numérique`;
    
    switch (type) {
      case 'ANNOUNCEMENT':
        subject = `[${schoolName}] Annonce : ${item.title}`;
        body = `Bonjour,\r\n\r\nUne nouvelle annonce a été publiée :\r\n\r\n"${item.content}"\r\n\r\nConnectez-vous pour plus de détails.${footer}`;
        break;
      case 'MEET':
        subject = `[${schoolName}] Nouveau cours vidéo : ${item.subject}`;
        body = `Bonjour,\r\n\r\nUn cours de ${item.subject} avec ${item.teacherName} est programmé.\r\n\r\n📅 Date : ${format(new Date(item.date), 'dd/MM à HH:mm')}\r\n🔗 Lien : ${item.link}\r\n\r\nSoyez à l'heure !${footer}`;
        break;
      case 'EXAM':
        subject = `[${schoolName}] Examen programmé : ${item.subject}`;
        body = `Bonjour,\r\n\r\nUn examen de ${item.subject} aura lieu prochainement.\r\n\r\n📅 Date : ${format(new Date(item.date), 'dd/MM à HH:mm')}\r\n📍 Salle : ${item.room}\r\n⏱️ Durée : ${item.durationMinutes} min\r\n\r\nNotes : ${item.notes || 'Aucune'}${footer}`;
        break;
      case 'POLL':
        subject = `[${schoolName}] Sondage : Votre avis compte`;
        body = `Bonjour,\r\n\r\nUn nouveau sondage nécessite votre attention :\r\n\r\n"${item.question}"\r\n\r\nConnectez-vous à la plateforme pour voter.${footer}`;
        break;
    }

    // 3. Insert into History (Supabase)
    // On sauvegarde une version HTML (<br>) pour l'affichage Admin, mais on envoie le \r\n
    const bodyForDisplay = body.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

    const { error } = await supabase.from('sent_emails').insert([{
      recipient_email: targetEmails || 'Non spécifié', 
      subject,
      body_html: bodyForDisplay, 
      resource_type: type,
      sender_name: user.name,
      class_id: user.classId
    }]);

    if (error) {
      console.error("Erreur enregistrement email:", error);
    } else {
      // Update local state for immediate feedback
      refreshAllData(); // Reload emails to get the new ID
    }

    addNotification(`Ouverture du mail pour : ${recipientLabel}`, 'SUCCESS');
    logAction('PARTAGE', `Email envoyé (${type})`);

    // 4. Open Mail Client (Real Send)
    // EncodeURIComponent gère correctement \r\n -> %0D%0A pour les mailto
    const mailtoLink = `mailto:${targetEmails || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  // --- RESEND FEATURE ---
  const resendEmail = (email: SentEmail) => {
    // Reconvert <br> to \r\n for mail client compatibility (Outlook/Gmail)
    const bodyText = email.body_html.replace(/<br\s*\/?>/gi, '\r\n');
    
    const mailtoLink = `mailto:${email.recipient_email || ''}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoLink;
    
    addNotification('Client mail ré-ouvert', 'INFO');
    logAction('PARTAGE', `Renvoi email ID: ${email.id}`, 'WARNING');
  };


  // --- ADMIN ACTIONS (Supabase) ---

  const addClass = async (name: string, description: string, email: string) => {
    const { error } = await supabase.from('classes').insert([{ 
      name, 
      description,
      email: email && email.trim() !== '' ? email : null 
    }]);

    if (error) {
       addNotification(`Erreur création: ${error.message}`, 'ERROR');
    } else {
       addNotification('Classe créée avec succès', 'SUCCESS');
       refreshAllData();
    }
  };

  const updateClass = async (id: string, item: Partial<ClassGroup>) => {
    // Sanitize Payload for Supabase
    const payload: any = {};
    if (item.name !== undefined) payload.name = item.name;
    if (item.description !== undefined) payload.description = item.description;
    if (item.email !== undefined) {
      // Convert empty string to null for DB compatibility
      payload.email = item.email && item.email.trim() !== '' ? item.email : null;
    }

    const { error } = await supabase.from('classes').update(payload).eq('id', id);

    if (error) {
       console.error("Update Error:", error);
       addNotification(`Erreur mise à jour: ${error.message}`, 'ERROR');
    } else {
       addNotification('Classe mise à jour', 'SUCCESS');
       refreshAllData();
    }
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
       addNotification('Classe supprimée', 'INFO');
       refreshAllData();
    } else {
       addNotification('Erreur lors de la suppression', 'ERROR');
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const { error } = await supabase.from('users').insert([{
      name: userData.name,
      email: userData.email,
      role: userData.role,
      class_id: userData.classId && userData.classId !== '' ? userData.classId : null
    }]);

    if (error) {
       addNotification(`Erreur: ${error.message}`, 'ERROR');
    } else {
       addNotification('Utilisateur ajouté', 'SUCCESS');
       refreshAllData();
    }
  };

  const importUsers = async (usersData: Omit<User, 'id'>[]) => {
    const dbUsers = usersData.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      class_id: u.classId
    }));

    const { error } = await supabase.from('users').insert(dbUsers);
    
    if (error) {
      addNotification('Erreur importation CSV', 'ERROR');
    } else {
      addNotification(`${usersData.length} utilisateurs importés`, 'SUCCESS');
      refreshAllData();
    }
  };

  const updateUser = async (id: string, item: Partial<User>) => {
    const payload: any = {};
    if (item.name) payload.name = item.name;
    if (item.email) payload.email = item.email;
    if (item.role) payload.role = item.role;
    if (item.classId !== undefined) payload.class_id = item.classId === '' ? null : item.classId;
    if (item.avatar) payload.avatar = item.avatar;

    const { error } = await supabase.from('users').update(payload).eq('id', id);

    if (error) {
       console.error("Update User Error:", error);
       addNotification(`Erreur: ${error.message}`, 'ERROR');
    } else {
       addNotification('Utilisateur mis à jour', 'SUCCESS');
       refreshAllData();
    }
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
       addNotification('Utilisateur supprimé', 'INFO');
       refreshAllData();
    } else {
       addNotification('Erreur suppression', 'ERROR');
    }
  };

  const contextValue: AppContextType = {
    user, users, classes, schoolName, setSchoolName,
    announcements, meets, exams, polls, sentEmails,
    auditLogs, notifications, notificationHistory,
    addNotification, dismissNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearNotificationHistory,
    login, logout, getCurrentClass,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addMeet, updateMeet, deleteMeet,
    addExam, updateExam, deleteExam,
    addPoll, updatePoll, votePoll, deletePoll,
    shareResource, resendEmail,
    addClass, updateClass, deleteClass,
    addUser, importUsers, updateUser, deleteUser
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};