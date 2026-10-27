import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { STATUS_TIMEOUT_MS, SystemStatusService } from './system-status.service';

describe('SystemStatusService', () => {
  let service: SystemStatusService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SystemStatusService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('[system-status-03.1] ответ ok → «доступна» с версией', async () => {
    const done = service.refresh();
    http.expectOne('/api/status').flush({ status: 'ok', version: '1.2.3' });
    await done;
    expect(service.status()).toEqual({ state: 'available', version: '1.2.3' });
  });

  it('[system-status-04.1] ошибка HTTP → «недоступна»', async () => {
    const done = service.refresh();
    http.expectOne('/api/status').flush('boom', { status: 500, statusText: 'Server Error' });
    await done;
    expect(service.status()).toEqual({ state: 'unavailable' });
  });

  it('[system-status-04.2] нет ответа → «недоступна» ровно по таймауту 5 с', async () => {
    vi.useFakeTimers();
    try {
      const done = service.refresh();
      const req = http.expectOne('/api/status');
      await vi.advanceTimersByTimeAsync(4999);
      expect(req.cancelled).toBe(false);
      expect(service.status()).not.toEqual({ state: 'unavailable' });
      await vi.advanceTimersByTimeAsync(2);
      await done;
      expect(req.cancelled).toBe(true);
      expect(service.status()).toEqual({ state: 'unavailable' });
    } finally {
      vi.useRealTimers();
    }
  });
});
