import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import EditUserModal from '../../components/admin/EditUserModal';
import DeleteUserModal from '../../components/admin/DeleteUserModal';
import {
    Users, Shield, Activity, Search, Trash2,
    Edit, Ban, CheckCircle, X, ChevronLeft, ChevronRight,
    Crown, User
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users size={32} className="text-blue-600" />
                            User Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Control user access, roles, and account status.
                        </p>
                    </div>

                    {/* Add User Button could go here */}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-blue-500">
                            <Users size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-fit mb-4 text-blue-600 dark:text-blue-400">
                                <Users size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {stats.total}
                            </h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-purple-500">
                            <Shield size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl w-fit mb-4 text-purple-600 dark:text-purple-400">
                                <Crown size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {stats.admins}
                            </h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Administrators</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-emerald-500">
                            <Activity size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl w-fit mb-4 text-emerald-600 dark:text-emerald-400">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {stats.active}
                            </h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Floating Bar */}
                {selectedUsers.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-scaleIn">
                        <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-6 border border-blue-500 ring-4 ring-blue-500/10">
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                    {selectedUsers.length}
                                </span>
                                Selected
                            </span>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkAction('activate')}
                                    className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 font-semibold transition-colors text-sm flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> Activate
                                </button>
                                <button
                                    onClick={() => handleBulkAction('deactivate')}
                                    className="px-4 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 font-semibold transition-colors text-sm flex items-center gap-2"
                                >
                                    <Ban size={16} /> Deactivate
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors text-sm shadow-md flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedUsers([])}
                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full md:w-auto px-6 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
                    >
                        <option value="all">All Users</option>
                        <option value="admin">Admins Only</option>
                        <option value="user">Regular Users</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={users.length > 0 && selectedUsers.length === users.length}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors duration-150 ${selectedUsers.includes(user.id)
                                            ? 'bg-blue-50/60 dark:bg-blue-900/40'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                            }`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/admin/users/${user.id}`)}>
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors">{user.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${user.role === 'admin'
                                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                                }`}>
                                                {user.role === 'admin' ? <Crown size={12} /> : <User size={12} />}
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${user.isActive || user.isActive === null
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
                                                : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.isActive || user.isActive === null ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                {user.isActive || user.isActive === null ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {getRelativeTime(user.lastLogin)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(user.id, !(user.isActive || user.isActive === null))}
                                                    className={`p-2 rounded-lg transition-all ${user.isActive || user.isActive === null
                                                        ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                    title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                                                >
                                                    {user.isActive !== false ? <Ban size={16} /> : <CheckCircle size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => setDeletingUser(user)}
                                                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                    title="Delete User"
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
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No users found</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {search || filter !== 'all' ? 'Try adjusting your filters' : 'Get started by inviting users'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
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
