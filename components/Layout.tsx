
import React, { useState, useRef } from 'react';
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
  Camera,
  Upload,
  Pencil,
  Check,
  Archive
} from 'lucide-react';
import { Role, Notification, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

// Preset avatars (SunuClasse Themed)
const AVATAR_PRESETS = [
  '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '🦁', '🦅', '🐘', '🌍', '☀️', '📚', '⚽', '💻', '🚀', '🎨', '🎵', '🇸🇳'
];

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
  
  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentClass = getCurrentClass();

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
      case Role.RESPONSIBLE: return 'Responsable Pédago.';
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
        className={`${mobile ? 'mr-3 p-1 text-orange-100 hover:text-white' : 'mr-4 p-2 bg-orange-50 text-[#EA580C] hover:bg-orange-100 rounded-full transition shadow-sm'}`}
      >
        <ArrowLeft className={`${mobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
      </button>
    );
  };

  // Helper to render Avatar
  const UserAvatar = ({ user, size = 'md' }: { user: User | null, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-lg',
      lg: 'w-16 h-16 text-3xl',
      xl: 'w-24 h-24 text-4xl'
    };
    
    if (!user) return <UserCircle className={sizeClasses[size]} />;

    if (user.avatar && user.avatar.length > 20) {
      // Base64 or URL
      return (
        <img 
          src={user.avatar} 
          alt={user.name} 
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm bg-white`} 
        />
      );
    } else if (user.avatar) {
      // Emoji
      return (
        <div className={`${sizeClasses[size]} rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center shadow-sm`}>
          {user.avatar}
        </div>
      );
    }
    
    // Default
    return (
       <div className={`${sizeClasses[size]} rounded-full bg-[#2D1B0E] text-orange-200 border-2 border-orange-800 flex items-center justify-center shadow-sm font-black uppercase`}>
          {user.name.charAt(0)}
       </div>
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
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col md:flex-row font-sans">
      
      {/* --- Notification Toast Container --- */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((notif) => (
          <div 
            key={notif.id}
            className={`
              pointer-events-auto transform transition-all duration-300 ease-in-out hover:scale-102 cursor-pointer
              max-w-sm w-full shadow-2xl rounded-xl border-l-4 p-4 flex items-start gap-3 bg-white
              ${notif.type === 'SUCCESS' ? 'border-emerald-500 shadow-emerald-900/10' : 
                notif.type === 'ERROR' ? 'border-red-500 shadow-red-900/10' : 
                notif.type === 'WARNING' ? 'border-orange-500 shadow-orange-900/10' : 
                'border-indigo-500 shadow-indigo-900/10'}
            `}
            onClick={() => {
              if (notif.targetPage) onNavigate(notif.targetPage);
              dismissNotification(notif.id);
            }}
          >
             {notif.type === 'SUCCESS' && <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />}
             {notif.type === 'ERROR' && <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />}
             {notif.type === 'WARNING' && <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0" />}
             {notif.type === 'INFO' && <Info className="w-6 h-6 text-indigo-500 shrink-0" />}
             <div className="flex-1">
               <h4 className={`font-black text-sm uppercase tracking-wide
                 ${notif.type === 'SUCCESS' ? 'text-emerald-800' : 
                   notif.type === 'ERROR' ? 'text-red-800' : 
                   notif.type === 'WARNING' ? 'text-orange-800' : 
                   'text-indigo-800'}
               `}>
                 {notif.type === 'SUCCESS' ? 'Succès' : notif.type === 'ERROR' ? 'Erreur' : notif.type === 'WARNING' ? 'Attention' : 'Information'}
               </h4>
               <p className="text-[#5D4037] text-sm font-medium leading-tight mt-1">{notif.message}</p>
             </div>
             <button onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }} className="ml-auto text-slate-300 hover:text-slate-500">
               <X className="w-4 h-4" />
             </button>
          </div>
        ))}
      </div>

      {/* Mobile Header with Pattern */}
      <div className="md:hidden pattern-bogolan text-white p-4 flex justify-between items-center shadow-lg z-50 sticky top-0 border-b-4 border-[#7C2D12]">
        <div className="flex items-center">
          <BackButton mobile />
          <div className="font-extrabold text-xl flex items-center gap-2">
            {currentPage === 'dashboard' && <School className="w-6 h-6 text-orange-200" />}
            <span>{schoolName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className="relative text-orange-100 hover:text-white transition">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-[#7C2D12]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:bg-black/20 p-1 rounded transition">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Notification Dropdown */}
        {isNotifMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b-4 border-[#D6C0B0] shadow-xl max-h-[60vh] overflow-y-auto z-[60]">
             <div className="p-4 bg-[#FFF8F0] border-b border-[#D6C0B0] flex justify-between items-center">
                <h4 className="font-black text-[#2D1B0E] uppercase text-sm">Notifications</h4>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                      <Check className="w-3 h-3" /> Tout lire
                    </button>
                  )}
                  {notificationHistory.length > 0 && (
                    <button onClick={clearNotificationHistory} className="text-xs text-red-600 font-bold flex items-center gap-1 hover:underline">
                      <Trash2 className="w-3 h-3" /> Effacer
                    </button>
                  )}
                </div>
             </div>
             <div>
                {notificationHistory.length === 0 ? (
                  <div className="p-6 text-center text-[#8D6E63] text-sm font-medium">Aucune notification récente.</div>
                ) : (
                  notificationHistory.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 border-b border-slate-100 flex gap-3 hover:bg-slate-50 transition relative group ${!notif.read ? 'bg-orange-50/40' : 'bg-white'}`}
                    >
                       <div 
                         onClick={() => handleNotificationClick(notif)}
                         className={`flex-1 flex gap-3 cursor-pointer`}
                       >
                         <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            notif.type === 'SUCCESS' ? 'bg-emerald-500' : 
                            notif.type === 'ERROR' ? 'bg-red-500' : 
                            notif.type === 'WARNING' ? 'bg-orange-500' : 'bg-indigo-500'
                         }`} />
                         <div className="flex-1">
                            <p className={`text-[#2D1B0E] text-sm leading-tight pr-6 ${!notif.read ? 'font-black' : 'font-medium opacity-80'}`}>
                              {notif.message}
                            </p>
                            <p className="text-[#8D6E63] text-xs mt-1 flex items-center gap-1">
                               <Clock className="w-3 h-3" /> {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr }) : 'À l\'instant'}
                            </p>
                         </div>
                       </div>
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                         className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                         title="Archiver"
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
        bg-[#2D1B0E] w-72 shadow-2xl z-40 flex flex-col border-r-4 border-[#7C2D12]
      `}>
        {/* Sidebar Header with Pattern */}
        <div className="p-8 pattern-bogolan text-white hidden md:block border-b-4 border-[#7C2D12] relative overflow-hidden">
           <div className="relative z-10">
             <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-white drop-shadow-md">
               <School className="w-8 h-8 text-orange-300" /> {schoolName}
             </h1>
             <p className="text-orange-200 text-sm mt-2 font-medium opacity-90 tracking-wide uppercase">{currentClass ? currentClass.name : 'Portail Administration'}</p>
           </div>
        </div>

        {/* Mobile User Info (With Clickable Profile) */}
        <div className="p-4 md:hidden bg-[#3E2723] border-b border-orange-900/50 cursor-pointer hover:bg-[#4E342E] transition" onClick={() => setIsProfileModalOpen(true)}>
           <div className="flex items-center gap-3">
              <UserAvatar user={user} size="md" />
              <div>
                <p className="font-bold text-orange-50">{user?.name}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-orange-300">{getRoleLabel()}</p>
                  <Pencil className="w-3 h-3 text-orange-400 opacity-60" />
                </div>
              </div>
           </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 bg-[#2D1B0E]">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 group border-l-8 ${
                currentPage === item.id
                  ? 'bg-[#431407] border-orange-500 text-orange-50'
                  : 'border-transparent text-orange-100/60 hover:bg-[#431407]/50 hover:text-orange-100'
              }`}
            >
              <item.icon className={`w-6 h-6 ${currentPage === item.id ? 'text-orange-400' : 'group-hover:text-orange-400'}`} />
              <span className="font-bold text-lg tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Desktop User Info Bottom */}
        <div className="p-4 border-t border-orange-900/30 bg-[#1e1008]">
           <div 
             className="hidden md:flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-[#2D1B0E] p-2 rounded-lg transition group"
             onClick={() => setIsProfileModalOpen(true)}
           >
              <div className="p-0.5 rounded-full border-2 border-orange-700/50 bg-[#2D1B0E] group-hover:border-orange-500 transition relative">
                <UserAvatar user={user} size="md" />
                <div className="absolute -bottom-1 -right-1 bg-orange-600 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition">
                   <Pencil className="w-3 h-3" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-orange-50 truncate group-hover:text-white transition">{user?.name}</p>
                <p className="text-xs text-orange-400 truncate uppercase font-bold tracking-wider">{getRoleLabel()}</p>
              </div>
           </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-red-300 hover:text-white hover:bg-red-900/40 px-4 py-3 rounded-lg transition-colors font-bold border border-transparent hover:border-red-900/50"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen bg-[#FFF8F0] relative">
        {/* Background Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%232D1B0E\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/90 backdrop-blur-md border-b-2 border-orange-100 h-24 items-center justify-between px-10 shadow-sm z-30 sticky top-0">
           <div className="flex items-center gap-4">
             <BackButton />
             <div>
               <h2 className="font-black text-3xl text-[#2D1B0E] tracking-tight">
                 {user?.role === Role.ADMIN ? 'Espace Administration Globale' : (currentClass?.name || 'Tableau de bord')}
               </h2>
               <p className="text-slate-500 font-medium">Année scolaire 2024-2025</p>
             </div>
           </div>
           
           <div className="flex items-center gap-6">
              {/* Notification Bell Desktop */}
              <div className="relative">
                <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className="bg-orange-50 hover:bg-orange-100 p-3 rounded-xl text-[#EA580C] transition border border-orange-100">
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Desktop Notification Dropdown */}
                {isNotifMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border-2 border-[#D6C0B0] overflow-hidden z-[60] origin-top-right">
                     <div className="p-4 bg-[#FFF8F0] border-b border-[#D6C0B0] flex justify-between items-center">
                        <h4 className="font-black text-[#2D1B0E] uppercase text-xs tracking-wide">Historique Notifications</h4>
                        <div className="flex gap-2">
                           {unreadCount > 0 && (
                             <button onClick={markAllNotificationsAsRead} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition">
                               <Check className="w-3 h-3" /> Tout lire
                             </button>
                           )}
                           {notificationHistory.length > 0 && (
                             <button onClick={clearNotificationHistory} className="text-xs text-red-600 font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition">
                               <Trash2 className="w-3 h-3" /> Tout effacer
                             </button>
                           )}
                        </div>
                     </div>
                     <div className="max-h-[400px] overflow-y-auto">
                        {notificationHistory.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center text-[#8D6E63]">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <span className="text-sm font-bold">Rien à signaler</span>
                          </div>
                        ) : (
                          notificationHistory.map(notif => (
                            <div 
                              key={notif.id} 
                              className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition flex gap-3 relative group ${!notif.read ? 'bg-orange-50/50' : ''}`}
                            >
                               <div 
                                 className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                    notif.type === 'SUCCESS' ? 'bg-emerald-500' : 
                                    notif.type === 'ERROR' ? 'bg-red-500' : 
                                    notif.type === 'WARNING' ? 'bg-orange-500' : 'bg-indigo-500'
                                 }`} 
                               />
                               
                               <div 
                                 onClick={() => handleNotificationClick(notif)}
                                 className={`flex-1 ${notif.targetPage ? 'cursor-pointer' : ''}`}
                               >
                                  <p className={`text-[#2D1B0E] text-sm leading-snug pr-6 ${!notif.read ? 'font-black' : 'font-medium opacity-80'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wide">
                                    {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr }) : 'Récent'}
                                  </p>
                               </div>

                               <button 
                                 onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                 className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                 title="Archiver"
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

              <span className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] border-2
                ${user?.role === Role.ADMIN ? 'bg-red-100 text-red-800 border-red-200' : 
                  user?.role === Role.RESPONSIBLE ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 
                  'bg-orange-100 text-orange-800 border-orange-200'}`}>
                {getRoleLabel()}
              </span>
           </div>
        </header>

        <div className="flex-1 p-4 md:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-800 scrollbar-track-transparent">
           {children}
        </div>
      </main>

      {/* --- Profile Avatar Modal --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col border-4 border-[#7C2D12] overflow-hidden">
              <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center pattern-bogolan text-white">
                 <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <UserCircle className="w-6 h-6" /> Personnaliser Profil
                 </h3>
                 <button onClick={() => setIsProfileModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[80vh]">
                 
                 <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                       <UserAvatar user={user} size="xl" />
                       <div className="absolute bottom-0 right-0 bg-orange-600 rounded-full p-2 border-2 border-white">
                          <Pencil className="w-4 h-4 text-white" />
                       </div>
                    </div>
                    <h4 className="font-black text-2xl text-[#2D1B0E]">{user?.name}</h4>
                    <p className="text-[#8D6E63] font-bold">{getRoleLabel()}</p>
                 </div>

                 <div className="space-y-6">
                    <div>
                       <label className="block text-sm font-black text-[#2D1B0E] mb-3 uppercase tracking-wide">Choisir un avatar</label>
                       <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                          {AVATAR_PRESETS.map((avatar, idx) => (
                             <button 
                               key={idx}
                               onClick={() => handleAvatarSelect(avatar)}
                               className={`
                                 text-2xl h-14 rounded-xl border-2 flex items-center justify-center transition
                                 hover:scale-110 hover:shadow-md
                                 ${user?.avatar === avatar ? 'bg-orange-100 border-orange-500 shadow-md scale-105' : 'bg-slate-50 border-slate-200 hover:border-orange-300'}
                               `}
                             >
                               {avatar}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="border-t-2 border-slate-100 pt-6">
                        <label className="block text-sm font-black text-[#2D1B0E] mb-3 uppercase tracking-wide">Ou importer une image</label>
                        <input 
                           type="file" 
                           accept="image/*" 
                           ref={fileInputRef} 
                           className="hidden"
                           onChange={handleFileUpload}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-[#D6C0B0] bg-[#FFF8F0] p-6 rounded-xl flex flex-col items-center justify-center text-[#8D6E63] hover:border-[#EA580C] hover:text-[#EA580C] hover:bg-orange-50 transition cursor-pointer gap-2"
                        >
                           <Upload className="w-8 h-8 opacity-50" />
                           <span className="font-bold text-sm">Cliquez pour importer une photo</span>
                           <span className="text-xs opacity-70">(Max 1Mo conseillé)</span>
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