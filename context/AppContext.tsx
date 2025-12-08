import React, { createContext, useContext, useState, PropsWithChildren, useMemo, useEffect } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, PollOption, SentEmail } from '../types';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

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
          classId: u.class_id,
          avatar: u.avatar
        })));
        
        // Refresh current user if logged in
        if (user) {
          const freshCurrentUser = userData.find(u => u.id === user.id);
          if (freshCurrentUser) {
             const mappedUser = {
                id: freshCurrentUser.id,
                name: freshCurrentUser.name,
                email: freshCurrentUser.email,
                role: freshCurrentUser.role,
                classId: freshCurrentUser.class_id,
                avatar: freshCurrentUser.avatar
             };
             // Only update state if something changed to avoid loop
             if (JSON.stringify(mappedUser) !== JSON.stringify(user)) {
                setUser(mappedUser);
                localStorage.setItem('sunuclasse_user', JSON.stringify(mappedUser));
             }
          }
        }
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
        })));
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
        })));
      }

      // 7. Fetch Polls
      const { data: pollData } = await supabase.from('polls').select('*');
      if (pollData) {
        setAllPolls(pollData.map(p => ({
          id: p.id,
          question: p.question,
          type: p.type,
          options: p.options, // Already JSON in Supabase response
          active: p.active,
          createdAt: p.created_at,
          isAnonymous: p.is_anonymous,
          classId: p.class_id
        })));
      }
      
      // 8. Fetch Audit Logs
      const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      if (logsData) setAuditLogs(logsData);
      
      // 9. Fetch Sent Emails (History)
      const { data: emailsData } = await supabase.from('sent_emails').select('*').order('created_at', { ascending: false }).limit(50);
      if (emailsData) setSentEmails(emailsData);

    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // --- Filtering based on User Role & Class ---
  const announcements = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return allAnnouncements;
    return allAnnouncements.filter(a => a.classId === user.classId);
  }, [allAnnouncements, user]);

  const meets = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return allMeets;
    return allMeets.filter(m => m.classId === user.classId);
  }, [allMeets, user]);

  const exams = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return allExams;
    return allExams.filter(e => e.classId === user.classId);
  }, [allExams, user]);

  const polls = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return allPolls;
    return allPolls.filter(p => p.classId === user.classId);
  }, [allPolls, user]);

  // --- Helper Functions ---
  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    // Update history (persistent)
    const updatedHistory = [newNotif, ...notificationHistory].slice(0, 50); // Keep last 50
    setNotificationHistory(updatedHistory);
    sessionStorage.setItem('sunuclasse_notifs_history', JSON.stringify(updatedHistory));

    // Auto dismiss toast after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markNotificationAsRead = (id: string) => {
    const updated = notificationHistory.map(n => n.id === id ? { ...n, read: true } : n);
    setNotificationHistory(updated);
    sessionStorage.setItem('sunuclasse_notifs_history', JSON.stringify(updated));
  };

  const markAllNotificationsAsRead = () => {
    const updated = notificationHistory.map(n => ({ ...n, read: true }));
    setNotificationHistory(updated);
    sessionStorage.setItem('sunuclasse_notifs_history', JSON.stringify(updated));
  };

  const deleteNotification = (id: string) => {
    const updated = notificationHistory.filter(n => n.id !== id);
    setNotificationHistory(updated);
    sessionStorage.setItem('sunuclasse_notifs_history', JSON.stringify(updated));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
    sessionStorage.removeItem('sunuclasse_notifs_history');
  };

  const logAction = async (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert({
        action,
        details,
        author: user.name,
        role: user.role,
        severity,
        timestamp: new Date().toISOString()
      });
      // Refresh logs
      const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      if (logsData) setAuditLogs(logsData);
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  const setSchoolName = async (name: string) => {
    if (user?.role !== Role.ADMIN) return;
    try {
      const { error } = await supabase.from('app_settings').update({ value: name }).eq('key', 'school_name');
      if (error) throw error;
      setSchoolNameLocal(name);
      addNotification({ message: 'Nom de l\'établissement mis à jour.', type: 'SUCCESS' });
      logAction('UPDATE_SETTINGS', `Nouveau nom: ${name}`);
    } catch (e) {
      addNotification({ message: 'Erreur mise à jour paramètres', type: 'ERROR' });
    }
  };

  const getCurrentClass = () => {
    return classes.find(c => c.id === user?.classId);
  };

  // --- AUTH ACTIONS ---
  const login = async (email: string) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !users) return false;

      const loggedUser = {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        classId: users.class_id,
        avatar: users.avatar
      };

      setUser(loggedUser);
      localStorage.setItem('sunuclasse_user', JSON.stringify(loggedUser));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sunuclasse_user');
  };

  // --- CONTENT ACTIONS ---
  
  const addAnnouncement = async (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => {
    if (!user || !user.classId) return;
    try {
      const { error } = await supabase.from('announcements').insert({
        title: item.title,
        content: item.content,
        date: item.date,
        urgency: item.urgency,
        author_id: user.id,
        class_id: user.classId
      });
      if (error) throw error;
      
      await refreshAllData();
      addNotification({ message: 'Annonce publiée avec succès !', type: 'SUCCESS' });
      logAction('CREATE_ANNOUNCEMENT', `Titre: ${item.title}`);
    } catch (e) {
      addNotification({ message: 'Erreur lors de la publication', type: 'ERROR' });
    }
  };

  const updateAnnouncement = async (id: string, item: Partial<Announcement>) => {
    try {
      const { error } = await supabase.from('announcements').update(item).eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Annonce mise à jour.', type: 'SUCCESS' });
      logAction('UPDATE_ANNOUNCEMENT', `ID: ${id}`);
    } catch (e) {
      addNotification({ message: 'Erreur lors de la mise à jour', type: 'ERROR' });
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Annonce supprimée.', type: 'INFO' });
      logAction('DELETE_ANNOUNCEMENT', `ID: ${id}`, 'WARNING');
    } catch (e) {
      addNotification({ message: 'Erreur lors de la suppression', type: 'ERROR' });
    }
  };

  const addMeet = async (item: Omit<MeetSession, 'id' | 'classId'>, targetRoles?: Role[]) => {
    if (!user || !user.classId) return;
    try {
      const { error } = await supabase.from('meets').insert({
        subject: item.subject,
        link: item.link,
        date: item.date,
        teacher_name: item.teacherName,
        class_id: user.classId
      });
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Session Meet programmée.', type: 'SUCCESS' });
      logAction('CREATE_MEET', `Sujet: ${item.subject}`);
    } catch (e) {
      addNotification({ message: 'Erreur création Meet', type: 'ERROR' });
    }
  };

  const updateMeet = async (id: string, item: Partial<MeetSession>) => {
    try {
      const payload: any = { ...item };
      if (item.teacherName) {
         payload.teacher_name = item.teacherName;
         delete payload.teacherName;
      }
      const { error } = await supabase.from('meets').update(payload).eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Meet mis à jour.', type: 'SUCCESS' });
    } catch (e) {
      addNotification({ message: 'Erreur mise à jour Meet', type: 'ERROR' });
    }
  };

  const deleteMeet = async (id: string) => {
    try {
      const { error } = await supabase.from('meets').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Meet supprimé.', type: 'INFO' });
      logAction('DELETE_MEET', `ID: ${id}`, 'WARNING');
    } catch (e) {
      addNotification({ message: 'Erreur suppression Meet', type: 'ERROR' });
    }
  };

  const addExam = async (item: Omit<Exam, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => {
    if (!user || !user.classId) return;
    try {
      const { error } = await supabase.from('exams').insert({
        subject: item.subject,
        date: item.date,
        duration_minutes: item.durationMinutes,
        room: item.room,
        notes: item.notes,
        author_id: user.id,
        class_id: user.classId
      });
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Examen planifié.', type: 'SUCCESS', targetPage: 'ds' });
      logAction('CREATE_EXAM', `Sujet: ${item.subject}`);
    } catch (e) {
      addNotification({ message: 'Erreur planification Examen', type: 'ERROR' });
    }
  };

  const updateExam = async (id: string, item: Partial<Exam>) => {
    try {
      const payload: any = { ...item };
      if (item.durationMinutes) {
        payload.duration_minutes = item.durationMinutes;
        delete payload.durationMinutes;
      }
      const { error } = await supabase.from('exams').update(payload).eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Examen mis à jour.', type: 'SUCCESS' });
    } catch (e) {
      addNotification({ message: 'Erreur mise à jour Examen', type: 'ERROR' });
    }
  };

  const deleteExam = async (id: string) => {
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Examen supprimé.', type: 'INFO' });
      logAction('DELETE_EXAM', `ID: ${id}`, 'WARNING');
    } catch (e) {
      addNotification({ message: 'Erreur suppression Examen', type: 'ERROR' });
    }
  };

  const addPoll = async (item: Omit<Poll, 'id' | 'createdAt' | 'classId'>) => {
    if (!user || !user.classId) return;
    try {
      const { error } = await supabase.from('polls').insert({
        question: item.question,
        type: item.type,
        options: item.options,
        active: item.active,
        is_anonymous: item.isAnonymous,
        class_id: user.classId
      });
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Sondage lancé !', type: 'SUCCESS', targetPage: 'polls' });
      logAction('CREATE_POLL', `Question: ${item.question}`);
    } catch (e) {
      addNotification({ message: 'Erreur création Sondage', type: 'ERROR' });
    }
  };

  const updatePoll = async (id: string, item: Partial<Poll>) => {
    try {
      const payload: any = { ...item };
      if (item.isAnonymous !== undefined) {
         payload.is_anonymous = item.isAnonymous;
         delete payload.isAnonymous;
      }
      const { error } = await supabase.from('polls').update(payload).eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Sondage mis à jour.', type: 'SUCCESS' });
    } catch (e) {
      addNotification({ message: 'Erreur mise à jour Sondage', type: 'ERROR' });
    }
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    try {
      // Logic handled via RPC or simple update. Here assuming optimistic update logic for simplicity
      const poll = allPolls.find(p => p.id === pollId);
      if (!poll) return;

      // Remove user from all other options
      const newOptions = poll.options.map(opt => ({
        ...opt,
        voterIds: opt.voterIds.filter(id => id !== user.id)
      }));

      // Add to selected
      const selectedOpt = newOptions.find(o => o.id === optionId);
      if (selectedOpt) selectedOpt.voterIds.push(user.id);

      const { error } = await supabase.from('polls').update({ options: newOptions }).eq('id', pollId);
      if (error) throw error;
      
      await refreshAllData();
      addNotification({ message: 'Vote enregistré.', type: 'SUCCESS' });
    } catch (e) {
      addNotification({ message: 'Erreur lors du vote', type: 'ERROR' });
    }
  };

  const deletePoll = async (id: string) => {
    try {
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Sondage supprimé.', type: 'INFO' });
      logAction('DELETE_POLL', `ID: ${id}`, 'WARNING');
    } catch (e) {
      addNotification({ message: 'Erreur suppression Sondage', type: 'ERROR' });
    }
  };

  // --- SHARE FUNCTION (ENVOI EMAIL) ---
  const shareResource = async (type: 'ANNOUNCEMENT' | 'MEET' | 'EXAM' | 'POLL', item: any) => {
    if (!user || !user.classId) return;

    try {
        const currentClass = classes.find(c => c.id === user.classId);
        // Prioritize class mailing list
        let targetEmail = currentClass?.email;
        let recipientDescription = "";

        // If string is empty/whitespace, treat as null
        if (targetEmail && targetEmail.trim() === '') targetEmail = undefined;

        if (targetEmail) {
            recipientDescription = `Liste de la classe (${targetEmail})`;
        } else {
            // Fallback: we simulate sending to all students
            const studentsCount = allUsers.filter(u => u.classId === user.classId && u.role === Role.STUDENT).length;
            targetEmail = ""; // If no class email, we rely on the prompt or let the user fill manually in mail client
            recipientDescription = `Tous les étudiants (Ouverture Client Mail)`;
        }

        // GENERATE CONTENT
        let subject = "";
        let bodyHtml = "";
        let bodyText = ""; // Plain text for mailto
        const footer = `<br><hr><p style="font-size:12px; color:#666;">Envoyé via SunuClasse par ${user.name}</p>`;

        switch (type) {
          case 'ANNOUNCEMENT':
             subject = `📢 Annonce : ${item.title}`;
             bodyHtml = `<h2>${item.title}</h2><p><strong>Urgence :</strong> ${item.urgency}</p><div style="background:#f9f9f9; padding:15px; border-left:4px solid orange;">${item.content.replace(/\n/g, '<br>')}</div><p>Date : ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}</p>`;
             bodyText = `ANNONCE: ${item.title}\n\n${item.content}\n\nDate: ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}`;
             break;
          case 'MEET':
             subject = `📹 Nouveau cours vidéo : ${item.subject}`;
             bodyHtml = `<h2>${item.subject}</h2><p><strong>Enseignant :</strong> ${item.teacherName}</p><p><strong>Date :</strong> ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}</p><p><a href="${item.link}" style="background:#047857; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Rejoindre la réunion</a></p>`;
             bodyText = `COURS VIDEO: ${item.subject}\nEnseignant: ${item.teacherName}\nDate: ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}\n\nLien: ${item.link}`;
             break;
          case 'EXAM':
             subject = `📅 Examen programmé : ${item.subject}`;
             bodyHtml = `<h2>Examen de ${item.subject}</h2><p><strong>Date :</strong> ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}</p><p><strong>Durée :</strong> ${item.durationMinutes} min</p><p><strong>Salle :</strong> ${item.room}</p><p><strong>Notes :</strong> ${item.notes || 'Aucune'}</p>`;
             bodyText = `EXAMEN: ${item.subject}\nDate: ${format(new Date(item.date), 'dd/MM/yyyy HH:mm', {locale: fr})}\nSalle: ${item.room}\nDurée: ${item.durationMinutes} min\nNotes: ${item.notes || 'Aucune'}`;
             break;
          case 'POLL':
             subject = `📊 Nouveau Sondage : ${item.question}`;
             bodyHtml = `<h2>Sondage</h2><p><strong>Question :</strong> ${item.question}</p><p>Connectez-vous à SunuClasse pour voter !</p>`;
             bodyText = `SONDAGE: ${item.question}\n\nConnectez-vous à SunuClasse pour voter !`;
             break;
        }

        bodyHtml += footer;
        bodyText += `\n\n--\nEnvoyé via SunuClasse par ${user.name}`;

        // 1. INSERT INTO DATABASE (History)
        // We do this BEFORE opening mailto to ensure log exists
        const { error } = await supabase.from('sent_emails').insert({
           recipient_email: targetEmail || 'Destinataires multiples',
           subject: subject,
           body_html: bodyHtml,
           resource_type: type,
           sender_name: user.name,
           class_id: user.classId
        });

        if (error) throw error;
        
        // Refresh to show in Admin Panel immediately
        const { data: emailsData } = await supabase.from('sent_emails').select('*').order('created_at', { ascending: false }).limit(50);
        if (emailsData) setSentEmails(emailsData);

        await logAction('SHARE', `Partage ${type} : ${item.title || item.subject || item.question}`);
        
        addNotification({
            message: `Historique enregistré. Ouverture de votre messagerie...`,
            type: 'SUCCESS'
        });

        // 2. OPEN MAIL CLIENT
        const mailtoLink = `mailto:${targetEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
        window.location.href = mailtoLink;

    } catch (e: any) {
        console.error("Erreur envoi email:", e);
        addNotification({ message: "Erreur lors de l'enregistrement de l'envoi.", type: 'ERROR' });
    }
  };


  // --- ADMIN ACTIONS ---

  const addClass = async (name: string, description: string, email: string) => {
    try {
      const payload: any = { name, description };
      if (email && email.trim() !== '') payload.email = email.trim();
      
      const { error } = await supabase.from('classes').insert(payload);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Classe créée.', type: 'SUCCESS' });
      logAction('CREATE_CLASS', `Nom: ${name}`);
    } catch (e: any) {
      const msg = e.message || JSON.stringify(e);
      addNotification({ message: `Erreur création classe: ${msg}`, type: 'ERROR' });
    }
  };

  const updateClass = async (id: string, item: Partial<ClassGroup>) => {
    try {
      const payload: any = { ...item };
      // Sanitize empty strings to null for database compatibility
      if (payload.email === '') payload.email = null;
      if (payload.description === '') payload.description = null;
      
      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const { error } = await supabase.from('classes').update(payload).eq('id', id);
      if (error) throw error;
      
      await refreshAllData();
      addNotification({ message: 'Classe mise à jour.', type: 'SUCCESS' });
      logAction('UPDATE_CLASS', `ID: ${id}`);
    } catch (e: any) {
      // Robust error handling to avoid [object Object]
      console.error("Update Class Error:", e);
      const msg = e.message || e.details || "Erreur inconnue";
      addNotification({ message: `Erreur mise à jour classe: ${msg}`, type: 'ERROR' });
    }
  };

  const deleteClass = async (id: string) => {
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Classe supprimée.', type: 'WARNING' });
      logAction('DELETE_CLASS', `ID: ${id}`, 'CRITICAL');
    } catch (e) {
      addNotification({ message: 'Impossible de supprimer (contient des données ?)', type: 'ERROR' });
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const payload: any = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        class_id: userData.classId || null // Ensure null if empty string
      };

      const { error } = await supabase.from('users').insert(payload);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Utilisateur ajouté.', type: 'SUCCESS' });
      logAction('CREATE_USER', `Email: ${userData.email}`);
    } catch (e: any) {
      const msg = e.message || "Erreur";
      addNotification({ message: `Erreur ajout utilisateur: ${msg}`, type: 'ERROR' });
    }
  };

  const importUsers = async (usersData: Omit<User, 'id'>[]) => {
    try {
      const payload = usersData.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        class_id: u.classId || null
      }));
      const { error } = await supabase.from('users').insert(payload);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: `${usersData.length} utilisateurs importés.`, type: 'SUCCESS' });
      logAction('IMPORT_USERS', `Nombre: ${usersData.length}`);
    } catch (e) {
      addNotification({ message: 'Erreur import CSV', type: 'ERROR' });
    }
  };

  const updateUser = async (id: string, item: Partial<User>) => {
    try {
      const payload: any = { ...item };
      if (item.classId !== undefined) {
        payload.class_id = item.classId === '' ? null : item.classId;
        delete payload.classId;
      }
      
      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Utilisateur mis à jour.', type: 'SUCCESS' });
    } catch (e: any) {
      const msg = e.message || "Erreur";
      addNotification({ message: `Erreur mise à jour: ${msg}`, type: 'ERROR' });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await refreshAllData();
      addNotification({ message: 'Utilisateur supprimé.', type: 'INFO' });
      logAction('DELETE_USER', `ID: ${id}`, 'WARNING');
    } catch (e) {
      addNotification({ message: 'Erreur suppression utilisateur', type: 'ERROR' });
    }
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
    sentEmails,
    notifications,
    notificationHistory,
    dismissNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
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
    shareResource,
    addClass,
    updateClass,
    deleteClass,
    addUser,
    importUsers,
    updateUser,
    deleteUser,
    getCurrentClass
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