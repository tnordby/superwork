'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, File, Download, Trash2, Search, FolderOpen, Loader2 } from 'lucide-react';
import { Asset, Workspace } from '@/types/assets';

function AssetImagePreview({
  assetId,
  hovered,
}: {
  assetId: string;
  hovered: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    if (src) return;
    if (loading) return;

    let active = true;
    setLoading(true);
    fetch(`/api/assets/${assetId}/preview`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`preview request failed: ${r.status}`);
        const data = await r.json();
        return data.preview_url as string | undefined;
      })
      .then((url) => {
        if (!active) return;
        setSrc(url ?? null);
      })
      .catch(() => {
        if (!active) return;
        setSrc(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [assetId, hovered, src, loading]);

  // Only show the preview while hovering; cache stays in component state.
  if (!hovered) {
    return <ImageIcon className="h-5 w-5" />;
  }

  if (src) {
    return <img src={src} alt="" className="h-16 w-16 rounded-xl object-cover" />;
  }

  if (loading) {
    return <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />;
  }

  return <ImageIcon className="h-5 w-5" />;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const dragDepth = useRef(0);

  // Load workspaces and assets on mount
  useEffect(() => {
    loadWorkspaces();
    loadAssets();
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWorkspace) {
        params.append('workspace_id', selectedWorkspace);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/assets?${params.toString()}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        const body = await response.json().catch(() => ({}));
        console.error('Failed to load assets', response.status, body);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadAssets();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (fileArray.length === 0) return;
    if (isUploading) return;

    setIsUploading(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileKey = `${file.name}-${Date.now()}`;

      try {
        setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

        const formData = new FormData();
        formData.append('file', file);
        const workspaceForUpload =
          selectedWorkspace ?? (workspaces.length === 1 ? workspaces[0].id : null);
        if (workspaceForUpload) {
          formData.append('workspace_id', workspaceForUpload);
        }
        formData.append('visibility', 'workspace');

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.ok) {
          setUploadProgress((prev) => ({ ...prev, [fileKey]: 100 }));
          await loadAssets();
        } else {
          const error = await response.json().catch(() => ({}));
          const detail =
            typeof error.details === 'string' ? `\n\n${error.details}` : '';
          alert(
            `Failed to upload ${file.name}: ${
              error.error || response.statusText
            }${detail}`
          );
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[fileKey];
            return newProgress;
          });
        }, 1000);
      }
    }

    setIsUploading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(event.target.files || []);
    event.target.value = '';
  };

  const getFileIcon = (type: Asset['file_type']) => {
    switch (type) {
      case 'logo':
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'font':
        return <File className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getFileColor = (type: Asset['file_type']) => {
    switch (type) {
      case 'logo':
      case 'image':
        return 'bg-blue-100 text-blue-600';
      case 'pdf':
        return 'bg-red-100 text-red-600';
      case 'font':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDownload = async (assetId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/download`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.download_url, '_blank');
      } else {
        alert('Failed to download asset');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download asset');
    }
  };

  const handleDelete = async (assetId: string, assetName: string) => {
    if (!confirm(`Are you sure you want to delete "${assetName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAssets();
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete asset');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Shared Asset Library</h1>
        <p className="text-gray-600">Central location for brand assets, documents, and shared materials</p>
      </div>

      {/* Workspace Selector */}
      {workspaces.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace
          </label>
          <select
            value={selectedWorkspace || ''}
            onChange={(e) => setSelectedWorkspace(e.target.value || null)}
            className="w-full md:w-64 rounded-xl border border-gray-200 bg-white py-2 px-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">All Workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload Area */}
      <div className="mb-8">
        <label
          htmlFor="file-upload"
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-all ${
            isUploading
              ? 'opacity-50 cursor-not-allowed'
              : isDragOver
                ? 'border-[#bfe937] bg-[#f3ffe0] hover:border-[#bfe937]'
                : 'hover:border-gray-400 hover:bg-gray-100'
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            if (isUploading) return;
            dragDepth.current += 1;
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (isUploading) return;
            if (!isDragOver) setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setIsDragOver(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setIsDragOver(false);
            if (isUploading) return;

            const droppedFiles = e.dataTransfer.files;
            if (!droppedFiles || droppedFiles.length === 0) return;
            await uploadFiles(droppedFiles);
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-[#bfe937] p-4 transition-transform group-hover:scale-110">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-gray-900 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-gray-900" />
              )}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {isUploading ? 'Uploading...' : 'Upload Assets'}
            </h3>
            <p className="mb-1 text-sm text-gray-600">
              Click to browse or drag and drop your files
            </p>
            <p className="text-xs text-gray-500">
              Supports: Images (PNG, JPG, SVG, WebP), PDFs, Fonts (TTF, OTF, WOFF)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max file size: 50MB
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,application/pdf,.ttf,.otf,.woff,.woff2"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([key, progress]) => (
              <div key={key} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{key.split('-')[0]}</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#bfe937] h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Assets Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Assets ({assets.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
              >
                {/* File Icon */}
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl ${getFileColor(
                    asset.file_type
                  )}`}
                  onMouseEnter={() => {
                    if (asset.file_type === 'image') setHoveredAssetId(asset.id);
                  }}
                  onMouseLeave={() => {
                    if (hoveredAssetId === asset.id) setHoveredAssetId(null);
                  }}
                >
                  {asset.file_type === 'image'
                    ? (
                        <AssetImagePreview
                          assetId={asset.id}
                          hovered={hoveredAssetId === asset.id}
                        />
                      )
                    : getFileIcon(asset.file_type)}
                </div>

                {/* File Info */}
                <h3 className="mb-1 truncate text-base font-semibold text-gray-900" title={asset.name}>
                  {asset.name}
                </h3>
                {asset.category && (
                  <span className="inline-block mb-3 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {asset.category}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleDownload(asset.id, asset.name)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id, asset.name)}
                    className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Upload your first asset to get started'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
