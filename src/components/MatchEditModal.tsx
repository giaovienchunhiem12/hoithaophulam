import React, { useState } from 'react';
import { Match, MatchStatus } from '../types/sports';
import { X, ShieldCheck, Trophy, Clock } from 'lucide-react';

interface MatchEditModalProps {
  match: Match;
  onClose: () => void;
  onSave: (updatedMatch: Partial<Match>) => void;
}

export const MatchEditModal: React.FC<MatchEditModalProps> = ({
  match,
  onClose,
  onSave
}) => {
  const [scoreA, setScoreA] = useState<number>(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState<number>(match.scoreB ?? 0);
  const [setsDetail, setSetsDetail] = useState<string>(match.setsDetail || '');
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [date, setDate] = useState<string>(match.date || '2026-10-12');
  const [time, setTime] = useState<string>(match.time || '08:00');
  const [venue, setVenue] = useState<string>(match.venue || '');
  const [mvpPlayer, setMvpPlayer] = useState<string>(match.mvpPlayer || '');
  const [commentary, setCommentary] = useState<string>(match.commentary || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: match.id,
          scoreA,
          scoreB,
          setsDetail,
          status,
          date,
          time,
          venue,
          mvpPlayer,
          commentary
        })
      });

      const data = await res.json();
      if (data.success) {
        onSave({
          scoreA,
          scoreB,
          setsDetail,
          status,
          date,
          time,
          venue,
          mvpPlayer,
          commentary
        });
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi lưu kết quả.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative text-slate-900">
        
        {/* Royal Blue Floating Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border-2 border-amber-400 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              Quyền Ban Tổ Chức THPT Phú Lâm
            </span>
            <h2 className="text-lg font-black text-white font-sans font-bold">
              Cập Nhật Biên Bản Trận Đấu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Overview */}
        <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 text-xs space-y-2">
          <div className="flex justify-between font-extrabold text-blue-900">
            <span>{match.sportId.toUpperCase()} · {match.stage}</span>
            <span>{match.date} · {match.time}</span>
          </div>
          <div className="flex items-center justify-between font-black text-slate-900 text-base">
            <span className="text-blue-950">{match.teamA}</span>
            <span className="text-amber-600 font-extrabold text-xs px-2 py-0.5 bg-amber-100 rounded-md">VS</span>
            <span className="text-blue-950">{match.teamB}</span>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Date, Time, Venue */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày thi đấu</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ thi đấu</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Địa điểm</label>
            <input
              type="text"
              placeholder="VD: Sân bóng A"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Trạng Thái Trận Đấu *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MatchStatus)}
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl font-bold focus:border-blue-700 outline-none"
            >
              <option value="Upcoming">Sắp thi đấu (Upcoming)</option>
              <option value="Live">Đang diễn ra (Live)</option>
              <option value="Finished">Đã kết thúc (Finished)</option>
            </select>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 truncate">
                Điểm / Bàn thắng {match.teamA}
              </label>
              <input
                type="number"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-blue-950 font-mono text-xl font-black px-3 py-2 rounded-xl text-center focus:border-blue-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 truncate">
                Điểm / Bàn thắng {match.teamB}
              </label>
              <input
                type="number"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-blue-950 font-mono text-xl font-black px-3 py-2 rounded-xl text-center focus:border-blue-700 outline-none"
              />
            </div>
          </div>

          {/* Sets Detail */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tỉ số chi tiết các Hiệp / Séc
            </label>
            <input
              type="text"
              placeholder="VD: 21-18, 19-21, 21-15 hoặc Hiệp 1: 1-0"
              value={setsDetail}
              onChange={(e) => setSetsDetail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
            />
          </div>

          {/* MVP */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              VĐV Xuất Sắc Nhất (MVP)
            </label>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn A (12A1)"
              value={mvpPlayer}
              onChange={(e) => setMvpPlayer(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
            />
          </div>

          {/* Commentary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú / Bình luận ngắn trận đấu
            </label>
            <textarea
              rows={2}
              placeholder="VD: Trận đấu kịch tính và gay cấn đến những phút bù giờ cuối cùng..."
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:border-blue-700 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-black text-xs rounded-xl shadow-md transition-all"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Biên Bản Trận Đấu'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
