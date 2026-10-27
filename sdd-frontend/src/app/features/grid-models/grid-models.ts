import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GridModelsService } from './grid-models.service';
import { GridDocument, GridModel, GridVersion, Organization } from './grid-models.types';
import { SystemStatusComponent } from '../system-status/system-status';
import { Icon } from './icon';

@Component({
  selector: 'app-grid-models',
  imports: [DatePipe, SystemStatusComponent, Icon],
  templateUrl: './grid-models.html',
  styleUrl: './grid-models.scss',
})
export class GridModelsComponent implements OnInit {
  private readonly api = inject(GridModelsService);
  protected readonly models = signal<GridModel[]>([]);
  protected readonly organizations = signal<Organization[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly view = signal('models');
  protected readonly query = signal('');
  protected readonly filter = signal('all');
  protected readonly selectedId = signal('');
  protected readonly versionId = signal('');
  protected readonly tab = signal('objects');
  protected readonly organizationId = signal('ural');
  protected readonly mode = signal('create');
  protected readonly formError = signal('');
  protected readonly name = signal('');
  protected readonly region = signal('');
  protected readonly ownerId = signal('ural');
  protected readonly title = signal('');
  protected readonly json = signal('');
  protected readonly comment = signal('');
  protected readonly fileReading = signal(false);
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly selected = computed(() =>
    this.models().find((m) => m.id === this.selectedId()),
  );
  protected readonly version = computed(() => {
    const m = this.selected();
    return m?.versions.find((v) => v.id === this.versionId()) ?? m?.versions.at(-1);
  });
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return this.models()
      .filter((m) =>
        `${m.name} ${m.region} ${this.orgName(m.ownerId)}`.toLocaleLowerCase().includes(q),
      )
      .filter((m) => this.view() !== 'reviews' || m.versions.some((v) => v.status === 'review'))
      .filter((m) => this.filter() === 'all' || this.latest(m)?.status === this.filter());
  });
  protected readonly reviewCount = computed(
    () =>
      this.models()
        .flatMap((m) => m.versions)
        .filter((v) => v.status === 'review').length,
  );
  protected readonly publishedCount = computed(
    () => this.models().filter((m) => m.publishedVersionId).length,
  );
  protected readonly issueCount = computed(
    () =>
      this.models()
        .flatMap((m) => m.versions)
        .filter((v) => v.issues.length > 0).length,
  );
  protected readonly events = computed(() =>
    this.models()
      .flatMap((m) => m.events.map((e) => ({ ...e, modelName: m.name })))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  protected readonly pageTitle = computed(
    () =>
      (
        ({
          models: 'Модели электрической сети',
          reviews: 'Согласование моделей',
          activity: 'Журнал событий',
          organizations: 'Участники обмена',
        }) as Record<string, string>
      )[this.view()] ?? 'Модели электрической сети',
  );
  protected readonly statusNames: Record<string, string> = {
    draft: 'Черновик',
    review: 'На согласовании',
    approved: 'Согласована',
    published: 'Опубликована',
    rejected: 'Возвращена',
  };
  protected readonly typeNames: Record<string, string> = {
    substation: 'Подстанция',
    line: 'Линия',
    transformer: 'Трансформатор',
    busbar: 'Система шин',
  };
  protected readonly changeNames: Record<string, string> = {
    added: 'Добавлен',
    modified: 'Изменён',
    removed: 'Удалён',
  };
  protected readonly actionNames: Record<string, string> = {
    create: 'Модель создана',
    upload: 'Версия загружена',
    submit: 'Отправлена на согласование',
    approve: 'Версия согласована',
    reject: 'Возвращена автору',
    publish: 'Версия опубликована',
  };

  ngOnInit() {
    void this.refresh();
  }
  protected async refresh() {
    this.loading.set(true);
    this.loadError.set(false);
    this.error.set('');
    try {
      const [models, organizations] = await Promise.all([
        this.api.list(),
        this.api.organizations(),
      ]);
      this.models.set(models);
      this.organizations.set(organizations);
      if (!models.some((m) => m.id === this.selectedId())) this.selectedId.set(models[0]?.id ?? '');
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected orgName(id: string) {
    return this.organizations().find((o) => o.id === id)?.name ?? id;
  }
  protected latest(m: GridModel) {
    return m.versions.at(-1);
  }
  protected published(m: GridModel) {
    return m.versions.find((v) => v.id === m.publishedVersionId);
  }
  protected openModel(m: GridModel) {
    this.selectedId.set(m.id);
    this.versionId.set(
      this.view() === 'reviews'
        ? ([...m.versions].reverse().find((v) => v.status === 'review')?.id ?? '')
        : '',
    );
    this.tab.set('objects');
    this.error.set('');
  }
  protected navigate(view: string) {
    this.view.set(view);
    this.filter.set('all');
    this.query.set('');
    if (view === 'reviews') {
      const m = this.models().find((m) => m.versions.some((v) => v.status === 'review'));
      if (m) this.openModel(m);
    }
  }
  protected chooseVersion(id: string) {
    this.versionId.set(id);
    this.tab.set('objects');
  }
  protected field(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  protected openDialog(mode: string) {
    this.mode.set(mode);
    this.formError.set('');
    this.name.set('');
    this.region.set('');
    this.title.set('');
    this.comment.set('');
    this.ownerId.set(this.organizationId());
    const m = this.selected();
    this.json.set(
      JSON.stringify(
        (m && this.published(m)?.document) ?? {
          objects: [{ id: 'ps-1', name: 'ПС Урал', type: 'substation', voltageKv: 220, links: [] }],
        },
        null,
        2,
      ),
    );
    this.dialog().nativeElement.showModal();
  }
  protected closeDialog() {
    if (!this.busy() && !this.fileReading()) this.dialog().nativeElement.close();
  }
  protected onCancel(event: Event) {
    if (this.busy() || this.fileReading()) event.preventDefault();
  }
  private replace(model: GridModel) {
    this.models.update((list) =>
      list.some((m) => m.id === model.id)
        ? list.map((m) => (m.id === model.id ? model : m))
        : [...list, model],
    );
    this.selectedId.set(model.id);
  }
  private message(error: unknown) {
    if (
      error instanceof HttpErrorResponse &&
      error.error &&
      typeof error.error === 'object' &&
      typeof error.error.message === 'string' &&
      ['validation', 'conflict', 'invalid_transition', 'not_found'].includes(error.error.code)
    )
      return error.error.message as string;
    return 'Не удалось выполнить действие. Проверьте соединение и повторите.';
  }
  protected async save(event: Event) {
    event.preventDefault();
    if (this.busy() || this.fileReading()) return;
    this.formError.set('');
    this.error.set('');
    this.notice.set('');
    let document: GridDocument | undefined;
    if (this.mode() === 'upload') {
      try {
        const value: unknown = JSON.parse(this.json());
        if (
          typeof value !== 'object' ||
          value === null ||
          !('objects' in value) ||
          !Array.isArray(value.objects)
        ) {
          this.formError.set('Документ должен содержать массив objects.');
          return;
        }
        document = value as GridDocument;
      } catch {
        this.formError.set('Некорректный JSON. Проверьте синтаксис.');
        return;
      }
    }
    this.busy.set(true);
    try {
      let model: GridModel;
      if (this.mode() === 'create') {
        model = await this.api.create({
          name: this.name(),
          region: this.region(),
          ownerId: this.ownerId(),
          organizationId: this.organizationId(),
        });
        this.view.set('models');
        this.query.set('');
        this.filter.set('all');
      } else {
        const m = this.selected();
        if (!m) return;
        if (this.mode() === 'reject') {
          const v = this.version();
          if (!v) return;
          model = await this.api.action(m.id, v.id, {
            action: 'reject',
            revision: m.revision,
            organizationId: this.organizationId(),
            comment: this.comment(),
          });
        } else {
          model = await this.api.upload(m.id, {
            title: this.title(),
            revision: m.revision,
            baseVersionId: m.publishedVersionId,
            organizationId: this.organizationId(),
            document: document!,
          });
          this.versionId.set(model.versions.at(-1)?.id ?? '');
          this.tab.set('objects');
        }
      }
      this.replace(model);
      this.notice.set('Изменения сохранены');
      this.dialog().nativeElement.close();
    } catch (error) {
      this.formError.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async act(action: string) {
    const m = this.selected(),
      v = this.version();
    if (!m || !v || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      this.replace(
        await this.api.action(m.id, v.id, {
          action,
          revision: m.revision,
          organizationId: this.organizationId(),
          comment: '',
        }),
      );
      this.notice.set(this.actionNames[action]);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async readFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      this.formError.set('Файл слишком большой. Максимум — 1,5 МБ.');
      input.value = '';
      return;
    }
    this.fileReading.set(true);
    this.formError.set('');
    try {
      this.json.set(await file.text());
    } catch {
      this.formError.set('Не удалось прочитать файл. Попробуйте снова.');
    } finally {
      this.fileReading.set(false);
      input.value = '';
    }
  }
  protected async download() {
    const m = this.selected(),
      v = this.version();
    if (!m || !v || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const blob = await this.api.download(m.id, v.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `model-${m.id}-v${v.number}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected baseName(v: GridVersion) {
    return this.selected()?.versions.find((item) => item.id === v.baseVersionId)?.number ?? '—';
  }
}
