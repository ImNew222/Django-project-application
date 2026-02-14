# 📘 Nexora — Complete System Documentation

> **Nexora** is a gamified academic platform designed for schools (specifically I.T. departments) that transforms traditional learning into an interactive, competitive, and collaborative experience. It combines quizzes, code battles, tournaments, typing contests, AI-powered tools, and social features — all in one unified web application.

---

## Table of Contents

1. [Why Does This System Exist?](#1-why-does-this-system-exist)
2. [What Can It Do? (Feature Overview)](#2-what-can-it-do-feature-overview)
3. [How Does It Benefit the School?](#3-how-does-it-benefit-the-school)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [System Flows](#6-system-flows)
7. [Backend App Breakdown](#7-backend-app-breakdown)
8. [Frontend Page Breakdown](#8-frontend-page-breakdown)
9. [Real-Time Features (WebSockets)](#9-real-time-features-websockets)
10. [Authentication & Security](#10-authentication--security)
11. [How to Run the System](#11-how-to-run-the-system)
12. [Deployment Notes](#12-deployment-notes)
13. [FAQ](#13-faq)

---

## 1. Why Does This System Exist?

### The Problem

Traditional education in I.T. departments faces several challenges:

- **Low student engagement** — Students passively attend lectures without active participation.
- **No competitive learning** — There's no gamified mechanism to motivate students to improve.
- **Limited coding practice** — Students don't have a safe, integrated environment to compile and run code.
- **No real-time collaboration** — Communication between students and teachers is fragmented (Messenger, email, etc.).
- **Manual grading & tracking** — Teachers spend excessive time tracking student performance manually.
- **No centralized platform** — Schools lack a single hub for quizzes, code challenges, announcements, and communication.

### The Solution

**Nexora** addresses every one of these problems by providing:

| Problem | Nexora Solution |
|---|---|
| Low engagement | Gamified quizzes with leaderboards, ELO rankings, and streaks |
| No competitive learning | Real-time PvP code battles and team tournaments |
| Limited coding practice | Built-in code compiler with Judge0 (supports 40+ languages) |
| No real-time collaboration | WebSocket-powered messaging, battle spectating, and live chat |
| Manual grading | Automated quiz scoring, grade calculator with OCR upload |
| No centralized platform | One unified web app for everything |

### Why the School Needs This

1. **Modernizes the I.T. department** — Shows the school embraces digital transformation.
2. **Measurable learning outcomes** — Teachers can track every student's quiz scores, coding accuracy, and participation rate.
3. **Student retention** — Gamification keeps students coming back. Streaks, achievements, and leaderboards create healthy competition.
4. **Reduces cheating** — Anti-cheat mechanisms (tab-switch detection, timed quizzes, randomized choices) make assessments more honest.
5. **Free and self-hosted** — No recurring subscription costs. Everything runs on the school's own servers.

---

## 2. What Can It Do? (Feature Overview)

### 🎓 For Students

| Feature | Description |
|---|---|
| **Quiz System** | Take quizzes on various I.T. subjects (Programming, Networking, etc.) with difficulty levels |
| **Code Compiler** | Write and run code in 40+ languages directly in the browser |
| **Code Battle (PvP)** | Challenge other students to real-time 1v1 coding duels |
| **Tournaments** | Join bracket-based elimination tournaments with ELO seeding |
| **Daily Challenges** | Solve one coding challenge per day to maintain streaks |
| **Typing Contest** | Improve typing speed with WPM tracking and accuracy scoring |
| **Tower Defense Game** | Play a 3D tower defense game that rewards coding knowledge |
| **AI Quiz Generator** | Generate custom quizzes using AI (Gemini/GPT) |
| **Study Buddy Finder** | Find classmates with similar interests for study pairing |
| **Social Feed** | Post updates, like, and comment — like a school-specific social network |
| **Direct Messaging** | Chat with classmates and teachers in real-time |
| **Profile & Achievements** | Track your stats, view activity heatmap, and unlock achievements |
| **Leaderboard** | See global rankings based on rank points and ELO rating |
| **Lost & Found** | Report or find lost items within the campus |
| **Grade Calculator** | Calculate grades with OCR score uploading from physical papers |

### 👨‍🏫 For Teachers

| Feature | Description |
|---|---|
| **Teacher Dashboard** | Manage sections, view student performance, create assignments |
| **Section Management** | Create class sections with join codes, add/remove students |
| **Assignment System** | Assign quizzes, tournaments, or code challenges to sections |
| **Quiz Management** | Create/edit quiz questions per subject and difficulty |
| **AI Quiz Generation** | Auto-generate quiz questions using AI for any topic |
| **Performance Analytics** | View student scores, completion rates, and participation data |
| **Blog / Announcements** | Publish news posts and announcements for students |
| **Real-time Section Chat** | Chat with the entire section via WebSocket |

### 🏫 For the School / I.T. Department

| Benefit | Description |
|---|---|
| **Digital infrastructure** | A custom-built platform that the department can showcase |
| **Data-driven decisions** | Analytics on student performance across quizzes and coding |
| **Zero cost** | Fully open-source, self-hosted — no subscription fees |
| **Scalable** | Can support multiple sections, teachers, and hundreds of students |
| **Customizable** | Built on Django + React — easily extendable by I.T. students and faculty |

---

## 3. How Does It Benefit the School?

### Benefits for Teachers
- **Automated assessment** — No more manual grading for quizzes and code challenges. The system auto-checks answers and runs test cases.
- **Anti-cheat** — Tab-switch detection, timed questions, and shuffled answer choices reduce cheating.
- **Classroom management** — Create sections, assign work, and monitor progress from one dashboard.
- **AI-assisted content creation** — Generate quiz questions instantly using Gemini AI.
- **Real-time communication** — Message students, post announcements, and chat within sections.

### Benefits for Students
- **Active learning** — Instead of passive lectures, students actively solve problems, write code, and compete.
- **Instant feedback** — Get immediate results after quizzes and code submissions.
- **Motivation through gamification** — ELO ratings, rank titles (Newbie → Legend), streaks, and achievements.
- **Peer learning** — Study buddy pairing, social feed, and section chat encourage collaboration.
- **Portfolio building** — Students accumulate coding statistics and achievements that demonstrate their skills.

### Benefits for the I.T. Department
- **Showcase project** — Demonstrates the department's capability in building real-world software.
- **Research opportunity** — Data from the platform can be used for academic research on gamified learning.
- **Community building** — Creates a sense of belonging among I.T. students.
- **Lost & Found service** — A practical campus utility that everyone can use.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│           React + Vite (SPA at :5173)                │
│  ┌──────────┬──────────┬──────────┬───────────┐     │
│  │  Pages   │ Context  │Components│   Game    │     │
│  │ (26 pgs) │ (Auth,   │(Navbar,  │(Tower     │     │
│  │          │  Theme,  │ Toast,   │ Defense)  │     │
│  │          │  Toast)  │ Chat)    │           │     │
│  └──────────┴──────────┴──────────┴───────────┘     │
│         ↓ REST API (JWT)      ↓ WebSocket (JWT)     │
└─────────────────────────────────────────────────────┘
                      │                    │
                      ▼                    ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│           Django + DRF + Channels (:8000)            │
│  ┌──────────────────────────────────────────────┐   │
│  │              12 Django Apps                   │   │
│  │  accounts │ quiz │ compiler │ classroom       │   │
│  │  leaderboard │ typingcontest │ social         │   │
│  │  blog │ messaging │ lostandfound │ pairing    │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │         5 WebSocket Consumers                 │   │
│  │  BattleConsumer │ NotificationConsumer         │   │
│  │  SpectatorConsumer │ TournamentChatConsumer    │   │
│  │  SectionChatConsumer                          │   │
│  └──────────────────────────────────────────────┘   │
│         ↓                        ↓                   │
│  ┌────────────┐         ┌───────────────┐           │
│  │  SQLite DB │         │  Judge0 CE    │           │
│  │ (db.sqlite3)│         │ (Docker :2358)│           │
│  └────────────┘         └───────────────┘           │
│                                ↓                     │
│                    ┌───────────────────┐             │
│                    │ PostgreSQL + Redis│             │
│                    │  (Judge0 backend) │             │
│                    └───────────────────┘             │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                EXTERNAL SERVICES                     │
│  ┌──────────────┐  ┌────────────────┐               │
│  │  Google       │  │  OpenAI GPT   │               │
│  │  Gemini AI    │  │  (fallback)   │               │
│  └──────────────┘  └────────────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.12** | Core programming language |
| **Django 5.x** | Web framework |
| **Django REST Framework** | REST API layer |
| **Django Channels + Daphne** | WebSocket support for real-time features |
| **SimpleJWT** | JWT token-based authentication |
| **SQLite** | Application database (dev; can be swapped to PostgreSQL for production) |
| **Judge0 CE** | Self-hosted code execution engine (Docker) |
| **Google Gemini AI** | AI-powered quiz generation and study explanations |
| **OpenAI GPT** | Fallback AI provider |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework (Single Page Application) |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **Three.js + React Three Fiber** | 3D graphics for Tower Defense game |
| **Monaco Editor** | VS Code-like code editor in the browser |
| **Rapier 3D** | Physics engine for the tower defense game |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Container orchestration for Judge0 |
| **Redis** | Message broker for Judge0 job queue |
| **PostgreSQL** | Database for Judge0 service |

---

## 6. System Flows

### 6.1 User Registration & Login Flow

```
Student/Teacher ──▶ RegisterPage ──▶ POST /api/auth/register/
                         │                    │
                         │              Creates CustomUser
                         │              (role: student/teacher)
                         │                    │
                         ▼                    ▼
                    LoginPage ──▶ POST /api/auth/login/
                         │                    │
                         │              Returns JWT tokens
                         │           (access + refresh)
                         │                    │
                         ▼                    ▼
                    DashboardPage       Tokens stored in
                    (Home Page)         localStorage
```

**Why this flow exists:** JWT authentication is stateless and scalable. The 12-hour access token lifetime reduces the need for frequent re-logins while keeping sessions reasonably secure.

---

### 6.2 Quiz Flow

```
Student ──▶ QuizLobbyPage ──▶ Select Subject + Difficulty
                 │
                 ▼
         POST /api/quiz/start/
                 │
           Creates QuizSession
           Fetches 10 random questions
           (shuffled choices)
                 │
                 ▼
         QuizPlayPage ──▶ Answer each question
                 │         (timer per question)
                 │         (tab-switch detection)
                 │
                 ▼
         POST /api/quiz/submit/
                 │
           Calculates score
           Updates PlayerStats
           Updates streaks & rank points
                 │
                 ▼
         QuizResultsPage ──▶ View score, accuracy,
                              time per question
```

**Why this part exists:**
- **Subjects** allow organizing questions by topic (e.g., Programming, Networking, Database).
- **Difficulty levels** (Beginner, Intermediate, Hard) ensure progressive learning.
- **Tab-switch tracking** is an anti-cheat mechanism — counts are stored and visible to teachers.
- **Shuffled choices** prevent answer pattern memorization.
- **Time limit per question** prevents looking up answers.

---

### 6.3 Code Compiler Flow

```
Student ──▶ CodeCompilerPage ──▶ Write code in Monaco Editor
                 │                  Select language (40+)
                 │
                 ▼
         POST /api/compiler/run/
                 │
           Sends code to Judge0 (Docker)
           Judge0 compiles & runs in sandbox
                 │
                 ▼
         Returns: stdout, stderr,
                  execution time, memory used
                 │
                 ▼
         Display output in terminal panel
```

**Why this part exists:**
- Students need a **safe sandboxed environment** to write and run code without installing compilers locally.
- **Judge0** runs code in isolated Docker containers, preventing malicious code from harming the server.
- Supports **40+ programming languages** including Python, Java, C++, JavaScript, C#, and more.

---

### 6.4 PvP Code Battle Flow (Real-time)

```
Player 1 ──▶ CodeBattlePage ──▶ Create/Join Battle
Player 2 ──▶ CodeBattlePage ──▶ Join Battle
                 │
                 ▼
         WebSocket: ws/battle/
                 │
           Both players connected
           3-second countdown
                 │
                 ▼
         Same coding challenge appears
         for both players simultaneously
                 │
         Player writes code ──▶ Submit
                 │
           Code sent to Judge0
           Test cases evaluated
           Results broadcast to both via WS
                 │
                 ▼
         First to pass all test cases wins
         OR highest test pass count when time expires
                 │
                 ▼
         ELO Rating updated for both players
         Winner gets rank points
         Loser adjusts ELO accordingly
```

**Why this part exists:**
- **Competitive coding** motivates students to improve their problem-solving skills.
- **ELO rating system** (same algorithm used in chess) ensures fair matchmaking.
- **Real-time WebSocket** provides instant feedback — both players see each other's progress live.

---

### 6.5 Tournament Flow

```
Teacher/Admin ──▶ Create Tournament
                    │
                    ├── Title, description
                    ├── Size (4, 8, or 16 players)
                    ├── Challenges pool
                    └── Join code
                    │
                    ▼
Students ──▶ Join Tournament (using join code)
                    │
                    ▼
         When full → generate_bracket()
                    │
              Seeds players by ELO
              Creates Round 1 matches
                    │
                    ▼
         Each match = PvP Battle
              ┌──────────┐
              │ Round 1  │
              │  Match 1 │──▶ Winner advances
              │  Match 2 │──▶ Winner advances
              │  Match 3 │──▶ Winner advances
              │  Match 4 │──▶ Winner advances
              └──────────┘
                    │
              ┌──────────┐
              │ Round 2  │
              │  Semi 1  │──▶ Winner advances
              │  Semi 2  │──▶ Winner advances
              └──────────┘
                    │
              ┌──────────┐
              │  Finals  │
              │  Match 1 │──▶ CHAMPION
              └──────────┘
                    │
                    ▼
         Tournament complete
         Placements assigned (1st, 2nd, etc.)
         Rank points awarded
```

**Why this part exists:**
- **Tournaments** create excitement and a sense of event — like a school coding competition.
- **Bracket-based elimination** is familiar and visually engaging.
- **ELO seeding** ensures top players don't face each other in early rounds.
- **Spectator mode** allows students and teachers to watch matches in real-time.

---

### 6.6 Classroom & Section Flow

```
Teacher ──▶ TeacherDashboardPage ──▶ Create Section
                 │                      │
                 │                ┌─────────────────┐
                 │                │ Section Details  │
                 │                │ Program: BSIT    │
                 │                │ Year: 2          │
                 │                │ Section#: 1      │
                 │                │ Join Code: A3X9K2│
                 │                └─────────────────┘
                 │
                 ▼
         Share join code with students
                 │
Students ──▶ Join Section (enter code)
                 │
                 ▼
Teacher ──▶ Create Assignment
                 │
                 ├── Quiz Assignment → Links to Subject + Difficulty
                 ├── Tournament Assignment → Links to Tournament
                 └── Code Challenge Assignment → Links to CodeChallenge
                 │
                 ▼
Students see assignments in SectionPage
         Complete assigned work
         Teacher views results in dashboard
```

**Why this part exists:**
- **Sections** mirror real classroom structure (BSIT 1 - Sec 1, BSCS 2 - Sec 3, etc.).
- **Join codes** make enrollment easy — no admin intervention needed.
- **Assignments** let teachers direct learning — assign specific quizzes or coding challenges with due dates.
- **Section chat** (WebSocket) provides a dedicated communication channel per class.

---

### 6.7 Daily Challenge Flow

```
System ──▶ Auto-selects challenge for today
            (cycles through easy → medium → hard)
                 │
                 ▼
Student ──▶ DailyChallengePage ──▶ View today's challenge
                 │
                 ▼
         Write & submit code
                 │
           Test cases evaluated
                 │
           If solved:
             ├── daily_streak += 1
             ├── best_daily_streak updated
             └── rank_points awarded
                 │
           If not solved:
             └── Can retry (attempt count tracked)
```

**Why this part exists:**
- **Daily challenges** build a consistent coding habit.
- **Streak system** rewards consistency — miss a day, lose your streak.
- **Difficulty cycling** (easy → medium → hard → easy...) provides variety.

---

### 6.8 Study Buddy Pairing Flow

```
Student A ──▶ StudyBuddyPage ──▶ Set profile:
                 │                  - Interests (comma-separated)
                 │                  - Available for pairing = true
                 │
                 ▼
         Browse available students
         (filtered by shared interests)
                 │
                 ▼
         Send Pairing Request (with optional message)
                 │
Student B ──▶ Receives notification
                 │
                 ├── Accept → Both are now study buddies
                 └── Decline → Request closed
```

**Why this part exists:**
- **Peer learning** is proven to improve retention and understanding.
- **Interest-based matching** connects students who can help each other.
- **Reduces isolation** — especially useful for shy or introverted students.

---

### 6.9 Social Feed & Blog Flow

```
Social Feed (all users):
  Student/Teacher ──▶ SocialFeedPage ──▶ Create Post
                         │                  (text + optional image)
                         │
                  Other users can:
                    ├── Like posts
                    └── Comment on posts

Blog (teachers/admins only):
  Teacher ──▶ BlogPage ──▶ Create Blog Post
                 │           (title + content + cover image)
                 │
          All users can read announcements
```

**Why this part exists:**
- **Social Feed** creates a school community feel — students share tips, memes, and study resources.
- **Blog** is a formal announcements channel for teachers — no clutter from student posts.
- Both features **keep students on the platform** instead of switching to external social media.

---

### 6.10 Lost & Found Flow

```
User ──▶ LostFoundPage ──▶ Report Item
              │                │
              │          ┌─────────────┐
              │          │ Type: Lost  │
              │          │ or Found    │
              │          │ Category    │
              │          │ Location    │
              │          │ Description │
              │          │ Image       │
              │          │ Contact     │
              │          └─────────────┘
              │
              ▼
       All users can browse listings
       Filter by type (Lost / Found)
       Status: Open → Claimed → Resolved
```

**Why this part exists:**
- A **practical campus service** that benefits everyone, not just I.T. students.
- **Categorization** (Electronics, ID Card, Wallet, Keys, etc.) makes searching efficient.
- **Status tracking** lets users know when items are resolved.

---

### 6.11 Messaging Flow

```
User A ──▶ MessagingPage ──▶ Start Conversation
                │               │
                │         Select participant(s)
                │         (DM or Group)
                │               │
                ▼               ▼
         Send messages in real-time
         Messages marked as read/unread
```

**Why this part exists:**
- **Direct communication** between students and teachers without needing external apps.
- **Group chats** for project teams or study groups.
- Keeps all academic communication **in one place**.

---

### 6.12 Grade Calculator Flow

```
Student ──▶ GradeCalculatorPage ──▶ Enter scores manually
                 │                     OR
                 │
                 ▼
         OCR Score Upload ──▶ Upload photo of paper grades
                 │              AI extracts scores via OCR
                 │
                 ▼
         Calculate weighted grades
         (Prelim, Midterm, Finals)
         Display final grade & remarks
```

**Why this part exists:**
- Students often need to compute their grades quickly.
- **OCR upload** is innovative — takes a photo of a physical grade sheet and auto-extracts scores.
- Saves time for both students and teachers.

---

### 6.13 Tower Defense Game Flow

```
Student ──▶ TowerDefensePage ──▶ 3D Tower Defense Game
                 │
         Place towers along a path
         Enemies spawn in waves
         Towers attack enemies
         Earn points for kills
                 │
                 ▼
         Game Over → Score saved
         TowerDefenseScore recorded
         Appears on leaderboard
```

**Why this part exists:**
- **Gamification at its peak** — a fully playable 3D game built with Three.js.
- Provides a **fun break** from studying while staying on the platform.
- Scores are tracked and competitive, integrating with the overall ranking system.

---

## 7. Backend App Breakdown

### `accounts`
| Item | Detail |
|---|---|
| **Purpose** | User registration, login, profiles |
| **Models** | `CustomUser` (extends AbstractUser with role, bio, avatar, gender, interests) |
| **Roles** | Student, Teacher, Admin |
| **Auth** | JWT tokens via SimpleJWT |

### `quiz`
| Item | Detail |
|---|---|
| **Purpose** | Quiz system with subjects, questions, and sessions |
| **Models** | `Subject`, `Question`, `QuizSession`, `QuizAnswer` |
| **Key features** | Shuffled choices, time-per-question, tab-switch anti-cheat |

### `compiler`
| Item | Detail |
|---|---|
| **Purpose** | Code execution, battles, tournaments, daily challenges |
| **Models** | `CodeSubmission`, `CodeChallenge`, `TestCase`, `BattleSession`, `BattleSubmission`, `PvPBattle`, `PvPSubmission`, `DailyChallenge`, `DailySubmission`, `Tournament`, `TournamentParticipant`, `TournamentMatch`, `TowerDefenseScore` |
| **Key features** | Judge0 integration, real-time PvP via WebSocket, bracket tournaments |

### `classroom`
| Item | Detail |
|---|---|
| **Purpose** | Section management and assignment system |
| **Models** | `Section`, `SectionMembership`, `SectionAssignment` |
| **Key features** | Auto-generated join codes, program/year/section structure, assignment types (quiz, tournament, challenge) |

### `leaderboard`
| Item | Detail |
|---|---|
| **Purpose** | Global rankings and player statistics |
| **Models** | `PlayerStats` |
| **Key features** | ELO rating system, rank titles, streak tracking, accuracy stats, PvP win/loss record |

### `typingcontest`
| Item | Detail |
|---|---|
| **Purpose** | Typing speed contests |
| **Models** | `TypingText`, `TypingResult` |
| **Key features** | WPM calculation, accuracy tracking, difficulty levels |

### `social`
| Item | Detail |
|---|---|
| **Purpose** | Social feed for posts, likes, comments |
| **Models** | `Post`, `Like`, `Comment` |
| **Key features** | Image uploads, like/comment system |

### `blog`
| Item | Detail |
|---|---|
| **Purpose** | Blog/announcement posts by teachers and admins |
| **Models** | `BlogPost` |
| **Key features** | Cover images, publish/unpublish toggle, auto-excerpt |

### `messaging`
| Item | Detail |
|---|---|
| **Purpose** | Direct and group messaging |
| **Models** | `Conversation`, `Message` |
| **Key features** | DM and group modes, read/unread tracking |

### `lostandfound`
| Item | Detail |
|---|---|
| **Purpose** | Campus lost and found board |
| **Models** | `LostFoundItem` |
| **Key features** | Categories (Electronics, ID Card, Wallet, etc.), status tracking, image upload |

### `pairing`
| Item | Detail |
|---|---|
| **Purpose** | Study buddy matchmaking |
| **Models** | `PairingRequest` |
| **Key features** | Interest-based matching, request/accept/decline flow |

### `config`
| Item | Detail |
|---|---|
| **Purpose** | Django project configuration |
| **Files** | `settings.py`, `urls.py`, `asgi.py`, `wsgi.py` |
| **Key features** | ASGI + Channels routing, CORS config, JWT settings |

---

## 8. Frontend Page Breakdown

| Page | Route | Purpose |
|---|---|---|
| `LoginPage` | `/login` | User login with JWT |
| `RegisterPage` | `/register` | User registration (student/teacher) |
| `DashboardPage` | `/` | Home dashboard with stats overview |
| `QuizLobbyPage` | `/quiz` | Select subject and difficulty to start quiz |
| `QuizPlayPage` | `/quiz/play` | Take a quiz question by question |
| `QuizResultsPage` | `/quiz/results` | View quiz results and stats |
| `LeaderboardPage` | `/leaderboard` | Global rankings by rank points and ELO |
| `SocialFeedPage` | `/feed` | Social media-style post feed |
| `BlogPage` | `/blog` | Teacher blog / announcements |
| `LostFoundPage` | `/lost-found` | Lost & found item board |
| `TypingContestPage` | `/typing` | Typing speed test |
| `AIQuizGeneratorPage` | `/ai-generate` | Generate quiz questions with AI |
| `MessagingPage` | `/messages` | Direct messaging & group chat |
| `StudyBuddyPage` | `/study-buddy` | Find and pair with study buddies |
| `TeacherDashboardPage` | `/teacher` | Teacher control panel (sections, assignments, analytics) |
| `GradeCalculatorPage` | `/grades` | Grade computation with OCR upload |
| `ProfilePage` | `/profile` | User profile with activity heatmap and stats |
| `SettingsPage` | `/settings` | Account settings |
| `AchievementsPage` | `/achievements` | View unlocked achievements |
| `CodeCompilerPage` | `/compiler` | Write and run code online |
| `CodeBattlePage` | `/battle` | Real-time PvP code battles |
| `DailyChallengePage` | `/daily` | Today's coding challenge |
| `TournamentPage` | `/tournament` | Browse and join tournaments |
| `FriendsPage` | `/friends` | Friends list management |
| `SpectatorView` | `/spectate/:id` | Watch tournament matches live |
| `SectionPage` | `/section/:id` | View section details and assignments |
| `TowerDefensePage` | `/tower-defense` | 3D Tower Defense game |

---

## 9. Real-Time Features (WebSockets)

Nexora uses **Django Channels** with **Daphne** ASGI server for WebSocket support. There are 5 WebSocket consumers:

| Consumer | Endpoint | Purpose |
|---|---|---|
| `BattleConsumer` | `ws/battle/` | Real-time PvP code battle state sync |
| `NotificationConsumer` | `ws/notifications/` | Push notifications (new challenges, battle invites, etc.) |
| `SpectatorConsumer` | `ws/spectate/<tournament_id>/` | Live tournament match spectating |
| `TournamentChatConsumer` | `ws/tournament-chat/<tournament_id>/` | In-tournament chat room |
| `SectionChatConsumer` | `ws/section-chat/<section_id>/` | Classroom section chat |

All WebSocket connections are authenticated via a custom **JWTAuthMiddleware** that validates tokens before establishing the connection.

---

## 10. Authentication & Security

### JWT Token Flow
1. User sends credentials to `/api/auth/login/`
2. Server returns `access` token (valid 12 hours) and `refresh` token (valid 7 days)
3. Frontend stores tokens in `localStorage`
4. Every API request includes `Authorization: Bearer <access_token>`
5. When access token expires, frontend uses refresh token to get a new one
6. Refresh tokens are **rotated** (old ones invalidated after use)

### Security Measures
| Measure | Implementation |
|---|---|
| **CORS** | Only `localhost:5173` allowed (configure for production) |
| **CSRF** | Django middleware enabled |
| **Password validation** | 4 validators (similarity, min length, common, numeric) |
| **Anti-cheat** | Tab-switch detection, timed quizzes, shuffled choices |
| **Sandboxed code execution** | Judge0 runs code in isolated Docker containers |
| **Role-based access** | Student/Teacher/Admin roles control feature visibility |

---

## 11. How to Run the System

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** and **npm**
- **Docker** and **Docker Compose** (for Judge0 code execution)
- **Git**

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd Django-project
```

### Step 2: Start Judge0 (Code Execution Engine)
```bash
# Start Judge0 and its dependencies (PostgreSQL + Redis)
docker compose up -d

# Verify all containers are running
docker compose ps

# Expected: judge0-server, judge0-worker, judge0-db, judge0-redis
```

### Step 3: Set Up the Backend
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt
pip install django-cors-headers channels daphne Pillow
pip install google-generativeai openai

# Run database migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the backend server (Daphne for WebSocket support)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Step 4: Set Up the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Step 5: Access the Application
| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000/api/ |
| **Django Admin** | http://localhost:8000/admin/ |
| **Judge0 API** | http://localhost:2358 |

### Step 6: Seed Initial Data (Optional)
```bash
cd backend

# Access Django shell
python manage.py shell

# Create subjects
from quiz.models import Subject
Subject.objects.create(name="Programming", description="General programming concepts", icon="💻")
Subject.objects.create(name="Networking", description="Computer networking", icon="🌐")
Subject.objects.create(name="Database", description="Database management systems", icon="🗄️")
Subject.objects.create(name="Web Development", description="HTML, CSS, JavaScript", icon="🌍")
```

---

## 12. Deployment Notes

### For Production

1. **Change `DEBUG` to `False`** in `settings.py`
2. **Update `SECRET_KEY`** — generate a new one:
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
3. **Update `ALLOWED_HOSTS`** — set to your domain
4. **Update `CORS_ALLOWED_ORIGINS`** — set to your frontend domain
5. **Switch to PostgreSQL** for the main database (production-grade)
6. **Rotate API keys** — regenerate Gemini and OpenAI keys
7. **Use environment variables** for all secrets
8. **Set up HTTPS** with a reverse proxy (Nginx + Let's Encrypt)
9. **Configure static file serving** (`python manage.py collectstatic`)
10. **Use Redis** for Channel Layers instead of `InMemoryChannelLayer`

### Recommended Production Stack
```
Nginx (reverse proxy + SSL) → Daphne (ASGI) → Django
                            → Vite build (static files)
Docker Compose → Judge0 + PostgreSQL + Redis
```

---

## 13. FAQ

### Q: Can this handle hundreds of students?
**A:** Yes. The backend uses Django (battle-tested at scale), and WebSocket connections are managed per-room by Django Channels. For larger deployments, switch to Redis-backed Channel Layers and PostgreSQL.

### Q: Is the code execution safe?
**A:** Yes. Judge0 runs all code inside isolated Docker containers with strict resource limits (CPU time, memory, process count). Even malicious code cannot affect the host system.

### Q: Can teachers create their own quiz questions?
**A:** Yes. Teachers can manually create questions through the Django Admin panel or use the AI Quiz Generator to auto-generate questions on any topic.

### Q: Does it work offline?
**A:** No. Nexora requires an internet connection (or local network) to communicate with the backend and Judge0 services.

### Q: Can we add new programming languages?
**A:** Yes. Judge0 supports 40+ languages out of the box. The frontend language selector can be extended by adding new language options.

### Q: How is the ELO rating calculated?
**A:** Nexora uses the standard ELO formula with a K-factor of 32:
```
Expected = 1 / (1 + 10^((OpponentELO - PlayerELO) / 400))
NewELO = OldELO + K × (ActualScore - ExpectedScore)
```
New players start at 1000 ELO, with tiers from Bronze (0+) to Master (2000+).

### Q: Can the system be customized?
**A:** Absolutely. It's built on Django + React — both are highly extensible. The I.T. department can add new apps, modify features, or change the UI as needed.

---

## Summary

**Nexora** is not just a quiz app — it's a **complete academic ecosystem** that brings together:

- ✅ **Assessment** — Quizzes, code challenges, and assignments
- ✅ **Competition** — PvP battles, tournaments, and leaderboards
- ✅ **Collaboration** — Study buddies, messaging, and section chat
- ✅ **Community** — Social feed, blog, and lost & found
- ✅ **Career Skills** — Code compiler, typing contests, and AI tools
- ✅ **Fun** — Tower Defense game, achievements, and streaks

All of this in a **single, unified, self-hosted platform** designed specifically for school I.T. departments.

---

*Last updated: February 15, 2026*
