import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

/** Контракт GET /api/status — sdd-specs, change add-system-status, design.md */
export interface StatusResponse {
  status: string;
  version: string;
}

/** Сколько ждём ответа, прежде чем считать систему недоступной. */
export const STATUS_TIMEOUT_MS = 5000;

export type SystemStatus =
  | { state: 'loading' }
  | { state: 'available'; version: string }
  | { state: 'unavailable' };

/** Capability system-status (sdd-specs/openspec/specs/system-status). */
@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly http = inject(HttpClient);
  private readonly _status = signal<SystemStatus>({ state: 'loading' });

  readonly status = this._status.asReadonly();

  async refresh(): Promise<void> {
    this._status.set({ state: 'loading' });
    try {
      const res = await firstValueFrom(this.http.get<StatusResponse>('/api/status').pipe(timeout(STATUS_TIMEOUT_MS)));
      this._status.set(
        res?.status === 'ok' ? { state: 'available', version: res.version } : { state: 'unavailable' },
      );
    } catch {
      // [system-status-04] технические детали пользователю не показываем
      this._status.set({ state: 'unavailable' });
    }
  }
}
