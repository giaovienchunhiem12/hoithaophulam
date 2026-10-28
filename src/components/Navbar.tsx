import React from 'react';
import { Trophy, Calendar, Award, UserPlus, Sparkles, Shield, Search, Bell } from 'lucide-react';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedSportFilter: string;
  setSelectedSportFilter: (sport: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  setIsAdmin,
  searchTerm,
  setSearchTerm,
  selectedSportFilter,
  setSelectedSportFilter
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-2xl border-b-4 border-amber-400/90 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between h-18">
          
          {/* Zone 1: Single Brand Lockup with School Badge */}
          <div className="flex items-center gap-3">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-amber-400 bg-white p-0.5 group-hover:ring-amber-300 transition-all shadow-md shrink-0 flex items-center justify-center">
                <img 
                  src={SCHOOL_LOGO_DATA_URI} 
                  alt="Logo Trường THPT Phú Lâm" 
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('school_logo.jpg')) {
                      target.src = '/school_logo.jpg';
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  THPT PHÚ LÂM
                </span>
                <span className="text-[11px] font-medium tracking-wider uppercase text-amber-500/90 -mt-1">
                  Hội Thao Thể Thao Học Đường
                </span>
              </div>
            </a>
          </div>

          {/* Zone 2: Primary Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'home'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Trang chủ</span>
            </button>

            <button
              onClick={() => setActiveTab('tournament')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'tournament' || activeTab === 'register'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Tạo & Quản Lý Giải</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Lịch & Sơ Đồ</span>
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-4 h-4 text-orange-400" />
              <span>Kết Quả & Bảng Xếp Hạng</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Bình Luận Viên AI</span>
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'news'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4 text-rose-400" />
              <span>Thông Báo BTC</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Search / BTC Admin Toggle */}
          <div className="flex items-center gap-3">
            {/* Quick search input */}
            <div className="relative hidden lg:block w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm lớp, VĐV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/80 text-xs text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Admin BTC toggle button */}
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border ${
                isAdmin
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
              title={isAdmin ? 'Đang ở chế độ Ban Tổ Chức (Có thể nhập điểm, sửa lịch)' : 'Chuyển sang chế độ Ban Tổ Chức (BTC)'}
            >
              <Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-slate-950' : 'text-amber-400'}`} />
              <span className="whitespace-nowrap">{isAdmin ? 'Quyền BTC (Bật)' : 'Quyền BTC'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-950/90 py-2 px-1 text-xs">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          <Trophy className="w-4 h-4" />
          <span>Trang chủ</span>
        </button>
        <button
          onClick={() => setActiveTab('tournament')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'tournament' || activeTab === 'register' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Quản lý giải</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'schedule' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch thi</span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'results' ? 'text-orange-400 font-bold' : 'text-slate-400'}`}
        >
          <Award className="w-4 h-4" />
          <span>Bảng điểm</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'ai' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI BTC</span>
        </button>
      </div>
    </header>
  );
};
