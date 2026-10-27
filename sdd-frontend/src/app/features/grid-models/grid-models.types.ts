export interface Organization {
  id: string;
  name: string;
  kind: string;
}
export interface GridObject {
  id: string;
  name: string;
  type: string;
  voltageKv: number;
  links: string[];
}
export interface GridDocument {
  objects: GridObject[];
}
export type VersionStatus = 'draft' | 'review' | 'approved' | 'published' | 'rejected';
export interface GridVersion {
  id: string;
  number: number;
  title: string;
  baseVersionId: string | null;
  status: VersionStatus;
  organizationId: string;
  createdAt: string;
  document: GridDocument;
  issues: string[];
  changes: { objectId: string; name: string; kind: string }[];
}
export interface GridEvent {
  id: string;
  versionId: string | null;
  action: string;
  organizationId: string;
  comment: string;
  at: string;
}
export interface GridModel {
  id: string;
  name: string;
  region: string;
  ownerId: string;
  revision: number;
  publishedVersionId: string | null;
  versions: GridVersion[];
  events: GridEvent[];
}
export interface CreateModel {
  name: string;
  region: string;
  ownerId: string;
  organizationId: string;
}
export interface CreateVersion {
  title: string;
  baseVersionId: string | null;
  revision: number;
  organizationId: string;
  document: GridDocument;
}
