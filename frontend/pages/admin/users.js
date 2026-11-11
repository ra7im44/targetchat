import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import EditUserModal from '../../components/admin/EditUserModal';
import DeleteUserModal from '../../components/admin/DeleteUserModal';
import {
    Users, Shield, Activity, Search, Trash2,
    Edit, Ban, CheckCircle, X, ChevronLeft, ChevronRight,
    Crown, User, Globe, Smartphone
} from 'lucide-react';
import { countryName, countryFlag, parseDevice } from '../../utils/deviceHelper';

import { API_URL as API } from '../../utils/apiConfig';

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, admins: 0, active: 0 });
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!router.isReady) return;
        checkAdminAndLoadUsers();
    }, [router.isReady, page, filter, search]);

    async function checkAdminAndLoadUsers() {
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        try {
            setLoading(true);

            const queryParams = new URLSearchParams({
                page,
                limit: 10,
                search,
                filter
            });

            const [mainRes, adminRes, activeRes] = await Promise.all([
                fetch(`${API}/api/admin/users?${queryParams}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/admin/users?filter=admin&limit=1`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/admin/users?filter=active&limit=1`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (mainRes.status === 401 || mainRes.status === 403) return router.replace('/admin');

            const mainData = await mainRes.json();
            let adminCount = 0;
            let activeCount = 0;

            if (adminRes.ok) {
                const adminData = await adminRes.json();
                adminCount = adminData.pagination.total;
            }

            if (activeRes.ok) {
                const activeData = await activeRes.json();
                activeCount = activeData.pagination.total;
            }

            setUsers(mainData.users);
            setStats({
                total: mainData.pagination.total,
                admins: adminCount,
                active: activeCount
            });

            setLoading(false);
        } catch (err) {
            console.error('Error loading users:', err);
            setLoading(false);
        }
    }

    async function saveUser(userData) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/users/${userData.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    isActive: userData.isActive
                })
            });

            if (res.ok) {
                setEditingUser(null);
                checkAdminAndLoadUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update user');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating user');
        }
    }

    async function deleteUser(userId) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setDeletingUser(null);
                checkAdminAndLoadUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete user');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting user');
        }
    }

    async function toggleStatus(userId, newStatus) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: newStatus })
            });

            if (res.ok) {
                checkAdminAndLoadUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update status');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating status');
        }
    }

    // Select All / Deselect All
    function handleSelectAll(e) {
        if (e.target.checked) {
            setSelectedUsers(users.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    }

    // Select Single User
    function handleSelectUser(userId) {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    }

    // Bulk Actions
    async function handleBulkAction(action) {
        if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) return;

        const token = localStorage.getItem('tc_token');
        setLoading(true);

        try {
            const promises = selectedUsers.map(id => {
                if (action === 'delete') {
                    return fetch(`${API}/api/admin/users/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else if (action === 'activate') {
                    return fetch(`${API}/api/admin/users/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ isActive: true })
                    });
                } else if (action === 'deactivate') {
                    return fetch(`${API}/api/admin/users/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ isActive: false })
                    });
                }
            });

            await Promise.all(promises);
            await checkAdminAndLoadUsers();
            setSelectedUsers([]);
            alert(`${action} action completed successfully.`);
        } catch (err) {
            console.error('Bulk action error:', err);
            alert('Some actions failed. Check console.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Users">
            <div className="max-w-7xl mx-auto relative space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Users size={18} className="text-primary" />
                            User Management
                        </h1>
                        <p className="text-muted mt-1">
                            Control user access, roles, and account status.
                        </p>
                    </div>

                    {/* Add User Button could go here */}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface p-6 rounded-card shadow-sm border border-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-info">
                            <Users size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-info-soft rounded-xl w-fit mb-4 text-primary">
                                <Users size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-foreground mb-1">
                                {stats.total}
                            </h3>
                            <p className="text-sm font-medium text-muted">Total Users</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-card shadow-sm border border-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-accent">
                            <Shield size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-accent-soft rounded-xl w-fit mb-4 text-accent">
                                <Crown size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-foreground mb-1">
                                {stats.admins}
                            </h3>
                            <p className="text-sm font-medium text-muted">Administrators</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-card shadow-sm border border-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-success">
                            <Activity size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-success-soft rounded-xl w-fit mb-4 text-success">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-foreground mb-1">
                                {stats.active}
                            </h3>
                            <p className="text-sm font-medium text-muted">Active Users</p>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Floating Bar */}
                {selectedUsers.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-scaleIn w-max max-w-[calc(100vw-2rem)]">
                        <div className="bg-surface px-6 py-3 rounded-card shadow-lg flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border border-primary ring-4 ring-accent/10">
                            <span className="font-bold text-foreground flex items-center gap-2">
                                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                    {selectedUsers.length}
                                </span>
                                Selected
                            </span>
                            <div className="h-6 w-px bg-surface-elevated"></div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkAction('activate')}
                                    className="px-4 py-2 rounded-lg bg-success-soft text-success hover:bg-success-soft font-semibold transition-colors text-sm flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> Activate
                                </button>
                                <button
                                    onClick={() => handleBulkAction('deactivate')}
                                    className="px-4 py-2 rounded-lg bg-warning-soft text-warning-ink hover:bg-warning/15 font-semibold transition-colors text-sm flex items-center gap-2"
                                >
                                    <Ban size={16} /> Deactivate
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="px-4 py-2 rounded-lg bg-danger text-danger-foreground hover:bg-danger/90 font-semibold transition-colors text-sm shadow-md flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedUsers([])}
                                className="ml-2 text-muted hover:text-muted hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="bg-surface p-4 rounded-card flex flex-col md:flex-row gap-4 items-center shadow-sm border border-border">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, country, IP, or device..."
                            aria-label="Search users by name, email, country, IP, or device"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted"
                        />
                    </div>
                    <select
                        value={filter}
                        aria-label="Filter users"
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full md:w-auto px-6 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                    >
                        <option value="all">All Users</option>
                        <option value="admin">Admins Only</option>
                        <option value="user">Regular Users</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>

                {/* Users Table */}
                <div className="bg-surface rounded-card overflow-hidden shadow-sm border border-border">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-elevated border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={users.length > 0 && selectedUsers.length === users.length}
                                            aria-label="Select all users"
                                            className="w-4 h-4 rounded border-border text-info focus:ring-primary/20 focus:border-primary"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-muted uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors duration-150 ${selectedUsers.includes(user.id)
                                            ? 'bg-info-soft/60'
                                            : 'hover:bg-surface-hover/30'
                                            }`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                                aria-label={`Select user ${user.name}`}
                                                className="w-4 h-4 rounded border-border text-info focus:ring-primary/20 focus:border-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div
                                                className="flex items-start gap-4 cursor-pointer"
                                                role="link"
                                                tabIndex={0}
                                                aria-label={`Open details for ${user.name}`}
                                                onClick={() => router.push(`/admin/users/${user.id}`)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        router.push(`/admin/users/${user.id}`);
                                                    }
                                                }}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background font-bold shadow-md flex-shrink-0 mt-0.5">
                                                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                                                        <span>{user.name}</span>
                                                        <span className="text-[11px] font-mono text-muted font-normal">#{user.id}</span>
                                                    </div>
                                                    <div className="text-sm text-muted truncate">{user.email}</div>
                                                    {/* Geo, IP and Device Sub-row (Like U-Axis SPA) */}
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                                        <span className="inline-flex items-center gap-1 font-medium text-secondary bg-surface-elevated/60 px-2 py-0.5 rounded-md" title={`Location: ${user.city || ''} ${user.country || ''}`}>
                                                            {countryName(user.country)} {user.city ? `· ${user.city}` : ''}
                                                        </span>
                                                        <span className="text-muted">•</span>
                                                        <span className="font-mono text-[11px] bg-info-soft text-info px-1.5 py-0.5 rounded border border-info/25" title="Last IP Address">
                                                            <Globe size={16} /> <code>{user.lastIp || 'No IP'}</code>
                                                        </span>
                                                        <span className="text-muted">•</span>
                                                        <span className="text-muted" title="Device & OS">
                                                            <Smartphone size={16} /> {parseDevice(user.deviceInfo)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${user.role === 'admin'
                                                ? 'bg-accent-soft text-accent-ink border-accent/25'
                                                : 'bg-surface-elevated text-muted border-border'
                                                }`}>
                                                {user.role === 'admin' ? <Crown size={12} /> : <User size={12} />}
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${user.isActive || user.isActive === null
                                                ? 'bg-success-soft text-success-ink border-success/25'
                                                : 'bg-danger-soft text-danger-ink border-danger/25'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.isActive || user.isActive === null ? 'bg-success' : 'bg-danger'}`}></div>
                                                {user.isActive || user.isActive === null ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-muted">
                                            {getRelativeTime(user.lastLogin)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 rounded-lg text-primary hover:bg-info-soft transition-all"
                                                    title="Edit User"
                                                    aria-label={`Edit ${user.name}`}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(user.id, !(user.isActive || user.isActive === null))}
                                                    className={`p-2 rounded-lg transition-all ${user.isActive || user.isActive === null
                                                        ? 'text-warning-ink hover:bg-warning-soft'
                                                        : 'text-success-ink hover:bg-success-soft'
                                                        }`}
                                                    title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                                                    aria-label={`${user.isActive !== false ? 'Deactivate' : 'Activate'} ${user.name}`}
                                                >
                                                    {user.isActive !== false ? <Ban size={16} /> : <CheckCircle size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => setDeletingUser(user)}
                                                    className="p-2 rounded-lg text-danger hover:bg-danger-soft transition-all"
                                                    title="Delete User"
                                                    aria-label={`Delete ${user.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
                                <Users size={18} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No users found</h3>
                            <p className="text-muted">
                                {search || filter !== 'all' ? 'Try adjusting your filters' : 'Get started by inviting users'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-sm text-muted text-center">
                    Showing {users.length} user{users.length !== 1 ? 's' : ''}
                </div>

                {/* Modals */}
                {editingUser && (
                    <EditUserModal
                        user={editingUser}
                        onSave={saveUser}
                        onClose={() => setEditingUser(null)}
                    />
                )}

                {deletingUser && (
                    <DeleteUserModal
                        user={deletingUser}
                        onDelete={deleteUser}
                        onClose={() => setDeletingUser(null)}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

function getRelativeTime(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
