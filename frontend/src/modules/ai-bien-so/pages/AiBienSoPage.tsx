import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '@/app/AppContext';
import { ThongBao } from '@/shared/ui/ui';
import type { KetQuaDocBienSo } from '../models';

export function AiBienSoPage() {
  const { services } = useApp(); const [anh, setAnh] = useState<File | null>(null);
  const [preview, setPreview] = useState(''); const [kq, setKq] = useState<KetQuaDocBienSo | null>(null);
  const [loi, setLoi] = useState(''); const [ban, setBan] = useState(false);
  useEffect(() => {
    if (!anh) { setPreview(''); return; }
    const url = URL.createObjectURL(anh); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [anh]);
  async function gui(e: FormEvent) {
    e.preventDefault(); setLoi(''); setKq(null);
    if (!anh || !['image/jpeg', 'image/png'].includes(anh.type) || anh.size > 5 * 1024 * 1024) { setLoi('Chọn ảnh JPEG/PNG không quá 5 MB.'); return; }
    setBan(true);
    try { setKq(await services.aiBienSo.doc(anh)); } catch (er) { setLoi((er as Error).message); } finally { setBan(false); }
  }
  return <div className="form"><h1>Đọc biển số từ ảnh</h1><p className="mo">Tải ảnh biển số rõ nét. Kết quả chỉ để kiểm tra nhận diện, chưa ghi nhận xe vào hoặc ra bãi.</p>
    <form className="the form" onSubmit={gui}>
      <label>Ảnh camera (JPEG/PNG, tối đa 5 MB)<input type="file" accept="image/jpeg,image/png" required disabled={ban} onChange={e => { setAnh(e.target.files?.[0] ?? null); setKq(null); setLoi(''); }} /></label>
      {preview && <img className="anh-bien-so" src={preview} alt="Ảnh biển số đã chọn" />}
      <button className="nut" disabled={ban || !anh}>{ban ? 'Đang đọc ảnh…' : 'Nhận diện biển số'}</button>
    </form>
    {loi && <ThongBao loai="loi">{loi}</ThongBao>}
    {kq && <section className="the"><h2>{kq.bienSo ?? 'Cần xác nhận thủ công'}</h2>
      {kq.canXacNhan && <ThongBao loai="canh-bao">{kq.ungVien.length ? 'Ảnh có nhiều kết quả hoặc độ tin cậy thấp. Hãy kiểm tra biển trên ảnh.' : 'Chưa đọc được biển số. Hãy chụp gần hơn, đủ sáng và thẳng góc.'}</ThongBao>}
      {kq.ungVien.map(x => <p key={x.bienSo}><strong>{x.bienSo}</strong> · Điểm OCR {(x.doTinCay * 100).toFixed(0)}%</p>)}
      <p className="mo">Điểm OCR không phải xác suất chính xác đã được kiểm chứng.</p>
    </section>}
  </div>;
}
