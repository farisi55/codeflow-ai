export interface FileNode {
  children?: readonly FileNode[];
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export interface FileContent {
  content: string;
  encoding: 'utf-8' | 'base64';
  path: string;
}

export type FileOperation =
  | {
      path: string;
      type: 'create_file' | 'create_directory';
    }
  | {
      path: string;
      type: 'delete';
    }
  | {
      from: string;
      to: string;
      type: 'move';
    }
  | {
      content: string;
      path: string;
      type: 'write';
    };
