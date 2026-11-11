import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    HardDrive, Folder, FolderPlus, FolderOpen, Upload, Download,
    Trash2, Search, RefreshCw, Eye, FileText, Image as ImageIcon,
    Music, Video, Archive, Grid, List, Check, Copy, ChevronRight,
    X, ArrowUpDown, Filter, AlertCircle, Plus, CheckSquare, Square
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminFiles() {
    const [items, setItems] = useState([]);
    const [currentFolder, setCurrentFolder] = useState('');
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Uploads', path: '' }]);
    const [stats, setStats] = useState({
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        byCategory: {}
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('date-desc');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [previewItem, setPreviewItem] = useState(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [deleteModalItem, setDeleteModalItem] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchFiles(currentFolder);
    }, [currentFolder]);

    const fetchFiles = async (folderPath = currentFolder) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('tc_token');
            const query = folderPath ? `?folder=${encodeURIComponent(folderPath)}` : '';
            const res = await fetch(`${API}/api/admin/files${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setBreadcrumbs(data.breadcrumbs || [{ name: 'Uploads', path: '' }]);
                if (data.stats) {
                    setStats(data.stats);
                }
                setSelectedItems(new Set());
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || 'Failed to load file directory');
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            toast.error('Network connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFiles = async (filesList) => {
        if (!filesList || filesList.length === 0) return;

        try {
            setUploading(true);
            const formData = new FormData();
            for (let i = 0; i < filesList.length; i++) {
                formData.append('files', filesList[i]);
            }

            const token = localStorage.getItem('tc_token');
            const query = currentFolder ? `?folder=${encodeURIComponent(currentFolder)}` : '';
            const res = await fetch(`${API}/api/admin/files/upload${query}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(result.message || 'Upload complete!');
                fetchFiles(currentFolder);
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload Error:', err);
            toast.error('Connection error during upload');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            setIsCreatingFolder(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/files/folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newFolderName.trim(),
                    parentFolder: currentFolder
                })
            });

            if (res.ok) {
                toast.success('Folder created successfully');
                setIsCreateFolderOpen(false);
                setNewFolderName('');
                fetchFiles(currentFolder);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Failed to create folder');
            }
        } catch (err) {
            toast.error('Error creating folder');
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModalItem) return;

        try {
            setIsDeleting(true);
            const token = localStorage.getItem('tc_token');
            const query = `?path=${encodeURIComponent(deleteModalItem.path)}`;
            const res = await fetch(`${API}/api/admin/files${query}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success(`${deleteModalItem.isDirectory ? 'Folder' : 'File'} deleted`);
                setDeleteModalItem(null);
                fetchFiles(currentFolder);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Delete failed');
            }
        } catch (err) {
            toast.error('Server error deleting item');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Permanently delete ${selectedItems.size} selected item(s)?`)) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('tc_token');
            for (const itemPath of selectedItems) {
                await fetch(`${API}/api/admin/files?path=${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            toast.success(`Deleted ${selectedItems.size} item(s)`);
            setSelectedItems(new Set());
            fetchFiles(currentFolder);
        } catch (e) {
            toast.error('Batch deletion encountered errors');
            fetchFiles(currentFolder);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectItem = (itemPath) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemPath)) {
                next.delete(itemPath);
            } else {
                next.add(itemPath);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.path)));
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return '—';
        }
    };

    const getCategoryIcon = (category, size = 20) => {
        switch (category) {
            case 'folder': return <Folder size={size} className="text-warning fill-warning/20/20" />;
            case 'image': return <ImageIcon size={size} className="text-success" />;
            case 'video': return <Video size={size} className="text-danger" />;
            case 'audio': return <Music size={size} className="text-accent" />;
            case 'document': return <FileText size={size} className="text-primary" />;
            case 'archive': return <Archive size={size} className="text-warning" />;
            default: return <FileText size={size} className="text-muted" />;
        }
    };

    const getCategoryBadgeClass = (category) => {
        switch (category) {
            case 'folder': return 'bg-warning-soft text-warning-ink border-border';
            case 'image': return 'bg-success-soft text-success-ink border-border';
            case 'video': return 'bg-danger-soft text-danger-ink border-danger/25';
            case 'audio': return 'bg-accent-soft text-accent-ink border-accent/25';
            case 'document': return 'bg-primary/10 text-primary-active dark:bg-primary/20 dark:text-info border-primary/30 dark:border-primary/30';
            case 'archive': return 'bg-warning-soft text-warning-ink border-warning/25';
            default: return 'bg-surface-elevated text-secondary bg-surface text-secondary border-border';
        }
    };

    // Filter and Sort Items
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (selectedCategory === 'all') return true;
        return item.category === selectedCategory;
    });

    filteredItems.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;

        switch (sortBy) {
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            case 'size-desc': return (b.size || 0) - (a.size || 0);
            case 'size-asc': return (a.size || 0) - (b.size || 0);
            case 'date-asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'date-desc':
            default:
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
    });

    const categoryCounts = {
        all: items.length,
        folder: items.filter(i => i.isDirectory).length,
        image: items.filter(i => i.category === 'image').length,
        document: items.filter(i => i.category === 'document').length,
        audio: items.filter(i => i.category === 'audio').length,
        video: items.filter(i => i.category === 'video').length
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(e.dataTransfer.files);
        }
    };

    return (
        <AdminLayout title="File Manager">
            <div
                className="space-y-6 animate-fadeIn"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay Alert */}
                {isDragging && (
                    <div className="fixed inset-0 z-50 bg-primary-soft border-2 border-dashed border-primary rounded-card flex items-center justify-center pointer-events-none">
                        <div className="bg-surface p-8 rounded-card shadow-lg flex flex-col items-center gap-3">
                            <Upload size={48} className="text-primary" />
                            <h3 className="text-xl font-bold text-foreground">Drop files to upload</h3>
                            <p className="text-sm text-muted">Files will be saved into "{currentFolder || 'Root'}"</p>
                        </div>
                    </div>
                )}

                {/* Top Action Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 dark:bg-primary/20 text-primary-active dark:text-info rounded-card">
                                <HardDrive size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                                    File Manager
                                </h1>
                                <p className="text-xs sm:text-sm text-muted mt-0.5">
                                    Browse storage assets, organize folders, and monitor disk quotas.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center flex-wrap gap-2.5">
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            className="hidden"
                            onChange={(e) => handleUploadFiles(e.target.files)}
                        />

                        <button
                            type="button"
                            onClick={() => setIsCreateFolderOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover text-secondary border border-border rounded-xl font-semibold text-sm transition-all shadow-sm"
                        >
                            <FolderPlus size={18} className="text-warning" />
                            <span>New Folder</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-background rounded-lg font-bold text-sm transition-all shadow-md"
                        >
                            {uploading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Upload size={18} />
                            )}
                            <span>{uploading ? 'Uploading...' : 'Direct Upload'}</span>
                        </button>
                    </div>
                </div>

                {/* Storage Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-card bg-surface/90 border border-border shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Storage Used</span>
                            <div className="p-2 bg-primary/10 dark:bg-primary/20 text-primary-active dark:text-info rounded-xl">
                                <HardDrive size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
                                {formatSize(stats.totalSize)}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">Across all uploaded directories</p>
                    </div>

                    <div className="p-5 rounded-card bg-surface/90 border border-border shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Files</span>
                            <div className="p-2 bg-success-soft text-success-ink rounded-xl">
                                <FileText size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
                                {stats.totalFiles}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">Images, audio, video & docs</p>
                    </div>

                    <div className="p-5 rounded-card bg-surface/90 border border-border shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">Folders</span>
                            <div className="p-2 bg-warning-soft text-warning-ink rounded-xl">
                                <Folder size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
                                {stats.totalFolders}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">Subdirectories & categories</p>
                    </div>

                    <div className="p-5 rounded-card bg-surface/90 border border-border shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">Current Folder Items</span>
                            <div className="p-2 bg-accent-soft text-accent-ink rounded-xl">
                                <FolderOpen size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
                                {items.length}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">Direct items in current view</p>
                    </div>
                </div>

                {/* Main Browser Container */}
                <div className="bg-surface/90 rounded-card border border-border shadow-sm overflow-hidden">
                    {/* Navigation Bar & Controls */}
                    <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {breadcrumbs.map((crumb, idx) => {
                                const isLast = idx === breadcrumbs.length - 1;
                                return (
                                    <React.Fragment key={crumb.path}>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentFolder(crumb.path)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isLast
                                                ? 'bg-primary/10 text-primary-active dark:bg-primary/20 dark:text-info font-bold'
                                                : 'text-muted hover:bg-surface-hover'
                                                }`}
                                        >
                                            {idx === 0 ? <HardDrive size={15} /> : <Folder size={15} />}
                                            <span>{crumb.name}</span>
                                        </button>
                                        {!isLast && <ChevronRight size={14} className="text-muted" />}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Search, Sort, View Mode & Batch Toolbar */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Search */}
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Sort Selector */}
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none pl-8 pr-8 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm font-medium text-secondary outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="date-desc">Newest First</option>
                                    <option value="date-asc">Oldest First</option>
                                    <option value="size-desc">Largest Size</option>
                                    <option value="size-asc">Smallest Size</option>
                                    <option value="name-asc">Name (A-Z)</option>
                                    <option value="name-desc">Name (Z-A)</option>
                                </select>
                                <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>

                            {/* View Switcher */}
                            <div className="flex items-center bg-surface-elevated/60 p-1 rounded-xl border border-border">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid'
                                        ? 'bg-surface text-primary-active dark:text-info shadow-sm'
                                        : 'text-muted hover:text-secondary hover:text-foreground'
                                        }`}
                                    title="Grid View"
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list'
                                        ? 'bg-surface text-primary-active dark:text-info shadow-sm'
                                        : 'text-muted hover:text-secondary hover:text-foreground'
                                        }`}
                                    title="List View"
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            {/* Refresh */}
                            <button
                                type="button"
                                onClick={() => fetchFiles(currentFolder)}
                                className="p-2 bg-background hover:bg-surface-hover text-muted rounded-xl border border-border transition-all"
                                title="Refresh directory"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Category Filter Pills & Selection Info */}
                    <div className="px-5 py-3 bg-surface-elevated/70 border-b border-border flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { key: 'all', label: 'All Items' },
                                { key: 'folder', label: 'Folders' },
                                { key: 'image', label: 'Images' },
                                { key: 'document', label: 'Docs' },
                                { key: 'audio', label: 'Audio' },
                                { key: 'video', label: 'Video' }
                            ].map(cat => {
                                const count = categoryCounts[cat.key] || 0;
                                const isActive = selectedCategory === cat.key;
                                return (
                                    <button
                                        key={cat.key}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.key)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${isActive
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-surface text-muted hover:bg-surface-hover border border-border'
                                            }`}
                                    >
                                        <span>{cat.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-primary text-white' : 'bg-surface-elevated text-muted'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Batch selection trigger */}
                        {filteredItems.length > 0 && (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="text-xs font-medium text-muted hover:text-primary-active flex items-center gap-1.5"
                                >
                                    {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                                        <CheckSquare size={14} className="text-primary-active" />
                                    ) : (
                                        <Square size={14} />
                                    )}
                                    <span>Select All ({filteredItems.length})</span>
                                </button>

                                {selectedItems.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBatchDelete}
                                        className="text-xs font-semibold text-danger hover:text-danger flex items-center gap-1 bg-danger/10 px-2.5 py-1 rounded-lg border border-danger/25"
                                    >
                                        <Trash2 size={13} />
                                        <span>Delete Selected ({selectedItems.size})</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content View Area */}
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-24 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium text-muted mt-3">Reading storage directory...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-20 px-6 border-2 border-dashed border-border rounded-card">
                                <div className="w-14 h-14 bg-surface-elevated text-muted rounded-card flex items-center justify-center mx-auto mb-3">
                                    <FolderOpen size={28} />
                                </div>
                                <h3 className="text-base font-bold text-secondary">
                                    {searchTerm ? 'No matching files found' : 'This folder is empty'}
                                </h3>
                                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                                    {searchTerm
                                        ? `No items match the query "${searchTerm}". Try a different search term.`
                                        : 'Upload files directly or drag and drop assets into this directory.'}
                                </p>
                                <div className="mt-5 flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-background rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2"
                                    >
                                        <Upload size={14} />
                                        <span>Upload File</span>
                                    </button>
                                    {currentFolder && (
                                        <button
                                            onClick={() => {
                                                const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].path : '';
                                                setCurrentFolder(parent);
                                            }}
                                            className="px-4 py-2 bg-surface-elevated text-secondary rounded-xl text-xs font-semibold hover:bg-surface-hover dark:hover:bg-surface-hover transition-all"
                                        >
                                            Back Up
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredItems.map(item => {
                                    const isSelected = selectedItems.has(item.path);
                                    return (
                                        <div
                                            key={item.path}
                                            className={`group relative rounded-card border transition-all duration-200 flex flex-col justify-between overflow-hidden ${isSelected
                                                ? 'bg-primary/15 border-primary shadow-md ring-2 ring-accent/20'
                                                : 'bg-surface/70 hover:bg-surface-hover/60 border-border/80 hover:shadow-md'
                                                }`}
                                        >
                                            {/* Top Selection Checkbox */}
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectItem(item.path)}
                                                className={`absolute top-2 left-2 z-20 p-1 rounded-lg transition-opacity ${isSelected
                                                    ? 'opacity-100 text-primary-active bg-surface shadow-sm'
                                                    : 'opacity-0 group-hover:opacity-100 text-muted hover:text-foreground bg-surface/80 backdrop-blur-sm'
                                                    }`}
                                            >
                                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>

                                            {/* Preview Box */}
                                            <div
                                                onClick={() => {
                                                    if (item.isDirectory) {
                                                        setCurrentFolder(item.path);
                                                    } else {
                                                        setPreviewItem(item);
                                                    }
                                                }}
                                                className="aspect-square bg-surface flex items-center justify-center p-3 relative cursor-pointer overflow-hidden"
                                            >
                                                {item.isDirectory ? (
                                                    <div className="flex flex-col items-center justify-center text-center p-2 group-hover:scale-105 transition-transform">
                                                        <Folder size={46} className="text-warning fill-warning/20/20 drop-shadow-sm" />
                                                        <span className="text-[11px] font-semibold text-warning mt-1 bg-warning px-2 py-0.5 rounded-full font-mono">
                                                            {item.itemCount} items
                                                        </span>
                                                    </div>
                                                ) : item.category === 'image' ? (
                                                    <img
                                                        src={`${API}${item.url}`}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}

                                                {/* Fallback for non-image or image error */}
                                                {!item.isDirectory && (
                                                    <div className={`w-full h-full items-center justify-center flex flex-col ${item.category === 'image' ? 'hidden' : 'flex'}`}>
                                                        <div className="p-3 rounded-card bg-surface-elevated group-hover:scale-110 transition-transform">
                                                            {getCategoryIcon(item.category, 32)}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-muted uppercase mt-2 font-bold tracking-wider">
                                                            {item.extension || item.category}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Hover Overlay Action Bar */}
                                                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                                                    {!item.isDirectory && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewItem(item);
                                                            }}
                                                            className="p-2 bg-surface/95 hover:bg-surface text-foreground rounded-xl shadow-lg hover:scale-110 transition-transform"
                                                            title="Preview"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                    )}
                                                    {!item.isDirectory && (
                                                        <a
                                                            href={`${API}${item.url}`}
                                                            download
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 bg-surface/95 hover:bg-surface text-primary-active rounded-xl shadow-lg hover:scale-110 transition-transform"
                                                            title="Download"
                                                        >
                                                            <Download size={15} />
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteModalItem(item);
                                                        }}
                                                        className="p-2 bg-surface/95 hover:bg-surface text-danger rounded-xl shadow-lg hover:scale-110 transition-transform"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Footer */}
                                            <div className="p-3 border-t border-border/60 bg-surface">
                                                <p
                                                    onClick={() => {
                                                        if (item.isDirectory) setCurrentFolder(item.path);
                                                        else setPreviewItem(item);
                                                    }}
                                                    className="font-bold text-xs text-secondary truncate cursor-pointer hover:text-primary-active"
                                                    title={item.name}
                                                >
                                                    {item.name}
                                                </p>
                                                <div className="flex items-center justify-between mt-1 text-[11px] text-muted font-mono">
                                                    <span>{item.isDirectory ? `${item.itemCount} items` : formatSize(item.size)}</span>
                                                    <span>{formatDate(item.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* LIST / TABLE VIEW */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                                            <th className="py-3 px-3 w-8">
                                                <button onClick={toggleSelectAll}>
                                                    {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                                                        <CheckSquare size={16} className="text-primary-active" />
                                                    ) : (
                                                        <Square size={16} />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3 px-4">Name</th>
                                            <th className="py-3 px-4">Type</th>
                                            <th className="py-3 px-4">Size</th>
                                            <th className="py-3 px-4">Created Date</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredItems.map(item => {
                                            const isSelected = selectedItems.has(item.path);
                                            return (
                                                <tr
                                                    key={item.path}
                                                    className={`hover:bg-surface-hover/80 dark:hover:bg-surface-hover/30 transition-colors ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''
                                                        }`}
                                                >
                                                    <td className="py-3.5 px-3">
                                                        <button onClick={() => toggleSelectItem(item.path)}>
                                                            {isSelected ? (
                                                                <CheckSquare size={16} className="text-primary-active" />
                                                            ) : (
                                                                <Square size={16} className="text-muted" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-secondary">
                                                        <div
                                                            className="flex items-center gap-3 cursor-pointer group"
                                                            onClick={() => {
                                                                if (item.isDirectory) setCurrentFolder(item.path);
                                                                else setPreviewItem(item);
                                                            }}
                                                        >
                                                            <div className="p-2 rounded-xl bg-surface-elevated flex items-center justify-center">
                                                                {getCategoryIcon(item.category, 18)}
                                                            </div>
                                                            <div>
                                                                <p className="group-hover:text-primary-active text-xs sm:text-sm font-semibold truncate max-w-xs md:max-w-md">
                                                                    {item.name}
                                                                </p>
                                                                {item.isDirectory && (
                                                                    <p className="text-[11px] text-warning font-mono">
                                                                        Folder • {item.itemCount} items
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getCategoryBadgeClass(item.category)}`}>
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-xs text-muted">
                                                        {item.isDirectory ? '—' : formatSize(item.size)}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-xs text-muted">
                                                        {formatDate(item.createdAt)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!item.isDirectory && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewItem(item)}
                                                                    className="p-1.5 text-muted hover:text-primary-active hover:bg-surface-hover rounded-lg transition-colors"
                                                                    title="Preview"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                            )}
                                                            {!item.isDirectory && (
                                                                <a
                                                                    href={`${API}${item.url}`}
                                                                    download
                                                                    className="p-1.5 text-muted hover:text-success hover:bg-surface-hover rounded-lg transition-colors"
                                                                    title="Download"
                                                                >
                                                                    <Download size={16} />
                                                                </a>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteModalItem(item)}
                                                                className="p-1.5 text-muted hover:text-danger hover:bg-surface-hover rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL: Create New Folder */}
                {isCreateFolderOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-surface rounded-card max-w-md w-full p-6 shadow-lg border border-border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-warning-soft text-warning-ink rounded-xl">
                                        <FolderPlus size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">Create New Folder</h3>
                                </div>
                                <button
                                    onClick={() => setIsCreateFolderOpen(false)}
                                    className="text-muted hover:text-muted hover:text-foreground"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateFolder}>
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-secondary uppercase mb-1.5">
                                        Folder Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. documents, invoices, media"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        autoFocus
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-secondary"
                                    />
                                    <p className="text-xs text-muted mt-1">
                                        Location: /{currentFolder || 'Root'}
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateFolderOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingFolder || !newFolderName.trim()}
                                        className="px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-background text-xs font-bold rounded-lg transition-all shadow-md"
                                    >
                                        {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Delete Confirmation */}
                {deleteModalItem && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-surface rounded-card max-w-sm w-full p-6 shadow-lg border border-border">
                            <div className="w-12 h-12 rounded-card bg-danger-soft text-danger-ink flex items-center justify-center mb-4">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                Delete {deleteModalItem.isDirectory ? 'Folder' : 'File'}?
                            </h3>
                            <p className="text-xs text-muted mb-4">
                                Are you sure you want to permanently remove <strong className="text-secondary font-mono">{deleteModalItem.name}</strong>?
                                {deleteModalItem.isDirectory && ' All contents and subfiles inside will also be deleted.'}
                            </p>

                            <div className="flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModalItem(null)}
                                    className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2 bg-danger hover:bg-danger/90 disabled:opacity-50 text-danger-foreground text-xs font-bold rounded-xl transition-all shadow-md"
                                >
                                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: File Preview & Inspector Drawer */}
                {previewItem && (
                  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-surface rounded-card max-w-2xl w-full p-6 shadow-lg border border-border max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-surface-elevated rounded-xl">
                                        {getCategoryIcon(previewItem.category, 20)}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-foreground truncate max-w-xs sm:max-w-md">
                                            {previewItem.name}
                                        </h3>
                                        <p className="text-xs text-muted font-mono">
                                            {formatSize(previewItem.size)} • {formatDate(previewItem.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewItem(null)}
                                    className="p-1.5 text-muted hover:text-muted hover:text-foreground rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body Preview */}
                            <div className="my-6 flex-1 overflow-auto flex items-center justify-center min-h-[220px] bg-background/60 rounded-card p-4">
                                {previewItem.category === 'image' ? (
                                    <img
                                        src={`${API}${previewItem.url}`}
                                        alt={previewItem.name}
                                        className="max-h-[380px] w-auto object-contain rounded-xl shadow-sm"
                                    />
                                ) : previewItem.category === 'audio' ? (
                                    <div className="w-full max-w-md text-center p-4">
                                        <Music size={48} className="text-accent mx-auto mb-4 animate-pulse" />
                                        <audio controls className="w-full">
                                            <source src={`${API}${previewItem.url}`} />
                                            Your browser does not support audio preview.
                                        </audio>
                                    </div>
                                ) : previewItem.category === 'video' ? (
                                    <video controls className="max-h-[350px] w-auto rounded-xl">
                                        <source src={`${API}${previewItem.url}`} />
                                        Your browser does not support video playback.
                                    </video>
                                ) : (
                                    <div className="text-center p-6">
                                        {getCategoryIcon(previewItem.category, 56)}
                                        <p className="text-sm font-semibold text-secondary mt-3">
                                            {previewItem.name}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            Preview not available for this file type.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${API}${previewItem.url}`);
                                        toast.success('Signed download URL copied!');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-secondary text-xs font-semibold rounded-xl transition-all"
                                >
                                    <Copy size={14} />
                                    <span>Copy URL</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={`${API}${previewItem.url}`}
                                        download
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-background text-xs font-bold rounded-lg transition-all shadow-md"
                                    >
                                        <Download size={14} />
                                        <span>Download File</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const itemToDelete = previewItem;
                                            setPreviewItem(null);
                                            setDeleteModalItem(itemToDelete);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-danger/10 text-danger text-xs font-semibold rounded-xl hover:bg-danger-soft transition-all"
                                    >
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
