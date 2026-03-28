import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    FileText, Image as ImageIcon, Trash2, Download, HardDrive,
    File as FileIcon, Search, RefreshCw
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminFiles() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState({ count: 0, size: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/files`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFiles(data);

                // Calculate stats
                const totalSize = data.reduce((acc, curr) => acc + curr.size, 0);
                setStats({ count: data.length, size: totalSize });
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!confirm(`Delete ${filename}? This cannot be undone.`)) return;

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/files/${filename}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('File deleted');
                fetchFiles();
            } else {
                toast.error('Failed to delete file');
            }
        } catch (error) {
            toast.error('Server error');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                toast.success('File uploaded successfully');
                fetchFiles();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload Error:', err);
            toast.error('Connection error during upload');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImage = (name) => {
        return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const FilePreview = ({ file }) => {
        const [error, setError] = useState(false);

        if (isImage(file.name) && !error) {
            return (
                <img
                    src={`${API}${file.url}`}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                    onError={() => setError(true)}
                />
            );
        }

        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {isImage(file.name) ? (
                    <ImageIcon size={48} className="text-gray-400 opacity-50" />
                ) : (
                    <FileText size={48} className="text-gray-400 opacity-50" />
                )}
            </div>
        );
    };

    return (
        <AdminLayout title="File Manager">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <HardDrive className="text-indigo-500" size={32} />
                            File Manager
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage uploads and reclaim storage space.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? <RefreshCw className="animate-spin" size={18} /> : <Download className="rotate-180" size={18} />}
                            {uploading ? 'Uploading...' : 'Direct Upload'}
                        </button>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* storage stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wide">Total Files</p>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">{stats.count}</h2>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-500">
                            <FileIcon size={32} />
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wide">Total Storage Used</p>
                            <h2 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatSize(stats.size)}</h2>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
                            <HardDrive size={32} />
                        </div>
                    </div>
                </div>

                {/* File Grid */}
                <div className="glass-panel p-8 rounded-2xl">
                    <div className="mb-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Uploads</h3>
                        <button onClick={fetchFiles} className="text-gray-500 hover:text-indigo-500 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 flex flex-col items-center justify-center text-gray-500">
                            <RefreshCw className="animate-spin mb-3 text-indigo-500" size={32} />
                            Loading files...
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <FileIcon size={48} className="mx-auto mb-4 opacity-50" />
                            {searchTerm ? 'No matching files found.' : 'No files found in storage.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredFiles.map((file) => (
                                <div key={file.name} className="group relative bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-lg hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-700">
                                    {/* Preview */}
                                    <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-600 mb-3 overflow-hidden flex items-center justify-center relative">
                                        <FilePreview file={file} />

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                            <a
                                                href={`${API}${file.url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                download
                                                className="p-2.5 bg-white rounded-xl text-indigo-600 hover:bg-indigo-50 shadow-lg transition-transform hover:scale-110"
                                                title="Download"
                                            >
                                                <Download size={18} />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(file.name)}
                                                className="p-2.5 bg-white rounded-xl text-red-600 hover:bg-red-50 shadow-lg transition-transform hover:scale-110"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="px-1">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate" title={file.name}>{file.name}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{formatSize(file.size)}</p>
                                            {isImage(file.name) && <ImageIcon size={12} className="text-gray-400" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
