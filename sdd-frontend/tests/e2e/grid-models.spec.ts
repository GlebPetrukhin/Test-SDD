import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const objects = [{ id: 'ps-1', name: 'ПС Урал', type: 'substation', voltageKv: 220, links: [] }];
const organizations = [
  { id: 'ural', name: 'Россети Урал', kind: 'Сетевая компания' },
  { id: 'so', name: 'Системный оператор', kind: 'Диспетчерский центр' },
];
type Version = {
  id: string;
  number: number;
  title: string;
  baseVersionId: string | null;
  status: string;
  document: { objects: typeof objects };
  organizationId: string;
  createdAt: string;
  issues: string[];
  changes: { objectId: string; name: string; kind: string }[];
};
type Model = {
  id: string;
  name: string;
  region: string;
  ownerId: string;
  revision: number;
  publishedVersionId: string | null;
  versions: Version[];
  events: {
    id: string;
    versionId: string | null;
    action: string;
    organizationId: string;
    comment: string;
    at: string;
  }[];
};

async function mock(page: Page, status = 'published') {
  const model: Model = {
    id: 'ural-220',
    name: 'Сеть Урал',
    region: 'Урал',
    ownerId: 'ural',
    revision: 1,
    publishedVersionId: status === 'published' ? 'v1' : null,
    versions: [
      {
        id: 'v1',
        number: 1,
        title: 'Базовая модель',
        baseVersionId: null,
        status,
        document: { objects },
        organizationId: 'ural',
        createdAt: '2026-10-27T07:00:00Z',
        issues: [],
        changes: [{ objectId: 'ps-1', name: 'ПС Урал', kind: 'added' }],
      },
    ],
    events: [
      {
        id: 'event-1',
        versionId: 'v1',
        action: 'upload',
        organizationId: 'ural',
        comment: 'Базовая модель',
        at: '2026-10-27T07:00:00Z',
      },
    ],
  };
  const models = [model];
  await page.route('**/api/status', (r) => r.fulfill({ json: { status: 'ok', version: 'dev' } }));
  await page.route('**/api/organizations', (r) => r.fulfill({ json: organizations }));
  await page.route('**/api/grid-models**', async (r) => {
    const url = new URL(r.request().url());
    if (r.request().method() === 'GET') {
      if (url.pathname.endsWith('/download'))
        return r.fulfill({
          json: { objects },
          headers: { 'Content-Disposition': 'attachment; filename="model.json"' },
        });
      return r.fulfill({ json: url.pathname === '/api/grid-models' ? models : model });
    }
    const data = r.request().postDataJSON();
    if (url.pathname.endsWith('/actions')) {
      if (data.action === 'reject' && !data.comment?.trim())
        return r.fulfill({
          status: 400,
          json: { code: 'validation', message: 'Укажите причину возврата.' },
        });
      const v = model.versions.find((v) => v.id === url.pathname.split('/')[5])!;
      v.status = (
        {
          submit: 'review',
          approve: 'approved',
          reject: 'rejected',
          publish: 'published',
        } as Record<string, string>
      )[data.action];
      if (data.action === 'publish') model.publishedVersionId = v.id;
      model.revision++;
      model.events.push({
        id: 'e' + model.revision,
        action: data.action,
        versionId: v.id,
        organizationId: data.organizationId,
        comment: data.comment ?? '',
        at: '2026-10-27T08:00:00Z',
      });
      return r.fulfill({ json: model });
    }
    if (url.pathname.endsWith('/versions')) {
      const invalid = JSON.stringify(data.document).includes('missing');
      model.versions.push({
        id: 'v2',
        number: 2,
        title: data.title,
        baseVersionId: model.publishedVersionId,
        status: 'draft',
        document: data.document,
        organizationId: data.organizationId,
        createdAt: '2026-10-27T08:00:00Z',
        issues: invalid ? ['Объект ps-1: ссылка missing не найдена.'] : [],
        changes: [{ objectId: 'ps-1', name: 'ПС Урал', kind: 'modified' }],
      });
      model.revision++;
      return r.fulfill({ status: 201, json: model });
    }
    const created: Model = {
      id: 'new-model',
      name: data.name,
      region: data.region,
      ownerId: data.ownerId,
      revision: 1,
      publishedVersionId: null,
      versions: [],
      events: [],
    };
    models.push(created);
    return r.fulfill({ status: 201, json: created });
  });
  return model;
}

test('[grid-models-01.2] Реестр, поиск, фильтр и пустой результат', async ({ page }) => {
  const model = await mock(page);
  model.versions.push({
    ...model.versions[0],
    id: 'v2',
    number: 2,
    title: 'Новая версия',
    status: 'draft',
    baseVersionId: 'v1',
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Модели электрической сети' })).toBeVisible();
  await page.getByPlaceholder('Найти модель, регион или организацию').fill('Нет такой сети');
  await expect(page.getByText('Модели не найдены', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Найти модель, регион или организацию').fill('Урал');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await expect(
    page.getByTestId('model-detail').getByRole('heading', { name: 'Сеть Урал', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Версия модели')).toHaveValue('v2');
  await page.getByLabel('Версия модели').selectOption('v1');
  await expect(
    page.getByTestId('model-detail').getByText('Опубликована', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Фильтр по статусу').selectOption('review');
  await expect(page.getByText('Модели не найдены', { exact: true })).toBeVisible();
});

test('[grid-models-02.2] Создание модели с обязательными полями', async ({ page }) => {
  await mock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Новая модель', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Название модели').fill('Сеть Север');
  await form.getByLabel('Регион').fill('Север');
  await form.getByRole('button', { name: 'Создать модель' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByTestId('model-detail').getByRole('heading', { name: 'Сеть Север' }),
  ).toBeVisible();
  await expect(page.getByText('Версий пока нет', { exact: true })).toBeVisible();
});

test('[grid-models-03.2] Загрузка JSON, различия и блокировка ошибочной версии', async ({
  page,
}) => {
  await mock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await page.getByRole('button', { name: 'Загрузить версию', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Описание изменения').fill('Обновление ПС');
  await form.getByLabel('JSON модели').fill('{oops');
  await form.getByRole('button', { name: 'Проверить и сохранить' }).click();
  await expect(form.getByText('Некорректный JSON. Проверьте синтаксис.')).toBeVisible();
  await form
    .getByLabel('JSON модели')
    .fill(JSON.stringify({ objects: [{ ...objects[0], links: ['missing'] }] }));
  await form.getByRole('button', { name: 'Проверить и сохранить' }).click();
  await expect(page.getByText('Объект ps-1: ссылка missing не найдена.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'На согласование', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Изменения', exact: true }).click();
  await expect(
    page.getByTestId('model-detail').getByText('Изменён', { exact: true }),
  ).toBeVisible();
});

test('[grid-models-04.2] Действия согласования и возврат с комментарием', async ({ page }) => {
  await mock(page, 'draft');
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await page.getByRole('button', { name: 'На согласование', exact: true }).click();
  await page.getByRole('button', { name: 'Вернуть', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Причина возврата').fill('Уточните данные ПС');
  await page.getByRole('dialog').getByRole('button', { name: 'Вернуть автору' }).click();
  await expect(
    page.getByTestId('model-detail').getByText('Возвращена', { exact: true }),
  ).toBeVisible();
  await page.reload();
  // Новый корректный черновик проходит полный цикл.
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await page.getByRole('button', { name: 'Загрузить версию', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Описание изменения').fill('Исправление');
  await page.getByRole('dialog').getByLabel('JSON модели').fill(JSON.stringify({ objects }));
  await page.getByRole('dialog').getByRole('button', { name: 'Проверить и сохранить' }).click();
  for (const name of ['На согласование', 'Согласовать', 'Опубликовать'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect(
    page.getByTestId('model-detail').getByRole('button', { name: 'Скачать JSON', exact: true }),
  ).toBeVisible();
});

test('[grid-models-05.2] Конфликт сохраняет форму и позволяет обновить карточку', async ({
  page,
}) => {
  await mock(page, 'approved');
  await page.route('**/api/grid-models/*/versions/*/actions', (r) =>
    r.fulfill({
      status: 409,
      json: {
        code: 'conflict',
        message: 'Данные изменились. Обновите карточку и повторите действие.',
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(
    page.getByText('Данные изменились. Обновите карточку и повторите действие.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Обновить данные', exact: true })).toBeVisible();
});

test('[grid-models-06.2] Скачивание опубликованного документа', async ({ page }) => {
  await mock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать JSON', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({ objects });
});

test('[grid-models-07.2] История версии и общий журнал', async ({ page }) => {
  await mock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть модель Сеть Урал' }).click();
  await page.getByRole('button', { name: 'История', exact: true }).click();
  await expect(
    page
      .getByTestId('model-detail')
      .getByRole('listitem')
      .getByText('Базовая модель', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId('model-detail').getByText('Россети Урал', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Журнал событий', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Журнал событий' })).toBeVisible();
  await expect(page.getByText('Сеть Урал · Базовая модель', { exact: true })).toBeVisible();
});

test('[grid-models-08.2] Недоступность, повтор запроса и обозначение демо', async ({ page }) => {
  await mock(page);
  let failed = true;
  await page.route('**/api/grid-models', (r) =>
    failed
      ? r.fulfill({ status: 503, json: { code: 'unavailable', message: 'Недоступно' } })
      : r.fallback(),
  );
  await page.goto('/');
  await expect(page.getByText('Демонстрационный режим · без проверки личности')).toBeVisible();
  await expect(page.getByText('Не удалось загрузить модели', { exact: true })).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Открыть модель Сеть Урал' })).toBeVisible();
});

test('[tech] Доступность WCAG AA, формы и узкий экран', async ({ page }) => {
  await mock(page, 'review');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Открыть модель Сеть Урал' })).toBeVisible();
  const audit = async () =>
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  await audit();
  await page.getByRole('button', { name: 'Новая модель', exact: true }).click();
  await audit();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await audit();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
