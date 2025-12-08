
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Exam } from '../types';
import { CalendarDays, Clock, MapPin, Trash2, Plus, Download, Pencil, AlertCircle, BellRing, X, Send } from 'lucide-react';
import { format, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DS: React.FC = () => {
  const { user, exams, addExam, updateExam, deleteExam, shareResource } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form Data
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState(60);
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  // Notification Target State
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  // Permissions Check: Strictly RESPONSIBLE can manage. Admin observes. Student reads.
  const canManage = user?.role === Role.RESPONSIBLE;

  const openCreate = () => {
    setEditingId(null);
    setSubject('');
    setDate(new Date().toISOString().slice(0, 16));
    setDuration(60);
    setRoom('');
    setNotes('');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const openEdit = (item: Exam) => {
    setEditingId(item.id);
    setSubject(item.subject);
    setDate(new Date(item.date).toISOString().slice(0, 16));
    setDuration(item.durationMinutes);
    setRoom(item.room);
    setNotes(item.notes || '');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      subject,
      date: new Date(date).toISOString(),
      durationMinutes: duration,
      room,
      notes,
    };

    if (editingId) {
      updateExam(editingId, payload);
    } else {
      addExam(payload, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const toggleTargetRole = (role: Role) => {
    setTargetRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleExportCSV = () => {
    if (exams.length === 0) return;

    const headers = ['Matière', 'Date', 'Heure', 'Durée (min)', 'Salle', 'Notes'];
    const rows = exams.map(e => [
      e.subject,
      format(new Date(e.date), 'yyyy-MM-dd'),
      format(new Date(e.date), 'HH:mm'),
      e.durationMinutes,
      e.room,
      e.notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sunuclasse_examens.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#2D1B0E] dark:text-[#fcece4] flex items-center gap-3 tracking-tight">
             <span className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 p-2 rounded-xl shadow-[4px_4px_0_#F87171]"><CalendarDays className="text-red-600 dark:text-red-300 w-6 h-6 md:w-8 md:h-8" /></span>
             Examens & DS
          </h1>
          <p className="text-[#5D4037] dark:text-[#A1887F] mt-2 font-bold text-base md:text-lg">Calendrier officiel des évaluations.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {exams.length > 0 && (
             <button
               onClick={handleExportCSV}
               className="flex-1 md:flex-none justify-center bg-white dark:bg-[#2D1B0E] border-2 border-[#D6C0B0] dark:border-[#431407] text-[#5D4037] dark:text-[#D6C0B0] px-4 py-3 md:px-6 rounded-xl font-bold hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723] transition flex items-center gap-2 shadow-sm active:scale-95"
             >
               <Download className="w-5 h-5" /> <span className="md:hidden">Export</span><span className="hidden md:inline">Exporter</span>
             </button>
          )}

          {canManage && (
            <button 
              onClick={openCreate}
              className="flex-1 md:flex-none justify-center btn-primary text-white px-4 py-3 md:px-6 rounded-xl font-bold active:scale-95 transition flex items-center gap-2 uppercase tracking-wide shadow-md"
            >
              <Plus className="w-5 h-5" /> <span>Planifier</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#2D1B0E] rounded-3xl shadow-sm border-2 border-[#D6C0B0] dark:border-[#431407] overflow-hidden">
        <div className="grid grid-cols-1 divide-y-2 divide-[#D6C0B0] dark:divide-[#431407]">
          {exams.length === 0 && (
             <div className="p-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
               <CalendarDays className="w-16 h-16 md:w-20 md:h-20 opacity-20 text-[#2D1B0E] dark:text-white mb-6" />
               <p className="font-bold text-xl text-[#8D6E63] dark:text-[#A1887F]">Aucun examen n'est planifié pour le moment.</p>
             </div>
          )}
          {exams.map((exam) => {
            const examDate = new Date(exam.date);
            const isThisWeek = isSameWeek(examDate, new Date());

            return (
              <div key={exam.id} className="p-5 md:p-8 hover:bg-[#FFF8F0] dark:hover:bg-[#3E2723] transition flex flex-col md:flex-row gap-6 md:items-center group">
                {/* Date Box */}
                <div className="flex items-center gap-4 md:block min-w-[100px]">
                  <div className={`
                    flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 shrink-0 shadow-sm
                    ${isThisWeek ? 'bg-[#EA580C] border-[#9A3412] text-white shadow-[4px_4px_0_#9A3412]' : 'bg-white dark:bg-[#2D1B0E] border-[#D6C0B0] dark:border-[#431407] text-[#5D4037] dark:text-[#D6C0B0]'}
                  `}>
                     <span className={`text-xs md:text-sm font-black uppercase ${isThisWeek ? 'text-orange-100' : 'text-[#8D6E63] dark:text-[#A1887F]'}`}>{format(examDate, 'MMM', { locale: fr })}</span>
                     <span className="text-3xl md:text-4xl font-black">{format(examDate, 'd')}</span>
                  </div>
                  <div className="md:hidden">
                    <h3 className="text-xl font-black text-[#2D1B0E] dark:text-[#fcece4] line-clamp-1">{exam.subject}</h3>
                    <div className="flex items-center gap-3 text-sm text-[#5D4037] dark:text-[#D6C0B0] mt-1 font-bold">
                       <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(examDate, 'HH:mm')}</span>
                       <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {exam.room}</span>
                    </div>
                  </div>
                </div>

                {/* Details Desktop */}
                <div className="flex-1 hidden md:block">
                   <div className="flex items-center gap-3 mb-2">
                     <h3 className="text-2xl font-black text-[#2D1B0E] dark:text-[#fcece4]">{exam.subject}</h3>
                     {isThisWeek && <span className="text-xs bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-black flex items-center gap-1 uppercase tracking-wider"><AlertCircle className="w-3 h-3"/> Cette semaine</span>}
                   </div>
                   
                   <div className="flex flex-wrap gap-6 text-sm text-[#5D4037] dark:text-[#D6C0B0] font-bold">
                      <div className="flex items-center gap-2 bg-[#FFF8F0] dark:bg-[#1a100a] px-4 py-2 rounded-lg border border-[#D6C0B0] dark:border-[#5D4037]">
                        <Clock className="w-4 h-4 text-[#EA580C]" />
                        {format(examDate, 'HH:mm')} • {exam.durationMinutes} min ({exam.durationMinutes / 60}h)
                      </div>
                      <div className="flex items-center gap-2 bg-[#FFF8F0] dark:bg-[#1a100a] px-4 py-2 rounded-lg border border-[#D6C0B0] dark:border-[#5D4037]">
                        <MapPin className="w-4 h-4 text-[#EA580C]" />
                        {exam.room}
                      </div>
                   </div>
                   {exam.notes && (
                     <p className="mt-4 text-sm text-[#5D4037] dark:text-[#D6C0B0] bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400 dark:border-yellow-600 inline-block max-w-xl font-medium">
                        <span className="font-black text-yellow-800 dark:text-yellow-400 uppercase mr-1">Note:</span> {exam.notes}
                     </p>
                   )}
                </div>

                {/* Details Mobile Notes */}
                {exam.notes && (
                   <div className="md:hidden text-sm text-[#5D4037] dark:text-[#D6C0B0] bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border-l-4 border-yellow-400 dark:border-yellow-600 font-medium">
                      <span className="font-black text-yellow-800 dark:text-yellow-400 uppercase mr-1">Note:</span> {exam.notes}
                   </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="grid grid-cols-3 md:flex md:justify-end gap-3 pt-4 md:pt-0 border-t-2 md:border-t-0 border-[#D6C0B0] dark:border-[#431407]">
                    <button 
                      onClick={() => shareResource('EXAM', exam)}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition text-sm font-black border-2 border-emerald-100 dark:border-emerald-800 active:scale-95"
                      title="Partager par mail"
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5" /> <span className="md:hidden">Envoyer</span>
                    </button>
                    <button 
                      onClick={() => openEdit(exam)}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition text-sm font-black border-2 border-indigo-100 dark:border-indigo-800 active:scale-95"
                    >
                      <Pencil className="w-4 h-4 md:w-5 md:h-5" /> <span className="md:hidden">Modifier</span>
                    </button>
                    <button 
                      onClick={() => deleteExam(exam.id)}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition text-sm font-black border-2 border-red-100 dark:border-red-800 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> <span className="md:hidden">Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

       {/* Modal */}
       {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-[#2D1B0E]/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D1B0E] rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden border-t-4 md:border-4 border-[#7C2D12]">
            <div className="p-5 md:p-6 border-b-2 border-slate-100 dark:border-[#431407] flex justify-between items-center pattern-bogolan text-white shrink-0">
              <h3 className="text-lg md:text-xl font-black uppercase tracking-wide">
                {editingId ? 'Modifier DS' : 'Programmer un DS'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 md:p-8 bg-white dark:bg-[#2D1B0E] scrollbar-thin scrollbar-thumb-[#D6C0B0]">
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Matière / Sujet</label>
                  <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold text-[#2D1B0E] dark:text-[#fcece4]" placeholder="Ex: Mathématiques" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Date & Heure</label>
                    <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 text-sm focus:border-[#EA580C] outline-none transition font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Durée (Heures)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.5"
                      value={duration / 60} 
                      onChange={e => setDuration(parseFloat(e.target.value) * 60)} 
                      className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] outline-none transition font-bold" 
                      placeholder="Ex: 1.5"
                    />
                    <p className="text-xs text-[#8D6E63] dark:text-[#A1887F] mt-1 text-right font-bold">{duration} minutes</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Salle / Lieu</label>
                  <input required type="text" value={room} onChange={e => setRoom(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-bold" placeholder="Ex: Salle 204" />
                </div>
                <div>
                  <label className="block text-sm font-black text-[#2D1B0E] dark:text-[#D6C0B0] mb-2 uppercase">Notes / Consignes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[#FFF8F0] dark:bg-[#1a100a] border-2 border-[#D6C0B0] dark:border-[#5D4037] rounded-xl p-3 md:p-4 focus:border-[#EA580C] focus:bg-white dark:focus:bg-[#0f0906] outline-none transition font-medium" placeholder="Ex: Calculatrice autorisée..." rows={3} />
                </div>
                
                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-4 rounded-xl font-bold text-[#5D4037] dark:text-[#D6C0B0] bg-[#EFEBE9] dark:bg-[#3E2723] hover:bg-[#D7CCC8] dark:hover:bg-[#4E342E] transition border-2 border-transparent active:scale-95">
                      Annuler
                   </button>
                   <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-4 rounded-xl font-black shadow-[0_4px_0_#9A3412] hover:shadow-[0_2px_0_#9A3412] active:translate-y-1 active:shadow-none transition uppercase tracking-wide">
                      {editingId ? 'Mettre à jour' : 'Planifier'}
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