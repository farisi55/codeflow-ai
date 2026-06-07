export interface ProjectMeta {
  createdAt: string;
  description?: string;
  id: string;
  name: string;
  updatedAt: string;
}

export interface Project extends ProjectMeta {
  files: readonly string[];
  rootPath?: string;
}
