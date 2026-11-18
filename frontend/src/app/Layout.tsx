import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './AppContext';
import { useNgheThongBao } from '@/shared/realtime/useNgheThongBao';

export function Layout() {
  const { phien, dangXuat, services } = useApp();
  const nav = useNavigate();
  const laAdmin = phien?.vaiTro === 'ADMIN';
  const viTri = useLocation();
  const [chuaDoc, setChuaDoc] = useState(0);
  const [loiDangXuat, setLoiDangXuat] = useState('');
  const [dangThoat, setDangThoat] = useState(false);
  const [moi, setMoi] = useState<{ noiDung: string; khoa: number } | null>(null);
  const [lanTai, setLanTai] = useState(0);
  const [moMenu, setMoMenu] = useState(false);
  // Thông báo tới qua SignalR: hiện thẻ nổi vài giây và tải lại số chưa đọc
  useNgheThongBao((s) => { setMoi({ noiDung: s.noiDung, khoa: Date.now() }); setLanTai((n) => n + 1); });
  useEffect(() => {
    if (!moi) return;
    const id = window.setTimeout(() => setMoi(null), 6_000);
    return () => window.clearTimeout(id);
  }, [moi]);
  async function thoat() {
    setDangThoat(true); setLoiDangXuat('');
    try { await services.auth.dangXuat(); dangXuat(); nav('/dang-nhap'); }
    catch (er) { setLoiDangXuat((er as Error).message); }
    finally { setDangThoat(false); }
  }
  // số thông báo chưa đọc (Admin: hộp thư Admin; khách: hộp thư của mình), tải lại khi đổi trang và mỗi 15 giây
  useEffect(() => {
    const tai = () => (laAdmin ? services.thongBao.layHopThuAdmin().then((h) => h.soChuaDoc) : services.thongBao.soChuaDoc())
      .then(setChuaDoc).catch(() => setChuaDoc(0));
    void tai();
    const id = window.setInterval(() => { if (!document.hidden) void tai(); }, 15_000);
    return () => window.clearInterval(id);
  }, [laAdmin, services, viTri.pathname, lanTai]);

  const nhom = laAdmin ? NHOM_ADMIN : NHOM_KHACH;
  const linkTB = laAdmin ? '/admin/thong-bao' : '/thong-bao';
  return (
    <div className={`khung khung-doc ${moMenu ? 'mo-menu' : ''}`}>
      <header className="thanh-tren">
        <button className="nut-menu" aria-label="Mở menu" aria-expanded={moMenu} onClick={() => setMoMenu((m) => !m)}>☰</button>
        <div className="thuong-hieu"><img className="logo-anh" src="/logo.png" alt="" /> Nhà xe thông minh</div>
      </header>
      {moMenu && <div className="man-che" onClick={() => setMoMenu(false)} />}
      <aside className="thanh-doc" aria-label="Menu chính">
        <div className="thuong-hieu"><img className="logo-anh" src="/logo.png" alt="" /> Nhà xe thông minh</div>
        <nav>
          {nhom.map((n) => (
            <div key={n.ten ?? 'goc'} className="nhom-menu">
              {n.ten && <div className="ten-nhom">{n.ten}</div>}
              {n.muc.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} onClick={() => setMoMenu(false)}>
                  <span className="bieu-tuong" aria-hidden="true">{m.icon}</span>{m.ten}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nhom-menu">
            <NavLink to={linkTB} onClick={() => setMoMenu(false)}>
              <span className="bieu-tuong" aria-hidden="true">🔔</span>Thông báo{chuaDoc > 0 && <span className="so-dem">{chuaDoc}</span>}
            </NavLink>
          </div>
        </nav>
        <div className="nguoi-dung">
          <div className="ten-nguoi-dung">{phien?.hoTen}<span>{laAdmin ? 'Quản trị' : 'Thành viên'}</span></div>
          <NavLink to={laAdmin ? '/admin/doi-mat-khau' : '/doi-mat-khau'} onClick={() => setMoMenu(false)}>Đổi mật khẩu</NavLink>
          <button className="nut nut-phu nut-nho" disabled={dangThoat} onClick={() => void thoat()}>Đăng xuất</button>
          {loiDangXuat && <span role="alert">{loiDangXuat}</span>}
        </div>
      </aside>
      <main className="noi-dung"><Outlet /></main>
      {moi && (
        <div key={moi.khoa} className="the-noi" role="status" onClick={() => { setMoi(null); nav(laAdmin ? '/admin/thong-bao' : '/thong-bao'); }}>
          <span className="nhan-nho">Thông báo mới</span>
          <span>{moi.noiDung}</span>
        </div>
      )}
    </div>
  );
}

interface MucMenu { to: string; ten: string; icon: string; end?: boolean }
interface NhomMenu { ten: string | null; muc: MucMenu[] }

/** Menu dọc. "Hành trình xe" gộp cổng vào, cổng ra và camera khu (module 5 + 8). */
const NHOM_ADMIN: NhomMenu[] = [
  { ten: 'Hành trình xe', muc: [
    { to: '/admin/cong/vao', ten: 'Cổng vào', icon: '⇥' },
    { to: '/admin/cong/ra', ten: 'Cổng ra', icon: '⇤' },
    { to: '/admin/camera-khu', ten: 'Camera khu', icon: '◎' },
  ] },
  { ten: 'Bãi xe', muc: [
    { to: '/admin/so-do', ten: 'Sơ đồ chỗ trống', icon: '🗺' },
    { to: '/admin/quan-ly-bai', ten: 'Quản lý bãi', icon: '⚙' },
    { to: '/admin/bai-xe', ten: 'Xe trong bãi', icon: '▦' },
  ] },
  { ten: 'Xe & gói', muc: [
    { to: '/admin/duyet-xe', ten: 'Quản lý xe', icon: '🛵' },
    { to: '/admin/goi-gia', ten: 'Gói & giá', icon: '₫' },
  ] },
  { ten: 'Hệ thống', muc: [
    { to: '/admin/ai-bien-so', ten: 'Đọc biển số (AI)', icon: '⌕' },
    { to: '/admin/tai-khoan', ten: 'Tài khoản', icon: '👤' },
    { to: '/admin/bao-cao', ten: 'Báo cáo', icon: '📊' },
  ] },
];

const NHOM_KHACH: NhomMenu[] = [
  { ten: null, muc: [
    { to: '/xe', ten: 'Xe của tôi', icon: '🛵' },
    { to: '/mua-goi', ten: 'Mua / gia hạn gói', icon: '₫' },
    { to: '/tim-xe', ten: 'Tìm xe', icon: '⌖' },
    { to: '/so-do', ten: 'Sơ đồ chỗ trống', icon: '🗺' },
    { to: '/ra-vao', ten: 'Ra vào', icon: '⇄' },
    { to: '/nhom-gia-dinh', ten: 'Nhóm gia đình', icon: '👪' },
  ] },
];
