import React, { useState } from 'react';
import { Announcement } from '../types/sports';
import { Bell, AlertTriangle, Plus, CheckCircle, Calendar, FileText } from 'lucide-react';

interface AnnouncementsProps {
  announcements: Announcement[];
  isAdmin: boolean;
  onAddAnnouncement: (ann: Announcement) => void;
}

export const Announcements: React.FC<AnnouncementsProps> = ({
  announcements,
  isAdmin,
  onAddAnnouncement
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState<boolean>(false);

  // New form state
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<'Lịch thi đấu' | 'Kết quả' | 'Thông báo khẩn' | 'Quy định'>('Lịch thi đấu');
  const [isImportant, setIsImportant] = useState<boolean>(false);

  const filteredAnnouncements = announcements.filter(
    (a) => filterCategory === 'all' || a.category === filterCategory
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const res = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category,
          isImportant,
          author: 'Ban Tổ Chức Hội Thao'
        })
      });

      const data = await res.json();
      if (data.success) {
        onAddAnnouncement(data.announcement);
        setTitle('');
        setContent('');
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="py-10 bg-white min-h-screen text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Royal Blue Floating Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30 mb-2">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Kênh Thông Tin Chính Thức BTC</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans font-bold tracking-tight">
              Thông Báo & Tin Tức Hội Thao
            </h1>
            <p className="text-sm text-blue-100/90 mt-1">
              Cập nhật các thông báo khẩn, thay đổi lịch trình và quy định thi đấu từ Ban Tổ Chức THPT Phú Lâm.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{showForm ? 'Đóng Biểu Mẫu' : 'Đăng Thông Báo Mới'}</span>
            </button>
          )}
        </div>

        {/* BTC Admin Add Announcement Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border-2 border-slate-200 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-blue-950 pb-2 border-b border-slate-200">
              Đăng Thông Báo Mới (Quyền Ban Tổ Chức)
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tiêu đề thông báo *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Thay đổi địa điểm thi đấu môn Cầu lông chiều nay..."
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chuyên mục *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-lg"
                >
                  <option value="Lịch thi đấu">Lịch thi đấu</option>
                  <option value="Kết quả">Kết quả</option>
                  <option value="Thông báo khẩn">Thông báo khẩn</option>
                  <option value="Quy định">Quy định</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="font-semibold text-amber-400">Ghim thông báo quan trọng / Khẩn</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nội dung chi tiết *</label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập chi tiết nội dung thông báo cho học sinh và GVCN..."
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              Đăng Ngay
            </button>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['all', 'Lịch thi đấu', 'Kết quả', 'Thông báo khẩn', 'Quy định'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'Tất cả thông báo' : cat}
            </button>
          ))}
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-slate-950 p-6 rounded-2xl border transition-all ${
                ann.isImportant
                  ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  {ann.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded uppercase">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      QUAN TRỌNG
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                    {ann.category}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {ann.date} · {ann.author}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mt-3 font-sans font-bold">
                {ann.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
