import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generate avatar from initials
function generateInitialsAvatar(name) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-gradient-to-br from-blue-500 to-purple-600',
    'bg-gradient-to-br from-green-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-red-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-blue-600',
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;

  return { initials, colorClass: colors[colorIndex] };
}

export default function ProfileModal({ onClose }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const token = localStorage.getItem('tc_token');
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        if (data.user.avatar) {
          setAvatarUrl(`${API}/api/user/avatar/${data.user.avatar}`);
        }
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }

  async function saveProfile() {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('tc_token');
      const res = await fetch(`${API}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('tc_token');
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API}/api/user/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(`${API}${data.url}?t=${Date.now()}`);
        setAvatarPreview(null);
        setMessage({ type: 'success', text: 'Avatar uploaded!' });

        // Reload user data
        await loadUser();
      } else {
        setMessage({ type: 'error', text: 'Failed to upload avatar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload error' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function deleteAvatar() {
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('tc_token');
      const res = await fetch(`${API}/api/user/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setAvatarUrl(null);
        setAvatarPreview(null);
        setMessage({ type: 'success', text: 'Avatar removed!' });
        await loadUser();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete avatar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete error' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  const { initials, colorClass } = generateInitialsAvatar(name || user?.name || 'U');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
              {message.text}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              {/* Avatar Display */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-white text-3xl font-bold ${colorClass}`}>
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-white text-sm font-medium"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Change'}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            {/* Avatar Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Upload
              </button>
              {avatarUrl && (
                <button
                  onClick={deleteAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Save Profile Information'}
            </button>
          </div>

          {/* Account Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Account ID:</span>
                <span className="text-gray-900 dark:text-white font-medium">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Role:</span>
                <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {user?.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
