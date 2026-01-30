'use client';

import { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, File, Download, Trash2, Search } from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  type: 'logo' | 'pdf' | 'image' | 'other';
  size: string;
  uploadedDate: string;
  url?: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: 1,
      name: 'Brand Logo.svg',
      type: 'logo',
      size: '45 KB',
      uploadedDate: '2026-01-20',
    },
    {
      id: 2,
      name: 'Marketing Presentation.pdf',
      type: 'pdf',
      size: '2.3 MB',
      uploadedDate: '2026-01-18',
    },
    {
      id: 3,
      name: 'Hero Image.jpg',
      type: 'image',
      size: '1.8 MB',
      uploadedDate: '2026-01-15',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAssets: Asset[] = Array.from(files).map((file, index) => ({
      id: assets.length + index + 1,
      name: file.name,
      type: getFileType(file.name),
      size: formatFileSize(file.size),
      uploadedDate: new Date().toISOString().split('T')[0],
    }));

    setAssets([...assets, ...newAssets]);
  };

  const getFileType = (filename: string): Asset['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['svg', 'png', 'jpg', 'jpeg'].includes(ext || '')) {
      if (filename.toLowerCase().includes('logo')) return 'logo';
      return 'image';
    }
    if (ext === 'pdf') return 'pdf';
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: Asset['type']) => {
    switch (type) {
      case 'logo':
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getFileColor = (type: Asset['type']) => {
    switch (type) {
      case 'logo':
      case 'image':
        return 'bg-blue-100 text-blue-600';
      case 'pdf':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: number) => {
    setAssets(assets.filter((asset) => asset.id !== id));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Assets</h1>
        <p className="text-gray-600">Central location for delivered work and shared materials</p>
      </div>

      {/* Upload Area */}
      <div className="mb-8">
        <label
          htmlFor="file-upload"
          className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-all hover:border-gray-400 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-[#bfe937] p-4 transition-transform group-hover:scale-110">
              <Upload className="h-8 w-8 text-gray-900" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Upload Assets</h3>
            <p className="mb-1 text-sm text-gray-600">
              Click to browse or drag and drop your files
            </p>
            <p className="text-xs text-gray-500">
              Supports: Images (PNG, JPG, SVG), PDFs, and other documents
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileUpload}
          />
        </label>
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
            Your Assets ({filteredAssets.length})
          </h2>
        </div>

        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
              >
                {/* File Icon */}
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl ${getFileColor(
                    asset.type
                  )}`}
                >
                  {getFileIcon(asset.type)}
                </div>

                {/* File Info */}
                <h3 className="mb-1 truncate text-base font-semibold text-gray-900" title={asset.name}>
                  {asset.name}
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  {asset.size} • {new Date(asset.uploadedDate).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
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
