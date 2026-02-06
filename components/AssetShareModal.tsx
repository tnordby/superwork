'use client';

import { useState, useEffect } from 'react';
import { X, Share2, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { Asset, AssetShareWithUser, AssetPermissionLevel } from '@/types/assets';

interface AssetShareModalProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetShareModal({ asset, isOpen, onClose }: AssetShareModalProps) {
  const [shares, setShares] = useState<AssetShareWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<AssetPermissionLevel>('view');

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, asset.id]);

  const loadShares = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}/share`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      // First, find user by email (you'll need to create this endpoint)
      const response = await fetch(`/api/assets/${asset.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, // Backend should lookup user_id from email
          permission_level: permissionLevel,
        }),
      });

      if (response.ok) {
        setEmail('');
        setPermissionLevel('view');
        await loadShares();
      } else {
        const error = await response.json();
        alert(`Failed to share: ${error.error}`);
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to share asset');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Remove access for this user?')) return;

    try {
      const response = await fetch(`/api/assets/${asset.id}/share?share_id=${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadShares();
      } else {
        alert('Failed to remove share');
      }
    } catch (error) {
      console.error('Remove share error:', error);
      alert('Failed to remove share');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Asset</h2>
              <p className="text-sm text-gray-600">{asset.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Share Form */}
          <form onSubmit={handleShare} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with user
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={isSharing}
              />
              <select
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value as AssetPermissionLevel)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={isSharing}
              >
                <option value="view">View</option>
                <option value="download">Download</option>
                <option value="edit">Edit</option>
                <option value="manage">Manage</option>
              </select>
              <button
                type="submit"
                disabled={isSharing || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#bfe937] text-gray-900 rounded-lg font-medium hover:bg-[#a8d130] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Share
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              The user will be able to access this asset based on the permission level you select.
            </p>
          </form>

          {/* Current Shares */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              People with access ({shares.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : shares.length > 0 ? (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {share.shared_with_user.first_name?.[0] || share.shared_with_user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {share.shared_with_user.first_name && share.shared_with_user.last_name
                            ? `${share.shared_with_user.first_name} ${share.shared_with_user.last_name}`
                            : share.shared_with_user.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {share.shared_with_user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 capitalize">
                        {share.permission_level}
                      </span>
                      <button
                        onClick={() => handleRemoveShare(share.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No one has access to this asset yet. Share it with team members above.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
