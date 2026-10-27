import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { CreateModel, CreateVersion, GridModel, Organization } from './grid-models.types';

@Service()
export class GridModelsService {
  private readonly http = inject(HttpClient);
  list() {
    return firstValueFrom(this.http.get<GridModel[]>('/api/grid-models').pipe(timeout(10_000)));
  }
  organizations() {
    return firstValueFrom(
      this.http.get<Organization[]>('/api/organizations').pipe(timeout(10_000)),
    );
  }
  create(data: CreateModel) {
    return firstValueFrom(
      this.http.post<GridModel>('/api/grid-models', data).pipe(timeout(10_000)),
    );
  }
  upload(id: string, data: CreateVersion) {
    return firstValueFrom(
      this.http.post<GridModel>(`/api/grid-models/${id}/versions`, data).pipe(timeout(10_000)),
    );
  }
  action(
    id: string,
    version: string,
    data: { action: string; revision: number; organizationId: string; comment: string },
  ) {
    return firstValueFrom(
      this.http
        .post<GridModel>(`/api/grid-models/${id}/versions/${version}/actions`, data)
        .pipe(timeout(10_000)),
    );
  }
  download(id: string, version: string) {
    return firstValueFrom(
      this.http
        .get(`/api/grid-models/${id}/versions/${version}/download`, { responseType: 'blob' })
        .pipe(timeout(10_000)),
    );
  }
}
