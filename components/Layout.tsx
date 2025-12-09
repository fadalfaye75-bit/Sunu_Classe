import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Megaphone, 
  Video,
  CalendarDays, 
  Vote, 
  LogOut, 
  Menu, 
  X,
  UserCircle,
  School,
  Settings,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  Trash2,
  Clock,
  ArrowLeft,
  Upload,
  Pencil,
  Check,
  Archive,
  GraduationCap
} from 'lucide-react';
import { Role, Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from './UserAvatar';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

// Preset avatars (SunuClasse Themed)
const AVATAR_PRESETS = [
  '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '🦁', '🦅', '🐘', '🌍', '☀️', '📚', '⚽', '💻', '🚀', '🎨', '🎵', '🇸🇳'
];

// UCAD Logo URL
const LOGO_UCAD = "https://upload.wikimedia.org/wikipedia/fr/4/43/Logo_UCAD.png";

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { 
    user, 
    logout, 
    getCurrentClass, 
    schoolName, 
    notifications, 
    dismissNotification, 
    notificationHistory, 
    clearNotificationHistory, 
    updateUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification 
  } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  
  // Time State (Dakar)
  const [dakarTime, setDakarTime] = useState("");
  
  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Logo Error State
  const [logoError, setLogoError] = useState(false);

  const currentClass = getCurrentClass();

  // Update clock every second (Dakar TimeZone)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Force Timezone to Africa/Dakar (GMT)
      const timeString = now.toLocaleTimeString('fr-SN', {
        timeZone: 'Africa/Dakar',
        hour: '2-digit',
        minute: '2-digit'
      });
      setDakarTime(timeString);
    };

    updateClock(); // Initial call
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'infos', label: 'Annonces', icon: Megaphone, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'meet', label: 'Visio / Meet', icon: Video, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'ds', label: 'Examens (DS)', icon: CalendarDays, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'polls', label: 'Sondages', icon: Vote, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'admin', label: user?.role === Role.ADMIN ? 'Administration' : 'Gestion Classe', icon: Settings, roles: [Role.ADMIN, Role.RESPONSIBLE] },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const handleNotificationClick = (notif: Notification) => {
    markNotificationAsRead(notif.id);
    if (notif.targetPage) {
      onNavigate(notif.targetPage);
      setIsNotifMenuOpen(false);
    }
  };

  const getRoleLabel = () => {
    switch(user?.role) {
      case Role.ADMIN: return 'Administrateur';
      case Role.RESPONSIBLE: return 'Responsable';
      case Role.STUDENT: return 'Étudiant';
      default: return '';
    }
  };

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const unreadCount = notificationHistory.filter(n => !n.read).length;

  const BackButton = ({ mobile = false }) => {
    if (currentPage === 'dashboard') return null;
    return (
      <button 
        onClick={() => onNavigate('dashboard')} 
        className={`${mobile ? 'mr-3 p-1 text-sky-100 hover:text-white' : 'mr-4 p-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition shadow-sm'}`}
      >
        <ArrowLeft className={`${mobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
      </button>
    );
  };

  const handleAvatarSelect = (preset: string) => {
    if (user) {
      updateUser(user.id, { avatar: preset });
      setIsProfileModalOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUser(user.id, { avatar: base64String });
        setIsProfileModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors duration-300">
      
      {/* --- Notification Toast Container --- */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((notif) => (
          <div 
            key={notif.id}
            className={`
              pointer-events-auto transform transition-all duration-300 ease-in-out hover:scale-102 cursor-pointer
              max-w-sm w-full shadow-lg rounded-xl border-l-4 p-4 flex items-start gap-3 bg-white dark:bg-slate-900
              ${notif.type === 'SUCCESS' ? 'border-emerald-500 shadow-emerald-500/10' : 
                notif.type === 'ERROR' ? 'border-red-500 shadow-red-500/10' : 
                notif.type === 'WARNING' ? 'border-orange-500 shadow-orange-500/10' : 
                'border-sky-500 shadow-sky-500/10'}
            `}
            onClick={() => {
              if (notif.targetPage) onNavigate(notif.targetPage);
              dismissNotification(notif.id);
            }}
          >
             {notif.type === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
             {notif.type === 'ERROR' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
             {notif.type === 'WARNING' && <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />}
             {notif.type === 'INFO' && <Info className="w-5 h-5 text-sky-500 shrink-0" />}
             <div className="flex-1">
               <h4 className={`font-bold text-sm
                 ${notif.type === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-400' : 
                   notif.type === 'ERROR' ? 'text-red-700 dark:text-red-400' : 
                   notif.type === 'WARNING' ? 'text-orange-700 dark:text-orange-400' : 
                   'text-sky-700 dark:text-sky-400'}
               `}>
                 {notif.type === 'SUCCESS' ? 'Succès' : notif.type === 'ERROR' ? 'Erreur' : notif.type === 'WARNING' ? 'Attention' : 'Information'}
               </h4>
               <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">{notif.message}</p>
             </div>
             <button onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
               <X className="w-4 h-4" />
             </button>
          </div>
        ))}
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-sky-600 to-sky-700 text-white p-4 flex justify-between items-center shadow-md z-50 sticky top-0">
        <div className="flex items-center">
          <BackButton mobile />
          <div className="font-bold text-lg flex items-center gap-2">
            {currentPage === 'dashboard' && (
              <div className="bg-white rounded-full p-0.5 w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
                {logoError ? (
                  <School className="w-5 h-5 text-sky-600" />
                ) : (
                  <img 
                    src={LOGO_UCAD} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
            )}
            <span>{schoolName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className="relative text-sky-100 hover:text-white transition">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-sky-600">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:bg-white/10 p-1 rounded transition">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Notification Dropdown */}
        {isNotifMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl max-h-[60vh] overflow-y-auto z-[60]">
             <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">Notifications</h4>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1 hover:underline">
                      <Check className="w-3 h-3" /> Tout lire
                    </button>
                  )}
                  {notificationHistory.length > 0 && (
                    <button onClick={clearNotificationHistory} className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 hover:underline">
                      <Trash2 className="w-3 h-3" /> Effacer
                    </button>
                  )}
                </div>
             </div>
             <div>
                {notificationHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">Aucune notification récente.</div>
                ) : (
                  notificationHistory.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 border-b border-slate-100 dark:border-slate-800 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition relative group ${!notif.read ? 'bg-sky-50 dark:bg-sky-900/10' : 'bg-white dark:bg-slate-900'}`}
                    >
                       <div 
                         onClick={() => handleNotificationClick(notif)}
                         className={`flex-1 flex gap-3 cursor-pointer`}
                       >
                         <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            notif.type === 'SUCCESS' ? 'bg-emerald-500' : 
                            notif.type === 'ERROR' ? 'bg-red-500' : 
                            notif.type === 'WARNING' ? 'bg-orange-500' : 'bg-sky-500'
                         }`} />
                         <div className="flex-1">
                            <p className={`text-slate-800 dark:text-slate-200 text-sm leading-tight pr-6 ${!notif.read ? 'font-semibold' : 'font-normal text-slate-600'}`}>
                              {notif.message}
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 flex items-center gap-1">
                               <Clock className="w-3 h-3" /> {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr }) : 'À l\'instant'}
                            </p>
                         </div>
                       </div>
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                         className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                       >
                          <Archive className="w-4 h-4" />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-300 ease-in-out
        bg-slate-900 dark:bg-slate-950 w-64 shadow-xl z-40 flex flex-col border-r border-slate-800
      `}>
        {/* Sidebar Header */}
        <div className="p-6 text-white hidden md:block border-b border-slate-800 bg-slate-950">
           <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden shrink-0">
               {logoError ? (
                  <School className="w-6 h-6 text-sky-600" />
               ) : (
                  <img 
                    src={LOGO_UCAD} 
                    alt="Logo UCAD" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
               )}
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight text-white">
                 {schoolName}
               </h1>
               <p className="text-sky-400 text-xs mt-0.5 font-medium uppercase tracking-wide">{currentClass ? currentClass.name : 'Portail'}</p>
             </div>
           </div>
        </div>

        {/* Mobile User Info */}
        <div className="p-4 md:hidden bg-slate-800 border-b border-slate-700 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
           <div className="flex items-center gap-3">
              <UserAvatar user={user} size="md" />
              <div>
                <p className="font-bold text-white">{user?.name}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-sky-300">{getRoleLabel()}</p>
                  <Pencil className="w-3 h-3 text-sky-400 opacity-60" />
                </div>
              </div>
           </div>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                currentPage === item.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentPage === item.id ? 'text-white' : 'group-hover:text-white text-slate-500'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Desktop User Info Bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
           <div 
             className="hidden md:flex items-center gap-3 mb-3 px-2 cursor-pointer hover:bg-slate-900 p-2 rounded-lg transition group"
             onClick={() => setIsProfileModalOpen(true)}
           >
              <div className="relative">
                <UserAvatar user={user} size="sm" className="ring-2 ring-slate-700 group-hover:ring-sky-500 transition" />
                <div className="absolute -bottom-1 -right-1 bg-sky-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition">
                   <Pencil className="w-2 h-2" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="font-medium text-sm text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{getRoleLabel()}</p>
              </div>
           </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
        
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-20 items-center justify-between px-8 shadow-sm z-30 sticky top-0">
           <div className="flex items-center gap-4">
             <BackButton />
             <div>
               <h2 className="font-bold text-2xl text-slate-800 dark:text-white tracking-tight">
                 {user?.role === Role.ADMIN ? 'Espace Administration' : (currentClass?.name || 'Tableau de bord')}
               </h2>
               
               <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                  <span>Année 2025-2026</span>
                  <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                  <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded text-xs font-semibold border border-sky-100 dark:border-sky-800">
                     <Clock className="w-3 h-3" />
                     {dakarTime} <span className="opacity-70 ml-1">GMT</span>
                  </span>
               </div>
             </div>
           </div>
           
           <div className="flex items-center gap-6">
              {/* Notification Bell Desktop */}
              <div className="relative">
                <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className="p-2.5 rounded-full text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition relative">
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Desktop Notification Dropdown */}
                {isNotifMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[60] origin-top-right ring-1 ring-black/5">
                     <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wide">Notifications</h4>
                        <div className="flex gap-2">
                           {unreadCount > 0 && (
                             <button onClick={markAllNotificationsAsRead} className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:bg-sky-50 dark:hover:bg-sky-900/30 px-2 py-1 rounded transition">
                               Tout lire
                             </button>
                           )}
                           {notificationHistory.length > 0 && (
                             <button onClick={clearNotificationHistory} className="text-xs text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded transition">
                               Effacer
                             </button>
                           )}
                        </div>
                     </div>
                     <div className="max-h-[400px] overflow-y-auto">
                        {notificationHistory.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center text-slate-400">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <span className="text-sm font-medium">Rien à signaler</span>
                          </div>
                        ) : (
                          notificationHistory.map(notif => (
                            <div 
                              key={notif.id} 
                              className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex gap-3 relative group ${!notif.read ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}
                            >
                               <div 
                                 className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                    notif.type === 'SUCCESS' ? 'bg-emerald-500' : 
                                    notif.type === 'ERROR' ? 'bg-red-500' : 
                                    notif.type === 'WARNING' ? 'bg-orange-500' : 'bg-sky-500'
                                 }`} 
                               />
                               
                               <div 
                                 onClick={() => handleNotificationClick(notif)}
                                 className={`flex-1 ${notif.targetPage ? 'cursor-pointer' : ''}`}
                               >
                                  <p className={`text-slate-800 dark:text-slate-200 text-sm leading-snug pr-6 ${!notif.read ? 'font-semibold' : 'font-normal text-slate-600'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-slate-400 text-[10px] mt-1 font-medium">
                                    {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr }) : 'Récent'}
                                  </p>
                               </div>

                               <button 
                                 onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                 className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition"
                               >
                                  <Archive className="w-4 h-4" />
                               </button>
                            </div>
                          ))
                        )}
                     </div>
                  </div>
                )}
              </div>

              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                ${user?.role === Role.ADMIN ? 'bg-red-100 text-red-700 border border-red-200' : 
                  user?.role === Role.RESPONSIBLE ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                  'bg-sky-100 text-sky-700 border border-sky-200'}`}>
                {getRoleLabel()}
              </span>
           </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
           {children}
        </div>
      </main>

      {/* --- Profile Avatar Modal --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-sky-600" /> Profil Utilisateur
                 </h3>
                 <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[80vh]">
                 
                 <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <UserAvatar user={user} size="xl" className="shadow-lg" />
                       <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-[1px]">
                          <Upload className="w-6 h-6 text-white" />
                       </div>
                    </div>
                    <h4 className="font-bold text-xl text-slate-900 dark:text-white">{user?.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{getRoleLabel()}</p>
                 </div>

                 <div className="space-y-6">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">Choisir un avatar</label>
                       <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                          {AVATAR_PRESETS.map((avatar, idx) => (
                             <button 
                               key={idx}
                               onClick={() => handleAvatarSelect(avatar)}
                               className={`
                                 text-2xl h-12 rounded-xl border flex items-center justify-center transition
                                 hover:scale-105 hover:shadow-sm
                                 ${user?.avatar === avatar ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200' : 'bg-slate-50 border-slate-200 hover:border-sky-300'}
                               `}
                             >
                               {avatar}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">Ou importer une image</label>
                        <input 
                           type="file" 
                           accept="image/*" 
                           ref={fileInputRef} 
                           className="hidden"
                           onChange={handleFileUpload}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition cursor-pointer gap-2"
                        >
                           <Upload className="w-6 h-6 opacity-50" />
                           <span className="font-medium text-sm">Cliquez pour importer une photo</span>
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};