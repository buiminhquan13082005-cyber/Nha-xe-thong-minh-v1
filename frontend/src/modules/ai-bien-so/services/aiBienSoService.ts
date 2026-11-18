import type { IHttpClient } from '@/shared/api/httpClient';
import type { KetQuaDocBienSo } from '../models';
export interface IAiBienSoService { doc(anh: File): Promise<KetQuaDocBienSo> }
export class ApiAiBienSoService implements IAiBienSoService {
  constructor(private readonly http: IHttpClient) {}
  doc(anh: File) {
    const form = new FormData(); form.append('anh', anh);
    return this.http.putForm<KetQuaDocBienSo>('/api/admin/ai-bien-so/nhan-dien', form);
  }
}
