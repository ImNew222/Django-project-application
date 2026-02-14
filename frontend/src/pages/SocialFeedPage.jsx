import { useState, useEffect } from 'react';
import { socialAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Rss, Camera, X, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';

export default function SocialFeedPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [commentText, setCommentText] = useState({});

    const fetchFeed = async () => {
        try {
            const res = await socialAPI.getFeed();
            setPosts(res.data);
        } catch (err) {
            console.error('Failed to load feed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;

        setPosting(true);
        try {
            const formData = new FormData();
            formData.append('content', newPost);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            await socialAPI.createPost(formData);
            setNewPost('');
            setImageFile(null);
            fetchFeed();
        } catch (err) {
            console.error('Failed to create post:', err);
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            const res = await socialAPI.toggleLike(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, is_liked: res.data.liked, like_count: res.data.like_count }
                        : p
                )
            );
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    };

    const handleComment = async (postId) => {
        const text = commentText[postId]?.trim();
        if (!text) return;

        try {
            const res = await socialAPI.addComment(postId, text);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, comments: [...p.comments, res.data], comment_count: p.comment_count + 1 }
                        : p
                )
            );
            setCommentText({ ...commentText, [postId]: '' });
        } catch (err) {
            console.error('Failed to add comment:', err);
        }
    };

    const handleDelete = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await socialAPI.deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error('Failed to delete post:', err);
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

    if (loading) return (
        <div className="social-feed-page">
            <h1><Rss size={28} /> Social Feed</h1>
            {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>
    );

    return (
        <div className="social-feed-page">
            <h1><Rss size={28} /> Social Feed</h1>

            {/* Create Post */}
            <div className="create-post-card">
                <form onSubmit={handleCreatePost}>
                    <textarea
                        placeholder="What's on your mind? Share your thoughts, progress, or anything!"
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        maxLength={1000}
                        rows={3}
                    />
                    <div className="create-post-actions">
                        <label className="file-upload-btn">
                            <Camera size={14} /> Photo
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                                hidden
                            />
                        </label>
                        {imageFile && (
                            <span className="file-name">
                                {imageFile.name}
                                <button type="button" onClick={() => setImageFile(null)} className="remove-file"><X size={12} /></button>
                            </span>
                        )}
                        <button type="submit" className="btn btn-primary btn-post" disabled={posting || !newPost.trim()}>
                            {posting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Feed */}
            {posts.length === 0 ? (
                <div className="empty-state">
                    <p>No posts yet. Be the first to share something!</p>
                </div>
            ) : (
                <div className="feed-list">
                    {posts.map((post) => (
                        <div key={post.id} className="post-card">
                            {/* Post Header */}
                            <div className="post-header">
                                <div className="post-author">
                                    <span className="author-avatar">
                                        {post.author_name.charAt(0).toUpperCase()}
                                    </span>
                                    <div>
                                        <span className="author-name">{post.author_name}</span>
                                        <span className={`author-role role-${post.author_role}`}>{post.author_role}</span>
                                    </div>
                                </div>
                                <span className="post-time">{timeAgo(post.created_at)}</span>
                            </div>

                            {/* Post Content */}
                            <div className="post-content">
                                <p>{post.content}</p>
                                {post.image && (
                                    <img src={`http://localhost:8000${post.image}`} alt="Post" className="post-image" />
                                )}
                            </div>

                            {/* Post Actions */}
                            <div className="post-actions">
                                <button
                                    className={`action-btn ${post.is_liked ? 'liked' : ''}`}
                                    onClick={() => handleLike(post.id)}
                                >
                                    {post.is_liked ? <Heart size={16} fill="#e74c3c" color="#e74c3c" /> : <Heart size={16} />} {post.like_count}
                                </button>
                                <span className="action-btn"><MessageCircle size={16} /> {post.comment_count}</span>
                                {post.author_name === user?.username && (
                                    <button className="action-btn delete-btn" onClick={() => handleDelete(post.id)}>
                                        <Trash2 size={16} /> Delete
                                    </button>
                                )}
                            </div>

                            {/* Comments */}
                            {post.comments.length > 0 && (
                                <div className="comments-section">
                                    {post.comments.map((comment) => (
                                        <div key={comment.id} className="comment">
                                            <strong>{comment.author_name}</strong>
                                            <span className={`comment-role role-${comment.author_role}`}>{comment.author_role}</span>
                                            <span className="comment-text">{comment.content}</span>
                                            <span className="comment-time">{timeAgo(comment.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Comment */}
                            <div className="add-comment">
                                <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    value={commentText[post.id] || ''}
                                    onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                />
                                <button
                                    className="btn btn-comment"
                                    onClick={() => handleComment(post.id)}
                                    disabled={!commentText[post.id]?.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
