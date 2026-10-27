import { Component, OnInit, inject } from '@angular/core';
import { SystemStatusService } from './system-status.service';

@Component({
  selector: 'app-system-status',
  template: `
    <section class="status" aria-labelledby="system-status-title" data-testid="system-status">
      <h2 id="system-status-title">Статус системы</h2>
      @switch (status().state) {
        @case ('loading') {
          <p role="status">Проверяем…</p>
        }
        @case ('available') {
          <p role="status" class="ok">Система доступна</p>
          <p class="version">Версия бэкенда: <span data-testid="backend-version">{{ version() }}</span></p>
        }
        @case ('unavailable') {
          <p role="status" class="fail">Система недоступна</p>
        }
      }
    </section>
  `,
  styles: `
    .status { border: 1px solid #d0d7de; border-radius: 8px; padding: 16px 20px; max-width: 420px; }
    h2 { margin: 0 0 8px; font-size: 1.1rem; }
    .ok { color: #1a7f37; font-weight: 600; }
    .fail { color: #cf222e; font-weight: 600; }
    .version { color: #57606a; margin: 4px 0 0; }
  `,
})
export class SystemStatusComponent implements OnInit {
  private readonly service = inject(SystemStatusService);
  protected readonly status = this.service.status;
  protected version(): string {
    const s = this.status();
    return s.state === 'available' ? s.version : '';
  }

  ngOnInit(): void {
    void this.service.refresh();
  }
}
