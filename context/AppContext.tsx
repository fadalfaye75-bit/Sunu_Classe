
import React, { createContext, useContext, useState, PropsWithChildren, useMemo, useEffect } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, PollOption } from '../types';
import { supabase } from '../services/supabaseClient';

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
  login: (email: string) => Promise<boolean>; // Async now
  logout: () => void;
  
  // Content Management (CRUD)
  addAnnouncement: (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>) => Promise<void>;
  updateAnnouncement: (id: string, item: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  
  addMeet: (item: Omit<MeetSession, 'id' | 'classId'>) => Promise<void>;
  updateMeet: (id: string, item: Partial<MeetSession>) => Promise<void>;
  deleteMeet: (id: string) => Promise<void>;
  
  addExam: (item: Omit<Exam, 'id' | 'authorId' | 'classId'>) => Promise<void>;
  updateExam: (id: string, item: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  
  addPoll: (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => Promise<void>;
  updatePoll: (id: string, item: Partial<Poll>) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;

  // Admin / Class Management
  addClass: (name: string, description: string) => Promise<void>;
  updateClass: (id: string, item: Partial<ClassGroup>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  importUsers: (usersData: Omit<User, 'id'>[]) => Promise<void>;
  updateUser: (id: string, item: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
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
      return null;
    }
  });

  // App Settings
  const [schoolName, setSchoolNameLocal] = useState("SunuClasse");
  
  // Data State
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [allMeets, setAllMeets] = useState<MeetSession[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allPolls, setAllPolls] = useState<Poll[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>(() => {
    try {
      const saved = sessionStorage.getItem('sunuclasse_notifs_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // --- Initial Data Fetching ---
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    try {
      // 1. Fetch Settings
      const { data: settings } = await supabase.from('app_settings').select('*');
      const schoolNameSetting = settings?.find(s => s.key === 'school_name');
      if (schoolNameSetting) setSchoolNameLocal(schoolNameSetting.value);

      // 2. Fetch Classes
      const { data: classData } = await supabase.from('classes').select('*');
      if (classData) setClasses(classData);

      // 3. Fetch Users
      const { data: userData } = await supabase.from('users').select('*');
      if (userData) {
        setAllUsers(userData.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          classId: u.class_id
        })));
      }

      // 4. Fetch Announcements
      const { data: annData } = await supabase.from('announcements').select('*');
      if (annData) {
        setAllAnnouncements(annData.map(a => ({
          id: a.id,
          title: a.title,
          content: a.content,
          date: a.date,
          urgency: a.urgency,
          authorId: a.author_id,
          classId: a.class_id
        })));
      }

      // 5. Fetch Meets
      const { data: meetData } = await supabase.from('meets').select('*');
      if (meetData) {
        setAllMeets(meetData.map(m => ({
          id: m.id,
          subject: m.subject,
          link: m.link,
          date: m.date,
          teacherName: m.teacher_name,
          classId: m.class_id
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }

      // 6. Fetch Exams
      const { data: examData } = await supabase.from('exams').select('*');
      if (examData) {
        setAllExams(examData.map(e => ({
          id: e.id,
          subject: e.subject,
          date: e.date,
          durationMinutes: e.duration_minutes,
          room: e.room,
          notes: e.notes,
          authorId: e.author_id,
          classId: e.class_id
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }

      // 7. Fetch Polls (Complex join)
      // Fetch core polls
      const { data: pollsData } = await supabase.from('polls').select('*');
      // Fetch all options
      const { data: optionsData } = await supabase.from('poll_options').select('*');
      // Fetch all votes
      const { data: votesData } = await supabase.from('poll_votes').select('*');

      if (pollsData && optionsData && votesData) {
        const reconstructedPolls: Poll[] = pollsData.map(p => {
           // Find options for this poll
           const myOptions = optionsData.filter(opt => opt.poll_id === p.id);
           
           // Map options to include voterIds
           const mappedOptions: PollOption[] = myOptions.map(opt => {
              const voters = votesData
                .filter(v => v.option_id === opt.id)
                .map(v => v.user_id);
              return {
                id: opt.id,
                label: opt.label,
                voterIds: voters
              };
           });

           return {
             id: p.id,
             question: p.question,
             type: p.type,
             active: p.active,
             isAnonymous: p.is_anonymous,
             classId: p.class_id,
             createdAt: p.created_at,
             options: mappedOptions
           };
        });
        setAllPolls(reconstructedPolls);
      }

      // 8. Fetch Logs
      const { data: logData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (logData) setAuditLogs(logData);

    } catch (error) {
      console.error("Erreur chargement Supabase:", error);
      showNotification("Erreur de connexion base de données", 'ERROR');
    }
  };

  // --- Helpers ---

  const logAction = async (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    const newLog = {
      action,
      details,
      author_name: user?.name || 'Système',
      author_role: user?.role || Role.STUDENT,
      severity,
      timestamp: new Date().toISOString()
    };
    
    // Optimistic Update
    const displayLog: AuditLog = {
      id: Math.random().toString(),
      action,
      details,
      author: user?.name || 'Système',
      role: user?.role || Role.STUDENT,
      severity,
      timestamp: newLog.timestamp
    };
    setAuditLogs(prev => [displayLog, ...prev]);

    // DB Insert
    await supabase.from('audit_logs').insert([newLog]);
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

  const setSchoolName = async (name: string) => {
    setSchoolNameLocal(name);
    await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
    logAction('UPDATE_SETTINGS', `Nom école changé pour : ${name}`);
  };

  // --- Auth ---

  const login = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email) // Case insensitive
        .single();
      
      if (error || !data) {
        showNotification("Email introuvable.", 'ERROR');
        return false;
      }

      const mappedUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        classId: data.class_id
      };

      setUser(mappedUser);
      localStorage.setItem('sunuclasse_user', JSON.stringify(mappedUser));
      
      logAction('USER_LOGIN', `Connexion de ${mappedUser.name}`);
      showNotification(`Bon retour, ${mappedUser.name} !`, 'SUCCESS');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
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

  // --- CRUD Actions (Async with Supabase) ---

  const addAnnouncement = async (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>) => {
    if (!user || !user.classId) return;
    
    const { data, error } = await supabase.from('announcements').insert([{
      title: item.title,
      content: item.content,
      date: item.date,
      urgency: item.urgency,
      author_id: user.id,
      class_id: user.classId
    }]).select().single();

    if (error) {
      showNotification("Erreur lors de la création.", 'ERROR');
      return;
    }

    const newItem: Announcement = {
      ...item,
      id: data.id,
      authorId: user.id,
      classId: user.classId
    };
    setAllAnnouncements(prev => [newItem, ...prev]);
    logAction('CREATE_ANNOUNCEMENT', `Annonce créée : "${item.title}"`);
    showNotification("Annonce publiée.", 'SUCCESS', 'infos');
  };

  const updateAnnouncement = async (id: string, item: Partial<Announcement>) => {
    const { error } = await supabase.from('announcements').update({
       title: item.title,
       content: item.content,
       urgency: item.urgency
    }).eq('id', id);

    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    setAllAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...item } : a));
    logAction('UPDATE_ANNOUNCEMENT', `Mise à jour annonce ID: ${id}`);
    showNotification("Annonce mise à jour.", 'SUCCESS', 'infos');
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

    setAllAnnouncements(prev => prev.filter(a => a.id !== id));
    logAction('DELETE_ANNOUNCEMENT', `Suppression annonce ID: ${id}`, 'WARNING');
    showNotification("Annonce supprimée.", 'INFO', 'infos');
  };

  const addMeet = async (item: Omit<MeetSession, 'id' | 'classId'>) => {
    if (!user || !user.classId) return;

    const { data, error } = await supabase.from('meets').insert([{
      subject: item.subject,
      link: item.link,
      date: item.date,
      teacher_name: item.teacherName,
      class_id: user.classId
    }]).select().single();

    if (error) return showNotification("Erreur création.", 'ERROR');

    const newItem: MeetSession = { ...item, id: data.id, classId: user.classId };
    setAllMeets(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('CREATE_MEET', `Session Meet programmée : "${item.subject}"`);
    showNotification("Session Meet ajoutée.", 'SUCCESS', 'meet');
  };

  const updateMeet = async (id: string, item: Partial<MeetSession>) => {
    const { error } = await supabase.from('meets').update({
       subject: item.subject,
       teacher_name: item.teacherName,
       link: item.link,
       date: item.date
    }).eq('id', id);

    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    setAllMeets(prev => prev.map(m => m.id === id ? { ...m, ...item } : m).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('UPDATE_MEET', `Mise à jour Meet ID: ${id}`);
    showNotification("Session Meet modifiée.", 'SUCCESS', 'meet');
  };

  const deleteMeet = async (id: string) => {
    const { error } = await supabase.from('meets').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

    setAllMeets(prev => prev.filter(m => m.id !== id));
    logAction('DELETE_MEET', `Suppression Meet ID: ${id}`, 'WARNING');
    showNotification("Session Meet annulée.", 'INFO', 'meet');
  };

  const addExam = async (item: Omit<Exam, 'id' | 'authorId' | 'classId'>) => {
    if (!user || !user.classId) return;

    const { data, error } = await supabase.from('exams').insert([{
      subject: item.subject,
      date: item.date,
      duration_minutes: item.durationMinutes,
      room: item.room,
      notes: item.notes,
      author_id: user.id,
      class_id: user.classId
    }]).select().single();

    if (error) return showNotification("Erreur création.", 'ERROR');

    const newItem: Exam = { ...item, id: data.id, authorId: user.id, classId: user.classId };
    setAllExams(prev => [...prev, newItem].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('CREATE_EXAM', `Examen programmé : "${item.subject}"`, 'WARNING');
    showNotification("Examen programmé.", 'SUCCESS', 'ds');
  };

  const updateExam = async (id: string, item: Partial<Exam>) => {
    const { error } = await supabase.from('exams').update({
       subject: item.subject,
       date: item.date,
       duration_minutes: item.durationMinutes,
       room: item.room,
       notes: item.notes
    }).eq('id', id);

    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    setAllExams(prev => prev.map(e => e.id === id ? { ...e, ...item } : e).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    logAction('UPDATE_EXAM', `Mise à jour Examen ID: ${id}`);
    showNotification("Examen mis à jour.", 'SUCCESS', 'ds');
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

    setAllExams(prev => prev.filter(e => e.id !== id));
    logAction('DELETE_EXAM', `Suppression Examen ID: ${id}`, 'CRITICAL');
    showNotification("Examen supprimé.", 'WARNING', 'ds');
  };

  // --- Polls Logic (Tricky relation handling) ---

  const addPoll = async (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => {
    if (!user || !user.classId) return;

    // 1. Create Poll
    const { data: pollData, error: pollError } = await supabase.from('polls').insert([{
      question: item.question,
      type: item.type,
      is_anonymous: item.isAnonymous,
      active: item.active,
      class_id: user.classId
    }]).select().single();

    if (pollError || !pollData) return showNotification("Erreur création sondage.", 'ERROR');

    // 2. Create Options
    const optionsToInsert = item.options.map(opt => ({
      poll_id: pollData.id,
      label: opt.label
    }));

    const { data: optionsData, error: optError } = await supabase.from('poll_options').insert(optionsToInsert).select();
    
    if (optError) return showNotification("Erreur création options.", 'ERROR');

    // Reconstruct local state
    const newOptions: PollOption[] = optionsData.map(o => ({
      id: o.id,
      label: o.label,
      voterIds: []
    }));

    const newPoll: Poll = {
      id: pollData.id,
      question: item.question,
      type: item.type,
      active: item.active,
      isAnonymous: item.isAnonymous,
      createdAt: pollData.created_at,
      classId: user.classId,
      options: newOptions
    };

    setAllPolls(prev => [newPoll, ...prev]);
    logAction('CREATE_POLL', `Sondage créé : "${item.question}"`);
    showNotification("Sondage publié.", 'SUCCESS', 'polls');
  };

  const updatePoll = async (id: string, item: Partial<Poll>) => {
    // Note: This implementation only updates the question/status/anonymity.
    // Changing options is complex (delete old, add new, lose votes).
    // For now we assume mostly question update.
    
    const { error } = await supabase.from('polls').update({
       question: item.question,
       is_anonymous: item.isAnonymous,
       active: item.active
    }).eq('id', id);

    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    // We refresh all data to be safe regarding options
    refreshAllData();
    logAction('UPDATE_POLL', `Mise à jour Sondage ID: ${id}`);
    showNotification("Sondage modifié.", 'SUCCESS', 'polls');
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    
    // 1. Check existing vote for this poll and user
    // Since we support SINGLE vote type primarily, we delete any previous vote for this poll/user
    await supabase.from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    // 2. Insert new vote
    const { error } = await supabase.from('poll_votes').insert([{
      poll_id: pollId,
      option_id: optionId,
      user_id: user.id
    }]);

    if (error) return showNotification("Erreur vote.", 'ERROR');

    // 3. Update local state manually for speed
    setAllPolls(prev => prev.map(poll => {
      if (poll.id !== pollId) return poll;
      
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

    logAction('VOTE_POLL', `Vote enregistré.`);
    showNotification("A voté !", 'SUCCESS', 'polls');
  };

  const deletePoll = async (id: string) => {
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

    setAllPolls(prev => prev.filter(p => p.id !== id));
    logAction('DELETE_POLL', `Suppression Sondage ID: ${id}`, 'WARNING');
    showNotification("Sondage supprimé.", 'INFO', 'polls');
  };

  // --- Admin Logic ---

  const addClass = async (name: string, description: string) => {
    const { data, error } = await supabase.from('classes').insert([{
      name, description
    }]).select().single();

    if (error) return showNotification("Erreur création classe.", 'ERROR');

    setClasses(prev => [...prev, data]);
    logAction('CREATE_CLASS', `Création classe : "${name}"`, 'WARNING');
    showNotification("Nouvelle classe créée.", 'SUCCESS', 'admin');
  };

  const updateClass = async (id: string, item: Partial<ClassGroup>) => {
    const { error } = await supabase.from('classes').update(item).eq('id', id);
    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...item } : c));
    logAction('UPDATE_CLASS', `Mise à jour classe ID: ${id}`);
    showNotification("Classe mise à jour.", 'SUCCESS', 'admin');
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

    setClasses(prev => prev.filter(c => c.id !== id));
    logAction('DELETE_CLASS', `Suppression classe ID: ${id}`, 'CRITICAL');
    showNotification("Classe supprimée.", 'WARNING', 'admin');
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    // Note: Creating user in public table. 
    // In real auth, you would use supabase.auth.signUp
    const { data, error } = await supabase.from('users').insert([{
      name: userData.name,
      email: userData.email,
      role: userData.role,
      class_id: userData.classId
    }]).select().single();

    if (error) return showNotification("Erreur création utilisateur.", 'ERROR');

    const newUser: User = { ...userData, id: data.id };
    setAllUsers(prev => [...prev, newUser]);
    logAction('CREATE_USER', `Nouvel utilisateur : ${newUser.name}`);
    showNotification("Utilisateur ajouté.", 'SUCCESS', 'admin');
  };

  const importUsers = async (usersData: Omit<User, 'id'>[]) => {
    // Prepare data for DB (map to snake_case)
    const dbData = usersData.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      class_id: u.classId || null // Explicit null for DB
    }));

    const { data, error } = await supabase.from('users').insert(dbData).select();

    if (error) {
      console.error(error);
      return showNotification("Erreur import CSV.", 'ERROR');
    }

    // Refresh local users list to get IDs
    const newUsers = data.map(d => ({
       id: d.id,
       name: d.name,
       email: d.email,
       role: d.role,
       classId: d.class_id
    }));
    
    setAllUsers(prev => [...prev, ...newUsers]);
    logAction('IMPORT_USERS', `Import CSV : ${usersData.length} utilisateurs ajoutés.`);
    showNotification(`${usersData.length} utilisateurs importés avec succès.`, 'SUCCESS', 'admin');
  };

  const updateUser = async (id: string, item: Partial<User>) => {
    const { error } = await supabase.from('users').update({
       name: item.name,
       email: item.email,
       role: item.role,
       class_id: item.classId
    }).eq('id', id);

    if (error) return showNotification("Erreur mise à jour.", 'ERROR');

    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...item } : u));
    if (user && user.id === id) setUser(prev => prev ? { ...prev, ...item } : null);
    
    logAction('UPDATE_USER', `Mise à jour utilisateur ID: ${id}`);
    showNotification("Utilisateur mis à jour.", 'SUCCESS', 'admin');
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return showNotification("Erreur suppression.", 'ERROR');

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
    importUsers,
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
