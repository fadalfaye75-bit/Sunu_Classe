import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement } from '../types';
import { generateAnnouncementContent } from '../services/gemini';
import { Megaphone, Trash2, Clock, Sparkles, Pencil, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Infos: React.FC = () => {
  const { user, announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [isGenerating, setIsGenerating] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setUrgency(Urgency.NORMAL);
    setIsModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setUrgency(item.urgency);
    setIsModalOpen(true);
  };

  const handleGenerateAI = async () => {
    if (!title) return;
    setIsGenerating(true);
    const generated = await generateAnnouncementContent(title, user?.role === Role.RESPONSIBLE ? 'Enseignant' : 'Responsable');
    setContent(generated);
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateAnnouncement(editingId, {
        title,
        content,
        urgency
      });
    } else {
      addAnnouncement({
        title,
        content,
        date: new Date().toISOString(),
        urgency,
      });
    }
    setIsModalOpen(false);
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#2D1B0E] flex items-center gap-3 tracking-tight">
            <span className="bg-[#FFEDD5] border-2 border-[#FB923C] p-2 rounded-xl text-[#EA580C] shadow-[4px_4px_0_#FB923C]"><Megaphone className="w-8 h-8" /></span>
            Annonces
          </h1>
          <p className="text-[#5D4037] mt-2 font-bold text-lg">Le fil d'actualité de la classe.</p>
        </div>
        {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
          <button 
            onClick={openCreate}
            className="btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 flex items-center gap-2 uppercase tracking-wide"
          >
            <Plus className="w-5 h-5"/> <span className="hidden md:inline">Publier</span>
          </button>
        )}
      </div>

      <div className="space-y-8">
        {sortedAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-[#D6C0B0]">
             <Megaphone className="w-20 h-20 mx-auto mb-4 opacity-20 text-[#2D1B0E]" />
             <p className="font-bold text-xl text-[#8D6E63]">Aucune annonce publiée pour le moment.</p>
          </div>
        )}
        {sortedAnnouncements.map((item) => {
           const isUrgent = item.urgency === Urgency.URGENT;
           const isInfo = item.urgency === Urgency.INFO;

           return (
            <div 
              key={item.id} 
              className={`bg-white rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 p-6 md:p-8 transition-transform hover:-translate-y-1 ${
                isUrgent ? 'border-l-[12px] border-l-red-500 border-red-100' : 
                isInfo ? 'border-l-[12px] border-l-emerald-500 border-emerald-100' :
                'border-l-[12px] border-l-indigo-500 border-indigo-100'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider shadow-sm border ${
                        isUrgent ? 'bg-red-100 text-red-800 border-red-200' : 
                        isInfo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                        'bg-indigo-100 text-indigo-800 border-indigo-200'
                      }`}>
                        {item.urgency}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(item.date), "d MMM à HH:mm", { locale: fr })}
                      </span>
                  </div>

                  <h3 className="text-2xl font-black text-[#2D1B0E] mb-3 leading-tight">{item.title}</h3>
                  <div className="prose prose-orange text-[#4B3621] leading-relaxed whitespace-pre-wrap font-medium">
                    {item.content}
                  </div>
                </div>

                {(user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN) && (
                  <div className="flex md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 min-w-[120px]">
                    <button 
                      onClick={() => openEdit(item)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition font-bold text-sm border-2 border-indigo-100"
                    >
                      <Pencil className="w-4 h-4" /> Modifier
                    </button>
                    <button 
                      onClick={() => deleteAnnouncement(item.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition font-bold text-sm border-2 border-red-100"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
           );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border-4 border-[#7C2D12]">
            <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center pattern-bogolan text-white">
              <h3 className="text-xl font-black uppercase tracking-wide">
                {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] mb-2 uppercase tracking-wide">Titre du message</label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-bold text-[#2D1B0E]" placeholder="Ex: Changement de salle..." />
                </div>
                
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] mb-2 flex justify-between items-center uppercase tracking-wide">
                    Contenu
                    <button type="button" onClick={handleGenerateAI} disabled={isGenerating || !title} className="text-xs text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-200 transition font-black disabled:opacity-50 border border-indigo-200 shadow-sm">
                      <Sparkles className="w-3 h-3" /> Assistant IA
                    </button>
                  </label>
                  <textarea required value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full bg-[#FFF8F0] border-2 border-[#D6C0B0] rounded-xl p-4 focus:border-[#EA580C] focus:bg-white outline-none transition font-medium text-[#2D1B0E]" placeholder="Votre message ici..." />
                </div>

                <div>
                   <label className="block text-sm font-black text-[#2D1B0E] mb-3 uppercase tracking-wide">Niveau d'importance</label>
                   <div className="grid grid-cols-3 gap-3">
                      <label className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${urgency === Urgency.NORMAL ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-[0_4px_0_#4F46E5]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="urgency" className="hidden" checked={urgency === Urgency.NORMAL} onChange={() => setUrgency(Urgency.NORMAL)} />
                        <span className="font-bold">Normal</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${urgency === Urgency.URGENT ? 'bg-red-50 border-red-600 text-red-700 shadow-[0_4px_0_#DC2626]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="urgency" className="hidden" checked={urgency === Urgency.URGENT} onChange={() => setUrgency(Urgency.URGENT)} />
                        <span className="font-bold">Urgent</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${urgency === Urgency.INFO ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-[0_4px_0_#059669]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="urgency" className="hidden" checked={urgency === Urgency.INFO} onChange={() => setUrgency(Urgency.INFO)} />
                        <span className="font-bold">Info</span>
                      </label>
                   </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] bg-[#EFEBE9] hover:bg-[#D7CCC8] transition border-2 border-transparent">
                    Annuler
                  </button>
                  <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wide">
                    {editingId ? 'Sauvegarder' : 'Publier maintenant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};