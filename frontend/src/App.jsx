import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QuizLobbyPage from './pages/QuizLobbyPage';
import QuizPlayPage from './pages/QuizPlayPage';
import QuizResultsPage from './pages/QuizResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SocialFeedPage from './pages/SocialFeedPage';
import BlogPage from './pages/BlogPage';
import LostFoundPage from './pages/LostFoundPage';
import TypingContestPage from './pages/TypingContestPage';
import AIQuizGeneratorPage from './pages/AIQuizGeneratorPage';
import MessagingPage from './pages/MessagingPage';
import StudyBuddyPage from './pages/StudyBuddyPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import GradeCalculatorPage from './pages/GradeCalculatorPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AchievementsPage from './pages/AchievementsPage';
import CodeCompilerPage from './pages/CodeCompilerPage';
import CodeBattlePage from './pages/CodeBattlePage';
import DailyChallengePage from './pages/DailyChallengePage';
import TournamentPage from './pages/TournamentPage';
import FriendsPage from './pages/FriendsPage';
import SpectatorView from './pages/SpectatorView';
import SectionPage from './pages/SectionPage';
import TowerDefensePage from './game/TowerDefensePage';
import ChessBattlePage from './pages/ChessBattlePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <>
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (isAuthenticated) return <Navigate to="/" />;

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><QuizLobbyPage /></ProtectedRoute>} />
        <Route path="/quiz/play" element={<ProtectedRoute><QuizPlayPage /></ProtectedRoute>} />
        <Route path="/quiz/results" element={<ProtectedRoute><QuizResultsPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><SocialFeedPage /></ProtectedRoute>} />
        <Route path="/blog" element={<ProtectedRoute><BlogPage /></ProtectedRoute>} />
        <Route path="/lost-found" element={<ProtectedRoute><LostFoundPage /></ProtectedRoute>} />
        <Route path="/typing" element={<ProtectedRoute><TypingContestPage /></ProtectedRoute>} />
        <Route path="/ai-generate" element={<ProtectedRoute><AIQuizGeneratorPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagingPage /></ProtectedRoute>} />
        <Route path="/study-buddy" element={<ProtectedRoute><StudyBuddyPage /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute><TeacherDashboardPage /></ProtectedRoute>} />
        <Route path="/grades" element={<ProtectedRoute><GradeCalculatorPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
        <Route path="/compiler" element={<ProtectedRoute><CodeCompilerPage /></ProtectedRoute>} />
        <Route path="/battle" element={<ProtectedRoute><CodeBattlePage /></ProtectedRoute>} />
        <Route path="/daily" element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
        <Route path="/tournament" element={<ProtectedRoute><TournamentPage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/spectate/:tournamentId" element={<ProtectedRoute><SpectatorView /></ProtectedRoute>} />
        <Route path="/section/:sectionId" element={<ProtectedRoute><SectionPage /></ProtectedRoute>} />
        <Route path="/tower-defense" element={<ProtectedRoute><TowerDefensePage /></ProtectedRoute>} />
        <Route path="/chess-battle" element={<ProtectedRoute><ChessBattlePage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <AnimatedRoutes />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
