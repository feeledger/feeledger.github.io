/**
 * Google Drive API v3 client.
 * Uses only the drive.file scope — can only access files this app created.
 * All methods take an accessToken obtained from GIS OAuth2 flow.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
  size?: string;
}

export interface DriveError {
  code: number;
  message: string;
  status?: string;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class DriveAPIError extends Error {
  code: number;
  status?: string;

  constructor(message: string, code: number, status?: string) {
    super(message);
    this.name = 'DriveAPIError';
    this.code = code;
    this.status = status;
  }
}

// ── Request helper ────────────────────────────────────────────────────────────

async function driveRequest<T>(
  url: string,
  options: RequestInit,
  token: string,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: { error?: DriveError } = {};
    try { errorBody = await response.json(); } catch { /* ignore */ }
    const msg = errorBody?.error?.message ?? `Drive API error ${response.status}`;
    throw new DriveAPIError(msg, response.status, errorBody?.error?.status);
  }

  // 204 No Content
  if (response.status === 204) return {} as T;

  return response.json() as Promise<T>;
}

// ── Drive API methods ─────────────────────────────────────────────────────────

export const driveClient = {

  /**
   * List files/folders matching a query.
   * Uses drive.file scope — only sees files this app created.
   */
  async listFiles(
    token: string,
    query: string,
    fields = 'files(id,name,mimeType,parents,modifiedTime)',
  ): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: query,
      fields,
      spaces: 'drive',
      pageSize: '100',
    });
    const result = await driveRequest<{ files: DriveFile[] }>(
      `${DRIVE_API}/files?${params}`,
      { method: 'GET' },
      token,
    );
    return result.files ?? [];
  },

  /**
   * Create a folder in Drive.
   */
  async createFolder(
    token: string,
    name: string,
    parentId?: string,
  ): Promise<DriveFile> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];

    return driveRequest<DriveFile>(
      `${DRIVE_API}/files`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      },
      token,
    );
  },

  /**
   * Upload or update a JSON file in Drive (multipart).
   * If fileId is provided, updates the existing file.
   * Otherwise creates a new file.
   */
  async uploadJSON(
    token: string,
    name: string,
    data: unknown,
    parentId?: string,
    fileId?: string,
  ): Promise<DriveFile> {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const metadata: Record<string, unknown> = {
      name,
      mimeType: 'application/json',
    };
    if (parentId && !fileId) metadata.parents = [parentId];

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const url = fileId
      ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`;

    return driveRequest<DriveFile>(
      url,
      { method: fileId ? 'PATCH' : 'POST', body: form },
      token,
    );
  },

  /**
   * Upload a PDF blob to Drive.
   */
  async uploadPDF(
    token: string,
    name: string,
    pdfBlob: Blob,
    parentId: string,
    fileId?: string,
  ): Promise<DriveFile> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: 'application/pdf',
    };
    if (!fileId) metadata.parents = [parentId];

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const url = fileId
      ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`;

    return driveRequest<DriveFile>(
      url,
      { method: fileId ? 'PATCH' : 'POST', body: form },
      token,
    );
  },

  /**
   * Download and parse a JSON file from Drive.
   */
  async downloadJSON<T>(token: string, fileId: string): Promise<T> {
    const response = await fetch(
      `${DRIVE_API}/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new DriveAPIError(`Download failed: ${response.status}`, response.status);
    }
    return response.json() as Promise<T>;
  },

  /**
   * Get file metadata.
   */
  async getFile(token: string, fileId: string): Promise<DriveFile> {
    return driveRequest<DriveFile>(
      `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,modifiedTime`,
      { method: 'GET' },
      token,
    );
  },

  /**
   * Delete a file.
   */
  async deleteFile(token: string, fileId: string): Promise<void> {
    await driveRequest<void>(
      `${DRIVE_API}/files/${fileId}`,
      { method: 'DELETE' },
      token,
    );
  },
};
