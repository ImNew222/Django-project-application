import { useState, useEffect } from 'react';
import { lostFoundAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    Search, ClipboardList, Frown, PartyPopper, Upload,
    Package, Smartphone, Shirt, Watch, BookOpen, CreditCard, Wallet, Key, Paperclip,
    MapPin, Phone, Clock, User, CheckCircle, Trash2
} from 'lucide-react';

const CATEGORY_ICONS = {
    '': Package,
    'electronics': Smartphone,
    'clothing': Shirt,
    'accessories': Watch,
    'books': BookOpen,
    'id_card': CreditCard,
    'wallet': Wallet,
    'keys': Key,
    'other': Paperclip,
};

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'books', label: 'Books & Supplies' },
    { value: 'id_card', label: 'ID / Documents' },
    { value: 'wallet', label: 'Wallet / Money' },
    { value: 'keys', label: 'Keys' },
    { value: 'other', label: 'Other' },
];

export default function LostFoundPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        item_type: 'lost',
        category: 'other',
        title: '',
        description: '',
        location: '',
        contact_info: '',
    });

    const fetchItems = async () => {
        try {
            const params = {};
            if (filterType) params.type = filterType;
            if (filterCategory) params.category = filterCategory;
            const res = await lostFoundAPI.getAll(params);
            setItems(res.data);
        } catch (err) {
            console.error('Failed to load items:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [filterType, filterCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim() || !form.location.trim()) return;

        setCreating(true);
        try {
            await lostFoundAPI.create(form);
            setForm({ item_type: 'lost', category: 'other', title: '', description: '', location: '', contact_info: '' });
            setShowForm(false);
            fetchItems();
        } catch (err) {
            console.error('Failed to create item:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await lostFoundAPI.updateStatus(id, newStatus);
            fetchItems();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await lostFoundAPI.delete(id);
            setItems((prev) => prev.filter((i) => i.id !== id));
        } catch (err) {
            console.error('Failed to delete item:', err);
        }
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const getCategoryIcon = (cat) => {
        const IconComp = CATEGORY_ICONS[cat] || Paperclip;
        return <IconComp size={16} />;
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="lf-page">
            <div className="lf-header">
                <h1><Search size={28} /> Lost & Found</h1>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : <><ClipboardList size={14} /> Report Item</>}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="lf-create-card">
                    <h2>Report a Lost or Found Item</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Type Toggle */}
                        <div className="lf-type-toggle">
                            <button
                                type="button"
                                className={`type-btn ${form.item_type === 'lost' ? 'active lost' : ''}`}
                                onClick={() => setForm({ ...form, item_type: 'lost' })}
                            >
                                <Frown size={16} /> I Lost Something
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${form.item_type === 'found' ? 'active found' : ''}`}
                                onClick={() => setForm({ ...form, item_type: 'found' })}
                            >
                                <PartyPopper size={16} /> I Found Something
                            </button>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    {CATEGORIES.filter((c) => c.value).map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Item Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Blue backpack, Samsung phone..."
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="Describe the item in detail (color, brand, distinguishing features)..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                required
                                style={{ width: '100%', fontFamily: 'inherit', padding: '0.6rem 0.8rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Location (where it was lost/found)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Room 204, Library, Cafeteria..."
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Info (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., FB messenger, phone number..."
                                    value={form.contact_info}
                                    onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={creating}>
                            {creating ? 'Submitting...' : <><Upload size={14} /> Submit Report</>}
                        </button>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="lf-filters">
                <div className="filter-group">
                    <button className={`filter-btn ${filterType === '' ? 'active' : ''}`} onClick={() => setFilterType('')}>All</button>
                    <button className={`filter-btn ${filterType === 'lost' ? 'active' : ''}`} onClick={() => setFilterType('lost')}><Frown size={14} /> Lost</button>
                    <button className={`filter-btn ${filterType === 'found' ? 'active' : ''}`} onClick={() => setFilterType('found')}><PartyPopper size={14} /> Found</button>
                </div>
                <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
                <div className="empty-state">
                    <p>No items found. {filterType || filterCategory ? 'Try changing filters.' : 'Report a lost or found item!'}</p>
                </div>
            ) : (
                <div className="lf-grid">
                    {items.map((item) => (
                        <div key={item.id} className={`lf-card ${item.item_type}`}>
                            <div className="lf-card-header">
                                <span className={`lf-type-badge ${item.item_type}`}>
                                    {item.item_type === 'lost' ? <><Frown size={14} /> LOST</> : <><PartyPopper size={14} /> FOUND</>}
                                </span>
                                <span className={`lf-status ${item.status}`}>{item.status_display}</span>
                            </div>

                            <h3>{getCategoryIcon(item.category)} {item.title}</h3>
                            <p className="lf-description">{item.description}</p>

                            <div className="lf-details">
                                <span><MapPin size={14} /> {item.location}</span>
                                {item.contact_info && <span><Phone size={14} /> {item.contact_info}</span>}
                                <span><Clock size={14} /> {timeAgo(item.created_at)}</span>
                                <span><User size={14} /> {item.author_name}</span>
                            </div>

                            {item.author_name === user?.username && (
                                <div className="lf-card-actions">
                                    {item.status === 'open' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(item.id, 'claimed')}>
                                            Mark Claimed
                                        </button>
                                    )}
                                    {item.status !== 'resolved' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(item.id, 'resolved')}>
                                            <CheckCircle size={14} /> Resolved
                                        </button>
                                    )}
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
