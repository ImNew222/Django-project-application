import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import NotificationDropdown from './NotificationDropdown';
import {
    LayoutDashboard, Swords, Keyboard, Rss, BookOpen, Search,
    MessageCircle, Users, BarChart3, Bot, GraduationCap, Trophy,
    Menu, X, LogOut, Settings, Award, Calendar,
    Home, MoreHorizontal, ChevronRight, ChevronDown, Code2, Gamepad2, Heart, User
} from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const isActive = (path) => location.pathname === path;

    const closeSidebar = () => { setSidebarOpen(false); setOpenGroup(null); };

    // Close search on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
        setOpenGroup(null);
    }, [location.pathname]);

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await authAPI.search(searchQuery);
                setSearchResults(res.data.results || []);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
    }, [searchQuery]);

    const handleSearchSelect = (result) => {
        navigate(result.url);
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const typeLabels = { quiz: 'Quiz', blog: 'Blog', lost_found: 'Lost & Found', user: 'User' };
    const typeColors = { quiz: '#8b5cf6', blog: '#3b82f6', lost_found: '#f59e0b', user: '#22c55e' };


    // Direct top-level links
    const topLinks = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        ...(isTeacher ? [
            { to: '/ai-generate', label: 'AI Generate', icon: Bot },
            { to: '/teacher', label: 'Manage', icon: GraduationCap },
        ] : [
            { to: '/teacher', label: 'My Section', icon: BookOpen },
        ]),
    ];

    // Grouped dropdown categories
    const navGroups = [
        {
            key: 'games',
            label: 'Games',
            icon: Gamepad2,
            children: [
                { to: '/quiz', label: 'Quiz', icon: Swords },
                { to: '/typing', label: 'Typing', icon: Keyboard },
                { to: '/battle', label: 'Battle', icon: Swords },
                { to: '/chess-battle', label: 'Chess', icon: Trophy },
                { to: '/tower-defense', label: 'TD Game', icon: Swords },
                { to: '/tournament', label: 'Tourney', icon: Trophy },
                { to: '/daily', label: 'Daily', icon: Calendar },
            ],
        },
        {
            key: 'social',
            label: 'Social',
            icon: Heart,
            children: [
                { to: '/feed', label: 'Feed', icon: Rss },
                { to: '/blog', label: 'Blog', icon: BookOpen },
                { to: '/messages', label: 'Chat', icon: MessageCircle },
                { to: '/friends', label: 'Friends', icon: Users },
                { to: '/study-buddy', label: 'Study Buddy', icon: Users },
                { to: '/lost-found', label: 'Lost & Found', icon: Search },
            ],
        },
        {
            key: 'me',
            label: 'Me',
            icon: User,
            children: [
                { to: '/grades', label: 'Grades', icon: BarChart3 },
                { to: '/leaderboard', label: 'Ranks', icon: Trophy },
                { to: '/achievements', label: 'Badges', icon: Award },
                { to: '/compiler', label: 'Code', icon: Code2 },
            ],
        },
    ];

    const isGroupActive = (group) => group.children.some((c) => location.pathname === c.to);

    // Flat list for sidebar (combined)
    const allLinks = [
        ...topLinks,
        ...navGroups.flatMap((g) => g.children),
    ];

    return (
        <>
            {/* ===== HEADER ===== */}
            <header className="header-wapo">
                {/* Top utility bar */}
                <div className="header-utility">
                    <div className="header-utility-left">
                        <button className="btn-icon sidebar-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                            <Menu size={20} />
                        </button>
                    </div>
                    <div className="header-utility-right">
                        <NotificationDropdown />
                        <Link to="/profile" className="nav-avatar-link" title="Profile">
                            <div className="nav-avatar-mini">
                                {user?.first_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase()}
                            </div>
                        </Link>
                        <Link to="/settings" className="btn-icon" title="Settings">
                            <Settings size={18} />
                        </Link>
                        <button className="btn btn-logout" onClick={logout}>
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>

                {/* Centered Brand */}
                <div className="header-brand">
                    <Link to="/">
                        <GraduationCap size={28} />
                        <span className="brand-name">Nexora</span>
                    </Link>
                    <p className="brand-tagline">Learn. Compete. Connect.</p>
                </div>

                {/* Navigation Row */}
                <nav className="header-nav">
                    <div className="header-nav-links">
                        {/* Top-level direct links */}
                        {topLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`header-nav-link ${isActive(link.to) ? 'active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Grouped dropdown links */}
                        {navGroups.map((group) => (
                            <div key={group.key} className="nav-dropdown">
                                <button className={`header-nav-link nav-dropdown-trigger ${isGroupActive(group) ? 'active' : ''}`}>
                                    {group.label}
                                    <ChevronDown size={13} className="nav-dropdown-arrow" />
                                </button>
                                <div className="nav-dropdown-menu">
                                    {group.children.map((child) => {
                                        const Icon = child.icon;
                                        return (
                                            <Link
                                                key={child.to}
                                                to={child.to}
                                                className={`nav-dropdown-item ${isActive(child.to) ? 'active' : ''}`}
                                            >
                                                <Icon size={16} />
                                                <span>{child.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>
            </header>

            {/* ===== MOBILE SIDEBAR ===== */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <button className="btn-icon" onClick={closeSidebar}>
                        <X size={22} />
                    </button>
                </div>

                {/* Sidebar Search */}
                <div className="sidebar-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    />
                </div>

                {/* Sidebar Links */}
                <div className="sidebar-links">
                    {/* Top-level direct links */}
                    {topLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <Icon size={18} />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Group links — click to expand accordion */}
                    {navGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isOpen = openGroup === group.key;
                        return (
                            <div key={group.key} className="sidebar-accordion">
                                <button
                                    className={`sidebar-link sidebar-accordion-trigger ${isGroupActive(group) || isOpen ? 'active' : ''}`}
                                    onClick={() => setOpenGroup(isOpen ? null : group.key)}
                                >
                                    <GroupIcon size={18} />
                                    <span>{group.label}</span>
                                    <ChevronDown size={14} className={`sidebar-accordion-arrow ${isOpen ? 'open' : ''}`} />
                                </button>
                                <div className={`sidebar-accordion-items ${isOpen ? 'open' : ''}`}>
                                    {group.children.map((child) => {
                                        const ChildIcon = child.icon;
                                        return (
                                            <Link
                                                key={child.to}
                                                to={child.to}
                                                className={`sidebar-link sidebar-accordion-child ${isActive(child.to) ? 'active' : ''}`}
                                                onClick={closeSidebar}
                                            >
                                                <ChildIcon size={16} />
                                                <span>{child.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    <Link to="/profile" className="sidebar-link" onClick={closeSidebar}>
                        <div className="nav-avatar-mini">{user?.first_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase()}</div>
                        <span>{user?.first_name || user?.username}</span>
                    </Link>
                    <Link to="/settings" className="sidebar-link" onClick={closeSidebar}>
                        <Settings size={18} />
                        <span>Settings</span>
                    </Link>
                    <button className="sidebar-link sidebar-logout" onClick={() => { closeSidebar(); logout(); }}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <nav className="bottom-nav">
                <Link to="/" className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                    <Home size={20} />
                    <span>Home</span>
                </Link>
                <Link to="/quiz" className={`bottom-nav-item ${location.pathname.startsWith('/quiz') ? 'active' : ''}`}>
                    <Swords size={20} />
                    <span>Quiz</span>
                </Link>
                <Link to="/feed" className={`bottom-nav-item ${location.pathname === '/feed' ? 'active' : ''}`}>
                    <Rss size={20} />
                    <span>Feed</span>
                </Link>
                <Link to="/messages" className={`bottom-nav-item ${location.pathname === '/messages' ? 'active' : ''}`}>
                    <MessageCircle size={20} />
                    <span>Chat</span>
                </Link>
                <button className="bottom-nav-item" onClick={() => setSidebarOpen(true)}>
                    <MoreHorizontal size={20} />
                    <span>More</span>
                </button>
            </nav>
        </>
    );
}
