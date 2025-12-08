import React, { createContext, useContext, useState, PropsWithChildren, useMemo } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification } from '../types';
import { 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_EXAMS, 
  INITIAL_POLLS, 
  INITIAL_USERS, 
  INITIAL_CLASSES, 
  INITIAL_MEETS 
} from '../constants';

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
  
  // Security & UX
  auditLogs: AuditLog[];
  notifications: Notification[];
  notificationHistory: Notification[];
  dismissNotification: (id: string) => void;
  clearNotificationHistory: () => void;

  // Actions
  login: (email: string) => boolean;
  logout: () => void;
  
  // Content Management (CRUD)
  addAnnouncement: (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>) => void;
  updateAnnouncement: (id: string, item: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  
  addMeet: (item: Omit<MeetSession, 'id' | 'classId'>) => void;
  updateMeet: (id: string, item: Partial<MeetSession>) => void;
  deleteMeet: (id: string) => void;
  
  addExam: (item: Omit<Exam, 'id' | 'authorId' | 'classId'>) => void;
  updateExam: (id: string, item: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  
  addPoll: (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => void;
  updatePoll: (id: string, item: Partial<Poll>) => void;
  votePoll: (pollId: string, optionId: string) => void;
  deletePoll: (id: string) => void;

  // Admin / Class Management
  addClass: (name: string, description: string) => void;
  updateClass: (id: string, item: Partial<ClassGroup>) => void;
  deleteClass: (id: string) => void;
  
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, item: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  getCurrentClass: () => ClassGroup | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('sunuclasse_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Erreur lecture localStorage:", error);
      return null;
    }
  });

  // App Settings
  const [schoolName, setSchoolName] = useState("SunuClasse");
  
  // Data State
  const [classes, setClasses] = useState<ClassGroup[]>(INITIAL_CLASSES);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [allMeets, setAllMeets] = useState<MeetSession[]>(INITIAL_MEETS);
  const [allExams, setAllExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [allPolls, setAllPolls] = useState<Poll[]>(INITIAL_POLLS);

  // Security & UX State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log_init',
      action: 'SYSTEM_START',
      details: 'Démarrage du système SunuClasse v2025',
      author: 'Système',
      role: Role.ADMIN,
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    }
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>(() => {
    try {
      const saved = sessionStorage.getItem('sunuclasse_notifs_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // --- Helpers ---

  const logAction = (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      details,
      author: user?.name || 'Inconnu',
      role: user?.role || Role.STUDENT,
      timestamp: new Date().toISOString(),
      severity
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const showNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING' = 'INFO', targetPage?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    const newNotif: Notification = { id, message, type, timestamp, targetPage };

    // Active Toast
    setNotifications(prev => [...prev, newNotif]);
    
    // History
    setNotificationHistory(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      sessionStorage.setItem('sunuclasse_notifs_history', JSON.stringify(updated));
      return updated;
    });

    // Auto dismiss toast
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
    sessionStorage.removeItem('sunuclasse_notifs_history');
  };

  // --- Auth ---

  const login = (email: string) => {
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('sunuclasse_user', JSON.stringify(foundUser));
      
      // Log special login
      const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        action: 'USER_LOGIN',
        details: `Connexion réussie de ${foundUser.name}`,
        author: foundUser.name,
        role: foundUser.role,
        timestamp: new Date().toISOString(),
        severity: 'INFO'
      };
      setAuditLogs(prev => [newLog, ...prev]);
      showNotification(`Bon retour, ${foundUser.name} !`, 'SUCCESS');
      return true;
    }
    showNotification("Échec de connexion : Email introuvable.", 'ERROR');
    return false;
  };

  const logout = () => {
    if (user) {
      logAction('USER_LOGOUT', `Déconnexion de ${user.name}`);
    }
    setUser(null);
    localStorage.removeItem('sunuclasse_user');
    showNotification("Vous avez été déconnecté.", 'INFO');
  };

  // --- Data Access ---

  const filterByClass = <T extends { classId: string }>(items: T[]) => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return items;
    return items.filter(i => i.classId === user.classId);
  };

  const announcements = useMemo(() => filterByClass(allAnnouncements), [allAnnouncements, user]);
  const meets = useMemo(() => filterByClass(allMeets), [allMeets, user]);
  const exams = useMemo(() => filterByClass(allExams), [allExams, user]);
  const polls = useMemo(() => filterByClass(allPolls), [allPolls, user]);

  const getCurrentClass = () => {
    if (!user?.classId) return undefined;
    return classes.find(c => c.id === user.classId);
  };

  // --- Actions ---

  const addAnnouncement = (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>) => {
    if (!user || !user.classId) return;
    const newItem: Announcement = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.id,
      classId: user.classId
    };
    setAllAnnouncements(prev => [newItem, ...prev]);
    logAction('CREATE_ANNOUNCEMENT', `Annonce créée : "${item.title}"`);
    showNotification("Annonce publiée avec succès.", 'SUCCESS', 'infos');
  };

  const updateAnnouncement = (id: string, item: Partial<Announcement>) => {
    setAllAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...item } : a));
    logAction('UPDATE_ANNOUNCEMENT', `Mise à jour annonce ID: ${id}`);
    showNotification("Annonce mise à jour.", 'SUCCESS', 'infos');
  };

  const deleteAnnouncement = (id: string) => {
    setAllAnnouncements(prev => prev.filter(a => a.id !== id));
    logAction('DELETE_ANNOUNCEMENT', `Suppression annonce ID: ${id}`, 'WARNING');
    showNotification("Annonce supprimée.", 'INFO', 'infos');
  };

  const addMeet = (item: Omit<MeetSession, 'id' | 'classId'>) => {
    if (!user || !user.classId) return;
    const newItem: MeetSession = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      classId: user.classId
    };
    setAllMeets(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('CREATE_MEET', `Session Meet programmée : "${item.subject}"`);
    showNotification("Session Meet ajoutée.", 'SUCCESS', 'meet');
  };

  const updateMeet = (id: string, item: Partial<MeetSession>) => {
    setAllMeets(prev => prev.map(m => m.id === id ? { ...m, ...item } : m).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('UPDATE_MEET', `Mise à jour Meet ID: ${id}`);
    showNotification("Session Meet modifiée.", 'SUCCESS', 'meet');
  };

  const deleteMeet = (id: string) => {
    setAllMeets(prev => prev.filter(m => m.id !== id));
    logAction('DELETE_MEET', `Suppression Meet ID: ${id}`, 'WARNING');
    showNotification("Session Meet annulée.", 'INFO', 'meet');
  };

  const addExam = (item: Omit<Exam, 'id' | 'authorId' | 'classId'>) => {
    if (!user || !user.classId) return;
    const newItem: Exam = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.id,
      classId: user.classId
    };
    setAllExams(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('CREATE_EXAM', `Examen programmé : "${item.subject}"`, 'WARNING');
    showNotification("Examen programmé avec succès.", 'SUCCESS', 'ds');
  };

  const updateExam = (id: string, item: Partial<Exam>) => {
    setAllExams(prev => prev.map(e => e.id === id ? { ...e, ...item } : e).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('UPDATE_EXAM', `Mise à jour Examen ID: ${id}`);
    showNotification("Examen mis à jour.", 'SUCCESS', 'ds');
  };

  const deleteExam = (id: string) => {
    setAllExams(prev => prev.filter(e => e.id !== id));
    logAction('DELETE_EXAM', `Suppression Examen ID: ${id}`, 'CRITICAL');
    showNotification("Examen supprimé du calendrier.", 'WARNING', 'ds');
  };

  const addPoll = (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => {
    if (!user || !user.classId) return;
    const newItem: Poll = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      classId: user.classId
    };
    setAllPolls(prev => [newItem, ...prev]);
    logAction('CREATE_POLL', `Sondage créé : "${item.question}"`);
    showNotification("Sondage publié.", 'SUCCESS', 'polls');
  };

  const updatePoll = (id: string, item: Partial<Poll>) => {
    setAllPolls(prev => prev.map(p => p.id === id ? { ...p, ...item } : p));
    logAction('UPDATE_POLL', `Mise à jour Sondage ID: ${id}`);
    showNotification("Sondage modifié.", 'SUCCESS', 'polls');
  };

  const votePoll = (pollId: string, optionId: string) => {
    if (!user) return;
    let pollQuestion = "";
    setAllPolls(prev => prev.map(poll => {
      if (poll.id !== pollId) return poll;
      pollQuestion = poll.question;
      
      const cleanOptions = poll.options.map(opt => ({
        ...opt,
        voterIds: opt.voterIds.filter(id => id !== user.id)
      }));

      const updatedOptions = cleanOptions.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, voterIds: [...opt.voterIds, user.id] };
        }
        return opt;
      });

      return { ...poll, options: updatedOptions };
    }));
    logAction('VOTE_POLL', `Vote enregistré pour sondage : "${pollQuestion}"`);
    showNotification("Votre vote a bien été pris en compte.", 'SUCCESS', 'polls');
  };

  const deletePoll = (id: string) => {
    setAllPolls(prev => prev.filter(p => p.id !== id));
    logAction('DELETE_POLL', `Suppression Sondage ID: ${id}`, 'WARNING');
    showNotification("Sondage supprimé.", 'INFO', 'polls');
  };

  // --- Admin / Class Management Actions ---

  const addClass = (name: string, description: string) => {
    const newClass: ClassGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description
    };
    setClasses(prev => [...prev, newClass]);
    logAction('CREATE_CLASS', `Création classe : "${name}"`, 'WARNING');
    showNotification("Nouvelle classe créée.", 'SUCCESS', 'admin');
  };

  const updateClass = (id: string, item: Partial<ClassGroup>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...item } : c));
    logAction('UPDATE_CLASS', `Mise à jour classe ID: ${id}`);
    showNotification("Classe mise à jour.", 'SUCCESS', 'admin');
  };

  const deleteClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    logAction('DELETE_CLASS', `Suppression classe ID: ${id}`, 'CRITICAL');
    showNotification("Classe supprimée.", 'WARNING', 'admin');
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
    };
    setAllUsers(prev => [...prev, newUser]);
    logAction('CREATE_USER', `Nouvel utilisateur : ${newUser.name} (${newUser.role})`);
    showNotification("Utilisateur ajouté.", 'SUCCESS', 'admin');
  };

  const updateUser = (id: string, item: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...item } : u));
    
    // Update current session user if it's the same person
    if (user && user.id === id) {
       setUser(prev => prev ? { ...prev, ...item } : null);
    }
    
    logAction('UPDATE_USER', `Mise à jour utilisateur ID: ${id}`);
    showNotification("Utilisateur mis à jour.", 'SUCCESS', 'admin');
  };

  const deleteUser = (id: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== id));
    logAction('DELETE_USER', `Suppression utilisateur ID: ${id}`, 'WARNING');
    showNotification("Utilisateur supprimé.", 'INFO', 'admin');
  };

  const value = {
    user,
    users: allUsers,
    classes,
    schoolName,
    setSchoolName,
    announcements,
    meets,
    exams,
    polls,
    auditLogs,
    notifications,
    notificationHistory,
    dismissNotification,
    clearNotificationHistory,
    login,
    logout,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addMeet,
    updateMeet,
    deleteMeet,
    addExam,
    updateExam,
    deleteExam,
    addPoll,
    updatePoll,
    votePoll,
    deletePoll,
    addClass,
    updateClass,
    deleteClass,
    addUser,
    updateUser,
    deleteUser,
    getCurrentClass,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
