// =============================================
// ASSET LIBRARY TYPE DEFINITIONS
// =============================================

export type AssetFileType = 'logo' | 'pdf' | 'image' | 'document' | 'font' | 'other';

export type AssetVisibility = 'private' | 'workspace' | 'public';

export type AssetPermissionLevel = 'view' | 'download' | 'edit' | 'manage';

export type WorkspaceRole = 'owner' | 'admin' | 'consultant' | 'client' | 'viewer' | 'member';

export type WorkspaceType = 'client' | 'agency' | 'internal';

// =============================================
// WORKSPACE TYPES
// =============================================

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  type: WorkspaceType;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
  member_count: number;
}

// =============================================
// ASSET CATEGORY TYPES
// =============================================

export interface AssetCategory {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface AssetCategoryWithCount extends AssetCategory {
  asset_count: number;
}

// =============================================
// ASSET TYPES
// =============================================

export interface Asset {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  name: string;
  file_type: AssetFileType;
  file_extension: string | null;
  file_size: number;
  storage_path: string;
  url: string | null;
  uploaded_by: string | null;
  uploaded_by_role: string | null;
  category: string | null;
  folder: string | null;
  description: string | null;
  metadata: Record<string, any>;
  tags: string[];
  visibility: AssetVisibility;
  created_at: string;
  updated_at: string;
}

export interface AssetWithShares extends Asset {
  shares: AssetShare[];
  shared_count: number;
}

export interface AssetShare {
  id: string;
  asset_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission_level: AssetPermissionLevel;
  expires_at: string | null;
  created_at: string;
}

export interface AssetShareWithUser extends AssetShare {
  shared_with_user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// =============================================
// ASSET UPLOAD TYPES
// =============================================

export interface AssetUploadRequest {
  file: File;
  workspace_id?: string;
  project_id?: string;
  category?: string;
  folder?: string;
  description?: string;
  tags?: string[];
  visibility?: AssetVisibility;
}

export interface AssetUploadProgress {
  file_name: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  asset?: Asset;
}

export interface AssetUploadResponse {
  success: boolean;
  asset?: Asset;
  error?: string;
}

// =============================================
// ASSET FILTER AND SEARCH TYPES
// =============================================

export interface AssetFilters {
  workspace_id?: string;
  project_id?: string;
  file_type?: AssetFileType | AssetFileType[];
  category?: string;
  folder?: string;
  tags?: string[];
  search?: string;
  uploaded_by?: string;
  visibility?: AssetVisibility;
  created_after?: string;
  created_before?: string;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// =============================================
// ASSET METADATA TYPES
// =============================================

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  has_alpha: boolean;
  color_space?: string;
}

export interface DocumentMetadata {
  page_count?: number;
  author?: string;
  title?: string;
  created_date?: string;
}

export interface FontMetadata {
  font_family: string;
  font_style: string;
  font_weight: string;
}

// =============================================
// ASSET OPERATION TYPES
// =============================================

export interface AssetUpdateRequest {
  name?: string;
  category?: string;
  folder?: string;
  description?: string;
  tags?: string[];
  visibility?: AssetVisibility;
}

export interface AssetShareRequest {
  user_id: string;
  permission_level: AssetPermissionLevel;
  expires_at?: string;
}

export interface AssetBulkOperation {
  asset_ids: string[];
  operation: 'delete' | 'move' | 'tag' | 'share';
  params?: Record<string, any>;
}

// =============================================
// UTILITY TYPES
// =============================================

export const ALLOWED_FILE_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
  pdf: ['application/pdf'],
  font: [
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/font-woff',
    'application/font-woff2',
  ],
} as const;

/** When the browser sends an empty type or application/octet-stream, infer from extension (must match bucket allow-list). */
const EXTENSION_TO_CANONICAL_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  pdf: 'application/pdf',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const FILE_TYPE_ICONS: Record<AssetFileType, string> = {
  logo: '🎨',
  pdf: '📄',
  image: '🖼️',
  document: '📝',
  font: '🔤',
  other: '📎',
};

export const FILE_TYPE_LABELS: Record<AssetFileType, string> = {
  logo: 'Logo',
  pdf: 'PDF Document',
  image: 'Image',
  document: 'Document',
  font: 'Font File',
  other: 'Other',
};

// Helper function to determine file type from MIME type
export function getFileTypeFromMime(mimeType: string): AssetFileType {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('font/') || mimeType.includes('font')) {
    return 'font';
  }
  if (mimeType.includes('document') || mimeType.includes('text')) {
    return 'document';
  }
  return 'other';
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to validate file type
const ALL_ALLOWED_MIME_TYPES: readonly string[] = [
  ...ALLOWED_FILE_TYPES.image,
  ...ALLOWED_FILE_TYPES.pdf,
  ...ALLOWED_FILE_TYPES.font,
];

export function isValidFileType(mimeType: string): boolean {
  if (!mimeType || mimeType.trim() === '') return false;
  return ALL_ALLOWED_MIME_TYPES.includes(mimeType);
}

/** Resolve Content-Type for upload: trust browser when valid; otherwise infer from filename (fonts/images often report octet-stream or ""). */
export function resolveAssetUploadContentType(
  file: Pick<Blob, 'type'>,
  fileNameForInference: string
): string | null {
  const declared = file.type?.trim() ?? '';
  if (declared && declared !== 'application/octet-stream' && isValidFileType(declared)) {
    return declared;
  }
  const ext = getFileExtension(fileNameForInference);
  const inferred = ext ? EXTENSION_TO_CANONICAL_MIME[ext] : undefined;
  if (inferred && isValidFileType(inferred)) {
    return inferred;
  }
  return null;
}

export function isAllowedAssetUpload(file: Pick<Blob, 'type'>, fileNameForInference: string): boolean {
  return resolveAssetUploadContentType(file, fileNameForInference) !== null;
}

// Helper function to get file extension
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
