import React, { useState } from 'react';
import { Match, SportCategory } from '../types/sports';
import { Sparkles, Trophy, Calendar, Send, Bot, Copy, Check, Flame } from 'lucide-react';

interface AICommentatorProps {
  matches: Match[];
  sports: SportCategory[];
  preselectedMatch?: Match | null;
}

export const AICommentator: React.FC<AICommentatorProps> = ({
  matches,
  sports,
  preselectedMatch
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'commentary' | 'schedule'>('commentary');

  // Commentary Generator State
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    preselectedMatch?.id || matches[0]?.id || ''
  );
  const [customSport, setCustomSport] = useState<string>('Bóng đá Nam');
  const [customStage, setCustomStage] = useState<string>('Chung kết');
  const [customTeamA, setCustomTeamA] = useState<string>('Lớp 12A1');
  const [customTeamB, setCustomTeamB] = useState<string>('Lớp 12A2');
  const [customScoreA, setCustomScoreA] = useState<number>(3);
  const [customScoreB, setCustomScoreB] = useState<number>(2);
  const [customDetail, setCustomDetail] = useState<string>('Bàn thắng quyết định phút 38');
  const [customMVP, setCustomMVP] = useState<string>('Trần Hoàng Nam (12A1)');

  const [commentaryResult, setCommentaryResult] = useState<string>('');
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState<boolean>(false);

  // Schedule AI State
  const [scheduleResult, setScheduleResult] = useState<string>('');
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  // Populate custom input when match selection changes
  const handleMatchSelect = (mId: string) => {
    setSelectedMatchId(mId);
    const found = matches.find((m) => m.id === mId);
    if (found) {
      const sp = sports.find((s) => s.id === found.sportId);
      setCustomSport(sp?.name || found.sportId);
      setCustomStage(found.stage);
      setCustomTeamA(found.teamA);
      setCustomTeamB(found.teamB);
      setCustomScoreA(found.scoreA ?? 0);
      setCustomScoreB(found.scoreB ?? 0);
      setCustomDetail(found.setsDetail || '');
      setCustomMVP(found.mvpPlayer || '');
    }
  };

  // Generate Commentary via Express Server Endpoint calling Gemini
  const handleGenerateCommentary = async () => {
    setIsGeneratingCommentary(true);
    setCommentaryResult('');

    try {
      const res = await fetch('/api/gemini/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportName: customSport,
          stage: customStage,
          teamA: customTeamA,
          teamB: customTeamB,
          scoreA: customScoreA,
          scoreB: customScoreB,
          setsDetail: customDetail,
          mvpPlayer: customMVP
        })
      });

      const data = await res.json();
      if (data.success && data.commentary) {
        setCommentaryResult(data.commentary);
      } else {
        setCommentaryResult('Không thể tạo bình luận lúc này. Vui lòng thử lại!');
      }
    } catch (err) {
      console.error(err);
      setCommentaryResult('Đã xảy ra lỗi kết nối AI. Vui lòng kiểm tra API Key.');
    } finally {
      setIsGeneratingCommentary(false);
    }
  };

  // Generate Schedule via Gemini
  const handleGenerateSchedule = async () => {
    setIsGeneratingSchedule(true);
    setScheduleResult('');

    try {
      const res = await fetch('/api/gemini/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportsList: sports.map((s) => s.name).join(', '),
          classesList: '10A1 -> 12C3'
        })
      });

      const data = await res.json();
      if (data.success && data.scheduleSuggestion) {
        setScheduleResult(data.scheduleSuggestion);
      } else {
        setScheduleResult('Không thể tạo đề xuất lịch lúc này.');
      }
    } catch (err) {
      console.error(err);
      setScheduleResult('Đã xảy ra lỗi kết nối AI.');
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-10 bg-white min-h-screen text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Royal Blue Floating Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Trợ Lý Thông Minh Google Gemini 3.8 Flash</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans font-bold tracking-tight">
              Bình Luận Viên & Trợ Lý Lịch Thi AI THPT Phú Lâm
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-2xl">
              Tạo bài tường thuật trận đấu đầy cảm xúc hoặc nhờ AI sắp xếp lịch thi đấu tối ưu không trùng sân cho Ban Tổ Chức.
            </p>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-200 w-fit shadow-sm">
          <button
            onClick={() => setActiveSubTab('commentary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'commentary'
                ? 'bg-blue-900 text-white shadow-md font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Bình Luận Viên Trận Đấu</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'schedule'
                ? 'bg-blue-900 text-white shadow-md font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Trợ Lý Xếp Lịch BTC</span>
          </button>
        </div>

        {/* Subtab 1: Match Commentary Generator */}
        {activeSubTab === 'commentary' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input Form (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-slate-200 space-y-4 shadow-xl">
              <h2 className="text-base font-black text-blue-950 flex items-center gap-2 pb-3 border-b border-slate-200">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Nhập Thông Tin Trận Đấu</span>
              </h2>

              {/* Quick Select Preset Match */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Chọn nhanh từ trận đã đấu:
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => handleMatchSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs px-3 py-2 rounded-lg focus:outline-none"
                >
                  <option value="">-- Hoặc tự nhập thông tin bên dưới --</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.sportId.toUpperCase()} · {m.stage}: {m.teamA} ({m.scoreA ?? 0}) vs {m.teamB} ({m.scoreB ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Môn Thi Đấu</label>
                  <input
                    type="text"
                    value={customSport}
                    onChange={(e) => setCustomSport(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vòng Thi Đấu</label>
                  <input
                    type="text"
                    value={customStage}
                    onChange={(e) => setCustomStage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Đội 1 (Tên Lớp/VĐV)</label>
                    <input
                      type="text"
                      value={customTeamA}
                      onChange={(e) => setCustomTeamA(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Điểm Đội 1</label>
                    <input
                      type="number"
                      value={customScoreA}
                      onChange={(e) => setCustomScoreA(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono text-xs px-3 py-2 rounded-lg font-bold text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Đội 2 (Tên Lớp/VĐV)</label>
                    <input
                      type="text"
                      value={customTeamB}
                      onChange={(e) => setCustomTeamB(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Điểm Đội 2</label>
                    <input
                      type="number"
                      value={customScoreB}
                      onChange={(e) => setCustomScoreB(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono text-xs px-3 py-2 rounded-lg font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chi tiết séc / Diễn biến</label>
                  <input
                    type="text"
                    placeholder="VD: Séc 1: 21-19, Séc 2: 25-23..."
                    value={customDetail}
                    onChange={(e) => setCustomDetail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">VĐV Xuất sắc (MVP)</label>
                  <input
                    type="text"
                    placeholder="VD: Trần Hoàng Nam (12A1)"
                    value={customMVP}
                    onChange={(e) => setCustomMVP(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateCommentary}
                disabled={isGeneratingCommentary}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                <span>{isGeneratingCommentary ? 'Gemini Đang Soạn Bài Tường Thuật...' : 'Tạo Bài Tường Thuật Sôi Nổi'}</span>
              </button>
            </div>

            {/* Output Display (7 cols) */}
            <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 min-h-[420px] flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <span>Bài Tường Thuật Từ Bình Luận Viên AI</span>
                  </h3>
                  {commentaryResult && (
                    <button
                      onClick={() => copyToClipboard(commentaryResult)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã copy' : 'Sao chép bài'}</span>
                    </button>
                  )}
                </div>

                {isGeneratingCommentary ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-purple-300 font-medium">
                      Gemini 3.8 Flash đang phân tích kết quả và soạn bài tường thuật sôi động cho THPT Phú Lâm...
                    </p>
                  </div>
                ) : commentaryResult ? (
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                    {commentaryResult}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500 text-xs">
                    Bấm nút <span className="text-purple-400 font-semibold">"Tạo Bài Tường Thuật Sôi Nổi"</span> để AI sinh bài tường thuật thể thao cho trận đấu.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-400">
                Gợi ý: Bạn có thể sao chép nội dung bài viết này để đăng tải lên Fanpage Đoàn Trường THPT Phú Lâm hoặc Bảng tin Hội thao.
              </div>
            </div>

          </div>
        )}

        {/* Subtab 2: AI Schedule Assistant */}
        {activeSubTab === 'schedule' && (
          <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>Trợ Lý Lập Lịch Thi Đấu Tối Ưu Tự Động</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gemini AI giúp phân bổ lịch thi đấu 9 môn học đường đảm bảo không bị chồng chéo sân bãi và thời gian của các lớp.
                </p>
              </div>

              <button
                onClick={handleGenerateSchedule}
                disabled={isGeneratingSchedule}
                className="py-2.5 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>{isGeneratingSchedule ? 'Đang Tính Toán Lịch...' : 'Phân Tích & Đề Xuất Lịch Thi'}</span>
              </button>
            </div>

            {isGeneratingSchedule ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-cyan-300">
                  Gemini đang phân bổ khung giờ thi đấu cho 9 môn và các sân thể thao THPT Phú Lâm...
                </p>
              </div>
            ) : scheduleResult ? (
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {scheduleResult}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Nhấp nút <span className="text-cyan-400 font-semibold">"Phân Tích & Đề Xuất Lịch Thi"</span> để nhận gợi ý chia lịch thông minh từ AI.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
