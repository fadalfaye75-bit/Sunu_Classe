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
    await supabase.from('audit_logs').insert([{
      action: log.action,
      details: log.details,
      author: log.author,
      role: log.role,
      severity: log.severity,
      timestamp: log.timestamp
    }]);
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
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
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
    addNotification('Sondage mis à jour', 'SUCCESS');
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
    const recipient = currentClass?.email || 'Étudiants de la classe';
    
    // 1. Generate Content
    let subject = '';
    let body = '';
    let detailsUrl = window.location.origin;

    switch (type) {
      case 'ANNOUNCEMENT':
        subject = `📢 Annonce : ${item.title}`;
        body = `Bonjour,\n\nUne nouvelle annonce a été publiée :\n\n"${item.content}"\n\nConnectez-vous pour plus de détails.`;
        break;
      case 'MEET':
        subject = `📹 Nouveau cours vidéo : ${item.subject}`;
        body = `Bonjour,\n\nUn cours de ${item.subject} avec ${item.teacherName} est programmé le ${format(new Date(item.date), 'dd/MM à HH:mm')}.\n\nLien : ${item.link}`;
        break;
      case 'EXAM':
        subject = `📅 Examen programmé : ${item.subject}`;
        body = `Bonjour,\n\nUn examen de ${item.subject} aura lieu le ${format(new Date(item.date), 'dd/MM à HH:mm')} en salle ${item.room}.\nDurée : ${item.durationMinutes} min.`;
        break;
      case 'POLL':
        subject = `📊 Nouveau sondage : Votre avis compte`;
        body = `Bonjour,\n\nRépondez au sondage : "${item.question}"\n\nConnectez-vous à SunuClasse pour voter.`;
        break;
    }

    // 2. Insert into History (Supabase)
    const { error } = await supabase.from('sent_emails').insert([{
      recipient_email: currentClass?.email || null, // NULL means general broadcast if no specific email
      subject,
      body_html: body, // Saving raw text for now as simple history
      resource_type: type,
      sender_name: user.name,
      class_id: user.classId
    }]);

    if (!error) {
      // Update local state for immediate feedback
      setSentEmails(prev => [{
        id: Math.random().toString(),
        created_at: new Date().toISOString(),
        recipient_email: recipient,
        subject,
        body_html: body,
        resource_type: type,
        sender_name: user.name,
        class_id: user.classId || ''
      }, ...prev]);
    }

    // 3. Open Mail Client (mailto)
    const mailtoLink = `mailto:${currentClass?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    addNotification(`Ouverture de la messagerie pour envoi à : ${recipient}`, 'INFO');
    logAction('PARTAGE', `Partage email ${type} vers ${recipient}`);
  };

  // --- Admin Logic ---
  const addClass = async (name: string, description: string, email: string) => {
    try {
      const { data, error } = await supabase.from('classes').insert([{
        name, 
        description,
        email: email || null // Ensure empty string becomes null for DB
      }]).select().single();

      if (error) throw error;
      if (data) setClasses(prev => [...prev, data]);
      
      addNotification('Classe créée', 'SUCCESS');
      logAction('ADMIN', `Création classe: ${name}`);
    } catch (error: any) {
       console.error(error);
       addNotification(`Erreur création: ${error.message || 'Inconnue'}`, 'ERROR');
    }
  };

  const updateClass = async (id: string, item: Partial<ClassGroup>) => {
    try {
      // Sanitize payload
      const payload: any = { ...item };
      if (payload.email === '') payload.email = null;

      const { error } = await supabase.from('classes').update(payload).eq('id', id);
      
      if (error) throw error;
      
      setClasses(prev => prev.map(c => c.id === id ? { ...c, ...item, email: payload.email } : c));
      addNotification('Classe mise à jour', 'SUCCESS');
      logAction('ADMIN', `Mise à jour classe ID: ${id}`);
    } catch (error: any) {
      console.error(error);
      addNotification(`Erreur mise à jour: ${error.message || 'Inconnue'}`, 'ERROR');
    }
  };

  const deleteClass = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id);
    setClasses(prev => prev.filter(c => c.id !== id));
    addNotification('Classe supprimée', 'WARNING');
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      // Sanitize classId (empty string -> null for UUID)
      const payload = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        class_id: userData.classId || null,
        avatar: userData.avatar
      };

      const { data, error } = await supabase.from('users').insert([payload]).select().single();

      if (error) throw error;
      if (data) {
        const newUser: User = { ...userData, id: data.id };
        setUsers(prev => [...prev, newUser]);
      }
      
      addNotification('Utilisateur ajouté', 'SUCCESS');
      logAction('ADMIN', `Ajout utilisateur: ${userData.email}`);
    } catch (e: any) {
      addNotification(`Erreur ajout: ${e.message}`, 'ERROR');
    }
  };

  const importUsers = async (usersData: Omit<User, 'id'>[]) => {
     for (const u of usersData) {
       await addUser(u);
     }
     addNotification(`${usersData.length} utilisateurs importés`, 'SUCCESS');
  };

  const updateUser = async (id: string, item: Partial<User>) => {
    try {
      const payload: any = { ...item };
      // Map classId to class_id for DB
      if (item.classId !== undefined) {
         payload.class_id = item.classId || null;
         delete payload.classId;
      }

      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...item } : u));
      if (user?.id === id) setUser(prev => prev ? { ...prev, ...item } : null); // Update self if needed
      
      addNotification('Utilisateur mis à jour', 'SUCCESS');
    } catch (e: any) {
      addNotification(`Erreur MAJ: ${e.message}`, 'ERROR');
    }
  };

  const deleteUser = async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    setUsers(prev => prev.filter(u => u.id !== id));
    addNotification('Utilisateur supprimé', 'WARNING');
    logAction('ADMIN', `Suppression utilisateur ID: ${id}`, 'WARNING');
  };

  const setSchoolName = async (name: string) => {
     setSchoolNameState(name);
     await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
     addNotification('Nom de l\'établissement mis à jour', 'SUCCESS');
  };

  // UX Helpers
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const deleteNotification = (id: string) => {
    setNotificationHistory(prev => prev.filter(n => n.id !== id));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotificationHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider value={{
      user, users, classes, schoolName, setSchoolName,
      announcements, meets, exams, polls, sentEmails,
      auditLogs, notifications, notificationHistory,
      dismissNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearNotificationHistory,
      login, logout, getCurrentClass,
      addAnnouncement, updateAnnouncement, deleteAnnouncement,
      addMeet, updateMeet, deleteMeet,
      addExam, updateExam, deleteExam,
      addPoll, updatePoll, votePoll, deletePoll,
      shareResource,
      addClass, updateClass, deleteClass,
      addUser, importUsers, updateUser, deleteUser
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};