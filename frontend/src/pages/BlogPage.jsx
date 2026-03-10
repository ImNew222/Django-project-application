import { useState, useEffect } from 'react';
import { blogAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BookOpen, PenLine, Upload, Trash2 } from 'lucide-react';

export default function BlogPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [expandedPost, setExpandedPost] = useState(null);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [creating, setCreating] = useState(false);

    const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

    useEffect(() => {
        blogAPI.getAll()
            .then((res) => setPosts(res.data))
            .catch((err) => console.error('Failed to load blog:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newPost.title.trim() || !newPost.content.trim()) return;

        setCreating(true);
        try {
            const res = await blogAPI.create(newPost);
            setPosts([res.data, ...posts]);
            setNewPost({ title: '', content: '' });
            setShowCreate(false);
        } catch (err) {
            console.error('Failed to create blog post:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this blog post?')) return;
        try {
            await blogAPI.delete(id);
            setPosts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error('Failed to delete blog post:', err);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    if (loading) return <div className="loading">Loading blog...</div>;

    return (
        <div className="blog-page">
            <div className="blog-header">
                <h1><BookOpen size={28} /> School News & Blog</h1>
                {isTeacherOrAdmin && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreate(!showCreate)}
                    >
                        {showCreate ? 'Cancel' : <><PenLine size={14} /> Write Post</>}
                    </button>
                )}
            </div>

            {/* Create Blog Post (Teachers/Admins only) */}
            {showCreate && (
                <div className="blog-create-card">
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label htmlFor="blog-title">Title</label>
                            <input
                                id="blog-title"
                                type="text"
                                placeholder="Enter a catchy title..."
                                value={newPost.title}
                                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="blog-content">Content</label>
                            <textarea
                                id="blog-content"
                                placeholder="Write your blog post or announcement..."
                                value={newPost.content}
                                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                rows={8}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={creating}>
                            {creating ? 'Publishing...' : <><Upload size={14} /> Publish Post</>}
                        </button>
                    </form>
                </div>
            )}

            {/* Blog Posts List */}
            {posts.length === 0 ? (
                <div className="empty-state">
                    <p>No blog posts yet. {isTeacherOrAdmin ? 'Write the first one!' : 'Check back later!'}</p>
                </div>
            ) : (
                <div className="blog-list">
                    {posts.map((post) => (
                        <div key={post.id} className="blog-card">
                            {post.cover_image && (
                                <img
                                    src={post.cover_image.startsWith('http') ? post.cover_image : `${import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000'}${post.cover_image}`}
                                    alt={post.title}
                                    className="blog-cover-image"
                                />
                            )}
                            <div className="blog-card-header">
                                <h2
                                    className="blog-title"
                                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {post.title}
                                </h2>
                                <div className="blog-meta">
                                    <span className="blog-author">By {post.author_name}</span>
                                    {post.is_bot && <span className="bot-badge" title="AI Bot">🤖</span>}
                                    <span className={`author-role role-${post.author_role}`}>{post.author_role}</span>
                                    <span className="blog-date">{formatDate(post.created_at)}</span>
                                </div>
                            </div>

                            {/* Show excerpt or full content */}
                            <div className="blog-body">
                                {expandedPost === post.id ? (
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                                ) : (
                                    <p className="blog-excerpt">{post.excerpt}</p>
                                )}
                            </div>

                            <div className="blog-card-footer">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                                >
                                    {expandedPost === post.id ? 'Show Less' : 'Read More →'}
                                </button>
                                {post.author_name === user?.username && (
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
