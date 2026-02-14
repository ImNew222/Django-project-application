import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry — attempt refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — log out
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ===== AUTH API =====
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  getMe: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  deleteAccount: (data) => api.post('/auth/delete-account/', data),
  search: (q) => api.get('/auth/search/', { params: { q } }),
  getStudents: () => api.get('/auth/students/'),
  getStudentDetail: (id) => api.get(`/auth/students/${id}/`),
};

// ===== QUIZ API =====
export const quizAPI = {
  getSubjects: () => api.get('/quiz/subjects/'),
  startQuiz: (data) => api.post('/quiz/start/', data),
  submitAnswer: (data) => api.post('/quiz/answer/', data),
  completeQuiz: (sessionId, data) => api.post(`/quiz/${sessionId}/complete/`, data),
  reportTabSwitch: (sessionId) => api.post(`/quiz/${sessionId}/tab-switch/`),
  getHistory: () => api.get('/quiz/history/'),
  sessionDetail: (id) => api.get(`/quiz/session/${id}/`),
  aiGenerate: (data) => api.post('/quiz/ai-generate/', data),
};

// ===== LEADERBOARD API =====
export const leaderboardAPI = {
  getLeaderboard: () => api.get('/leaderboard/'),
  getMyStats: () => api.get('/leaderboard/me/'),
};

// ===== SOCIAL FEED API =====
export const socialAPI = {
  getFeed: () => api.get('/social/feed/'),
  createPost: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/social/posts/', data, config);
  },
  deletePost: (postId) => api.delete(`/social/posts/${postId}/delete/`),
  toggleLike: (postId) => api.post(`/social/posts/${postId}/like/`),
  addComment: (postId, content) => api.post(`/social/posts/${postId}/comment/`, { content }),
  getMyPosts: () => api.get('/social/my-posts/'),
};

// ===== BLOG API =====
export const blogAPI = {
  getAll: () => api.get('/blog/'),
  getOne: (id) => api.get(`/blog/${id}/`),
  create: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/blog/create/', data, config);
  },
  update: (id, data) => api.patch(`/blog/${id}/update/`, data),
  delete: (id) => api.delete(`/blog/${id}/delete/`),
};

// ===== LOST & FOUND API =====
export const lostFoundAPI = {
  getAll: (params) => api.get('/lostandfound/', { params }),
  create: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/lostandfound/create/', data, config);
  },
  updateStatus: (id, status) => api.patch(`/lostandfound/${id}/status/`, { status }),
  delete: (id) => api.delete(`/lostandfound/${id}/delete/`),
  getMyItems: () => api.get('/lostandfound/my-items/'),
};

// ===== TYPING CONTEST API =====
export const typingAPI = {
  getTexts: (difficulty) => api.get('/typing/texts/', { params: { difficulty } }),
  getRandom: (difficulty) => api.get('/typing/random/', { params: { difficulty } }),
  submitResult: (data) => api.post('/typing/submit/', data),
  getLeaderboard: () => api.get('/typing/leaderboard/'),
  getHistory: () => api.get('/typing/history/'),
};

// ===== MESSAGING API =====
export const messagingAPI = {
  getConversations: () => api.get('/messaging/'),
  getMessages: (convoId) => api.get(`/messaging/${convoId}/messages/`),
  sendMessage: (convoId, content) => api.post(`/messaging/${convoId}/send/`, { content }),
  createConversation: (data) => api.post('/messaging/create/', data),
  searchUsers: (q) => api.get('/messaging/search-users/', { params: { q } }),
};

// ===== PAIRING API =====
export const pairingAPI = {
  getAvailable: (params) => api.get('/pairing/available/', { params }),
  sendRequest: (data) => api.post('/pairing/request/', data),
  getMyRequests: () => api.get('/pairing/my-requests/'),
  respond: (requestId, action) => api.post(`/pairing/${requestId}/respond/`, { action }),
};

// ===== COMPILER API =====
export const compilerAPI = {
  getLanguages: () => api.get('/compiler/languages/'),
  runCode: (data) => api.post('/compiler/run/', data),
  getSubmission: (id) => api.get(`/compiler/submission/${id}/`),
  getHistory: () => api.get('/compiler/history/'),

  // Code Battle
  challenges: (params) => api.get('/compiler/challenges/', { params }),
  challengeDetail: (slug) => api.get(`/compiler/challenges/${slug}/`),
  battleStart: (slug) => api.post('/compiler/battle/start/', { challenge_slug: slug }),
  battleSubmit: (sessionId, data) => api.post(`/compiler/battle/${sessionId}/submit/`, data),
  battleResult: (sessionId) => api.get(`/compiler/battle/${sessionId}/result/`),
  battleHistory: () => api.get('/compiler/battle/history/'),

  // Daily Challenge
  dailyChallenge: () => api.get('/compiler/daily/'),
  dailySubmit: (data) => api.post('/compiler/daily/submit/', data),
  dailyLeaderboard: () => api.get('/compiler/daily/leaderboard/'),
  dailyStreak: () => api.get('/compiler/daily/streak/'),

  // Tournaments
  tournaments: () => api.get('/compiler/tournaments/'),
  createTournament: (data) => api.post('/compiler/tournaments/', data),
  tournamentDetail: (id) => api.get(`/compiler/tournaments/${id}/`),
  joinTournament: (id, data) => api.post(`/compiler/tournaments/${id}/join/`, data),
  joinByCode: (code) => api.post('/compiler/tournaments/join/', { join_code: code }),
  startTournament: (id) => api.post(`/compiler/tournaments/${id}/start/`),
  tournamentSubmit: (id, data) => api.post(`/compiler/tournaments/${id}/submit/`, data),
  deleteTournament: (id) => api.delete(`/compiler/tournaments/${id}/delete/`),
  leaveTournament: (id) => api.post(`/compiler/tournaments/${id}/leave/`),
  checkTimeout: (id) => api.post(`/compiler/tournaments/${id}/check-timeout/`),

  // Profile
  profileStats: () => api.get('/compiler/profile/stats/'),

  // Community Challenges
  getCommunity: () => api.get('/compiler/community-challenges/'),
  createCommunity: (data) => api.post('/compiler/community-challenges/', data),
  deleteCommunity: (id) => api.delete('/compiler/community-challenges/', { data: { id } }),

  // PvP Replay
  pvpReplay: (battleId) => api.get(`/compiler/pvp/${battleId}/replay/`),

  // Friends / Follow
  searchUsers: (q) => api.get(`/compiler/friends/search/?q=${encodeURIComponent(q)}`),
  toggleFollow: (userId) => api.post(`/compiler/friends/follow/${userId}/`),
  getFriends: () => api.get('/compiler/friends/'),

  // Notifications
  getNotifications: () => api.get('/compiler/notifications/'),
  markNotificationsRead: (data) => api.post('/compiler/notifications/read/', data),
  unreadCount: () => api.get('/compiler/notifications/unread-count/'),

  // Battle Invites
  sendInvite: (data) => api.post('/compiler/invites/send/', data),
  respondInvite: (id, data) => api.post(`/compiler/invites/${id}/respond/`, data),
  pendingInvites: () => api.get('/compiler/invites/pending/'),

  // AI Explanation
  getExplanation: (data) => api.post('/compiler/ai/explain/', data),

  // Tower Defense
  submitTDScore: (data) => api.post('/compiler/tower-defense/submit/', data),
  getTDLeaderboard: () => api.get('/compiler/tower-defense/leaderboard/'),
};

// ===== CLASSROOM API =====
export const classroomAPI = {
  getSections: () => api.get('/classroom/sections/'),
  createSection: (data) => api.post('/classroom/sections/', data),
  getSection: (id) => api.get(`/classroom/sections/${id}/`),
  joinSection: (code) => api.post('/classroom/sections/join/', { join_code: code }),
  leaveSection: (id) => api.post(`/classroom/sections/${id}/leave/`),
  getSectionStudents: (id) => api.get(`/classroom/sections/${id}/students/`),
  getAssignments: (id) => api.get(`/classroom/sections/${id}/assignments/`),
  createAssignment: (id, data) => api.post(`/classroom/sections/${id}/assign/`, data),
};

export default api;
