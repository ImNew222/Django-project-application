# 📊 Nexora — Flowcharts, APIs & Problem-Solution Analysis

---

## Table of Contents

1. [Problems This Website Solves](#1-problems-this-website-solves)
2. [All APIs Used](#2-all-apis-used)
3. [System Flowcharts](#3-system-flowcharts)

---

## 1. Problems This Website Solves

### Problem → Solution Matrix

| # | Problem in Schools Today | How Nexora Solves It |
|---|---|---|
| 1 | **Students are bored in class** — Traditional lectures don't engage Gen-Z learners | Gamified quizzes with points, streaks, and ELO rankings make learning feel like a game |
| 2 | **No way to practice coding** — Students must install compilers locally, which is complex and error-prone | Built-in online code compiler (Judge0) supports 40+ languages, runs in the browser |
| 3 | **Cheating on exams is easy** — Paper-based or basic online quizzes are easy to cheat on | Anti-cheat: tab-switch detection, timed questions, shuffled answer choices |
| 4 | **Teachers can't track student performance** — Manual grading and no analytics | Automated scoring, quiz history, player stats, and teacher dashboard with analytics |
| 5 | **No competitive learning** — Students have no motivation to improve beyond passing grades | PvP code battles, tournaments with brackets, ELO rating system, leaderboards |
| 6 | **Communication is scattered** — Students use Messenger, email, Viber for school-related talk | Built-in messaging (DM + group), section chat, tournament chat — all in one platform |
| 7 | **No coding competitions** — Schools want coding contests but lack the infrastructure | Tournament system with seeded brackets, spectator mode, and automated judging |
| 8 | **Creating quiz content takes hours** — Teachers manually write every question | AI Quiz Generator (Google Gemini AI) creates questions instantly on any topic |
| 9 | **Students don't practice consistently** — No habit-building mechanism | Daily challenges with streak tracking — miss a day, lose your streak |
| 10 | **Lost items on campus** — No centralized reporting system | Built-in Lost & Found board with categories, images, and status tracking |
| 11 | **Students study alone** — No way to find study partners with similar interests | Study Buddy pairing system — match by interests, send requests |
| 12 | **Grade computation is confusing** — Students don't know how to compute weighted grades | Grade Calculator with OCR — even upload photos of paper grade sheets |
| 13 | **No school community platform** — Students lack a safe, school-specific social space | Social feed (posts, likes, comments) and blog for teacher announcements |
| 14 | **I.T. students don't build real projects** — Curriculum lacks practical application | Nexora itself IS the capstone project — built by the I.T. department |
| 15 | **Typing speed is undervalued** — An essential skill for I.T. students with no training tool | Typing contest with WPM, accuracy tracking, and leaderboard |

### Impact Summary

```
┌──────────────────────────────────────────────────────────┐
│              BEFORE Nexora                            │
│                                                          │
│  📋 Paper quizzes          → Easy to cheat               │
│  📧 Fragmented comms       → Missed announcements        │
│  💻 No coding environment  → Students can't practice     │
│  📊 Manual grading         → Teacher burnout              │
│  😴 Boring classes         → Low engagement               │
│  🏆 No competitions        → No motivation                │
└──────────────────────────────────────────────────────────┘
                         ▼ ▼ ▼
┌──────────────────────────────────────────────────────────┐
│              AFTER Nexora                             │
│                                                          │
│  🎮 Gamified quizzes       → 10x engagement              │
│  💬 Unified messaging      → Nothing gets missed          │
│  ⚡ Online compiler        → Practice anytime             │
│  🤖 AI + auto-grading      → Teacher time saved           │
│  🔥 Streaks & rankings     → Students come back daily     │
│  🏆 Tournaments            → School-wide coding events    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. All APIs Used

### A. External APIs (Third-Party Services)

These are APIs from outside services that Nexora connects to:

| # | API | Provider | Purpose | How It's Used |
|---|---|---|---|---|
| 1 | **Judge0 CE API** | Self-hosted (Docker) | Code compilation & execution | Runs student code in 40+ languages inside sandboxed Docker containers. Receives source code → returns output, errors, execution time, memory usage |
| 2 | **Google Gemini AI API** | Google DeepMind | AI quiz generation & code explanations | Generates quiz questions on any topic. Also provides AI-powered explanations for code challenges and wrong answers |
| 3 | **OpenAI GPT API** | OpenAI | Fallback AI provider | Used when Gemini is unavailable. Same functions: quiz generation and code explanations |
| 4 | **SimpleJWT** | Django library | JWT token authentication | Issues access tokens (12h) and refresh tokens (7d) for stateless authentication |

### B. Internal REST API Endpoints (Built by Us)

> **Base URL:** `http://localhost:8000/api/`

---

#### 🔐 Authentication & Accounts — `/api/auth/`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register/` | Register a new student/teacher account |
| `POST` | `/api/auth/login/` | Login and receive JWT tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh an expired access token |
| `GET/PUT` | `/api/auth/me/` | Get or update current user profile |
| `POST` | `/api/auth/change-password/` | Change account password |
| `DELETE` | `/api/auth/delete-account/` | Permanently delete account |
| `GET` | `/api/auth/search/` | Search for users by name/username |
| `GET` | `/api/auth/students/` | List all students (teacher only) |
| `GET` | `/api/auth/students/<id>/` | View specific student details |

---

#### 📝 Quiz System — `/api/quiz/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/quiz/subjects/` | List all quiz subjects |
| `POST` | `/api/quiz/start/` | Start a new quiz session |
| `POST` | `/api/quiz/answer/` | Submit an answer to a question |
| `POST` | `/api/quiz/<id>/complete/` | Complete and score a quiz session |
| `POST` | `/api/quiz/<id>/tab-switch/` | Report a tab switch (anti-cheat) |
| `GET` | `/api/quiz/history/` | View past quiz sessions |
| `GET` | `/api/quiz/session/<id>/` | View specific session details |
| `POST` | `/api/quiz/ai-generate/` | Generate questions using AI |

---

#### 💻 Code Compiler — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/languages/` | List supported programming languages |
| `POST` | `/api/compiler/run/` | Submit code for execution via Judge0 |
| `GET` | `/api/compiler/submission/<id>/` | View a specific submission result |
| `GET` | `/api/compiler/history/` | View past code submissions |

---

#### ⚔️ Code Battle — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/challenges/` | List all coding challenges |
| `GET` | `/api/compiler/challenges/<slug>/` | View challenge details + test cases |
| `POST` | `/api/compiler/battle/start/` | Start a battle session on a challenge |
| `POST` | `/api/compiler/battle/<id>/submit/` | Submit solution for judge evaluation |
| `GET` | `/api/compiler/battle/<id>/result/` | View battle session results |
| `GET` | `/api/compiler/battle/history/` | View past battle sessions |
| `POST` | `/api/compiler/community-challenges/` | Create a community challenge |

---

#### 🏆 PvP Battles & Invites

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/pvp/<id>/replay/` | View PvP battle replay data |
| `POST` | `/api/compiler/invites/send/` | Send a battle invite to a friend |
| `POST` | `/api/compiler/invites/<id>/respond/` | Accept or decline a battle invite |
| `GET` | `/api/compiler/invites/pending/` | List pending battle invites |

---

#### 📅 Daily Challenges — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/daily/` | Get today's coding challenge |
| `POST` | `/api/compiler/daily/submit/` | Submit solution for today's challenge |
| `GET` | `/api/compiler/daily/leaderboard/` | View daily challenge leaderboard |
| `GET` | `/api/compiler/daily/streak/` | Get current daily streak stats |

---

#### 🎯 Tournaments — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/compiler/tournaments/` | List or create tournaments |
| `POST` | `/api/compiler/tournaments/join/` | Join tournament by invite code |
| `GET` | `/api/compiler/tournaments/<id>/` | View tournament bracket and details |
| `POST` | `/api/compiler/tournaments/<id>/join/` | Join tournament by ID |
| `POST` | `/api/compiler/tournaments/<id>/start/` | Start the tournament (host only) |
| `POST` | `/api/compiler/tournaments/<id>/submit/` | Submit code for a tournament match |
| `DELETE` | `/api/compiler/tournaments/<id>/delete/` | Delete a tournament |
| `POST` | `/api/compiler/tournaments/<id>/leave/` | Leave a tournament |
| `GET` | `/api/compiler/tournaments/<id>/check-timeout/` | Check if match has timed out |

---

#### 🏫 Classroom — `/api/classroom/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/classroom/sections/` | List or create sections |
| `POST` | `/api/classroom/sections/join/` | Join section with code |
| `GET` | `/api/classroom/sections/<id>/` | View section details |
| `POST` | `/api/classroom/sections/<id>/leave/` | Leave a section |
| `GET` | `/api/classroom/sections/<id>/students/` | List students in section |
| `GET` | `/api/classroom/sections/<id>/assignments/` | List section assignments |
| `POST` | `/api/classroom/sections/<id>/assign/` | Create new assignment |

---

#### 📊 Leaderboard — `/api/leaderboard/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/leaderboard/` | Global leaderboard (rank points + ELO) |
| `GET` | `/api/leaderboard/me/` | Current user's stats |

---

#### ⌨️ Typing Contest — `/api/typing/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/typing/texts/` | List available typing texts |
| `GET` | `/api/typing/random/` | Get a random typing text |
| `POST` | `/api/typing/submit/` | Submit typing result (WPM, accuracy) |
| `GET` | `/api/typing/leaderboard/` | Typing speed leaderboard |
| `GET` | `/api/typing/history/` | Past typing results |

---

#### 📱 Social Feed — `/api/social/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/social/feed/` | View social feed posts |
| `POST` | `/api/social/posts/` | Create a new post |
| `DELETE` | `/api/social/posts/<id>/delete/` | Delete a post |
| `POST` | `/api/social/posts/<id>/like/` | Like/unlike a post |
| `POST` | `/api/social/posts/<id>/comment/` | Add a comment |
| `GET` | `/api/social/my-posts/` | View own posts |

---

#### 📰 Blog — `/api/blog/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/blog/` | List all blog/announcement posts |
| `GET` | `/api/blog/<id>/` | View a specific blog post |
| `POST` | `/api/blog/create/` | Create blog post (teacher only) |
| `PUT` | `/api/blog/<id>/update/` | Update blog post |
| `DELETE` | `/api/blog/<id>/delete/` | Delete blog post |

---

#### 💬 Messaging — `/api/messaging/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/messaging/` | List conversations |
| `POST` | `/api/messaging/create/` | Create a new conversation |
| `GET` | `/api/messaging/<id>/messages/` | Get messages in a conversation |
| `POST` | `/api/messaging/<id>/send/` | Send a message |
| `GET` | `/api/messaging/search-users/` | Search users to message |

---

#### 📦 Lost & Found — `/api/lostandfound/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/lostandfound/` | List all lost/found items |
| `POST` | `/api/lostandfound/create/` | Report a lost/found item |
| `PATCH` | `/api/lostandfound/<id>/status/` | Update item status |
| `DELETE` | `/api/lostandfound/<id>/delete/` | Delete a listing |
| `GET` | `/api/lostandfound/my-items/` | View own listings |

---

#### 🤝 Study Buddy Pairing — `/api/pairing/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/pairing/available/` | List students available for pairing |
| `POST` | `/api/pairing/request/` | Send a pairing request |
| `GET` | `/api/pairing/my-requests/` | View sent/received requests |
| `POST` | `/api/pairing/<id>/respond/` | Accept or decline a request |

---

#### 👤 Profile & Friends — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/profile/stats/` | Get detailed profile statistics |
| `GET` | `/api/compiler/friends/search/` | Search users to follow |
| `POST` | `/api/compiler/friends/follow/<id>/` | Follow/unfollow a user |
| `GET` | `/api/compiler/friends/` | List followed users |

---

#### 🔔 Notifications — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/compiler/notifications/` | List all notifications |
| `POST` | `/api/compiler/notifications/read/` | Mark notifications as read |
| `GET` | `/api/compiler/notifications/unread-count/` | Get unread notification count |

---

#### 🤖 AI Features — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/compiler/ai/explain/` | Get AI explanation for code/problem |

---

#### 🏰 Tower Defense — `/api/compiler/`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/compiler/tower-defense/submit/` | Submit tower defense game score |
| `GET` | `/api/compiler/tower-defense/leaderboard/` | Tower defense leaderboard |

---

### C. WebSocket Endpoints (Real-Time)

> **Base URL:** `ws://localhost:8000/`

| Endpoint | Consumer | Purpose |
|---|---|---|
| `ws/battle/` | `BattleConsumer` | Real-time PvP code battle (matchmaking, countdown, code sync, results) |
| `ws/notifications/` | `NotificationConsumer` | Push notifications (invites, challenge results, announcements) |
| `ws/spectate/<tournament_id>/` | `SpectatorConsumer` | Live spectating of tournament matches |
| `ws/tournament-chat/<tournament_id>/` | `TournamentChatConsumer` | Chat room within a tournament |
| `ws/section-chat/<section_id>/` | `SectionChatConsumer` | Classroom section group chat |

---

### API Count Summary

| Category | Count |
|---|---|
| REST API Endpoints | **83** |
| WebSocket Endpoints | **5** |
| External APIs | **3** (Judge0, Gemini, OpenAI) |
| **Total** | **91 endpoints** |

---

## 3. System Flowcharts

### 3.1 Overall System Architecture

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend - React + Vite :5173"]
        UI["User Interface<br/>26 Pages"]
        CTX["Context Providers<br/>Auth, Theme, Toast, Notifications"]
        GAME["3D Tower Defense<br/>Three.js + React Three Fiber"]
    end

    subgraph Backend["⚙️ Backend - Django + DRF + Channels :8000"]
        REST["REST API Layer<br/>83 Endpoints"]
        WS["WebSocket Layer<br/>5 Consumers"]
        APPS["12 Django Apps"]
    end

    subgraph Database["🗄️ Database"]
        SQLITE["SQLite<br/>Application Data"]
    end

    subgraph Docker["🐳 Docker Compose"]
        J0["Judge0 Server :2358"]
        J0W["Judge0 Worker"]
        PG["PostgreSQL<br/>Judge0 Data"]
        REDIS["Redis<br/>Job Queue"]
    end

    subgraph External["☁️ External APIs"]
        GEMINI["Google Gemini AI"]
        GPT["OpenAI GPT"]
    end

    UI -->|"HTTP + JWT"| REST
    UI -->|"WebSocket + JWT"| WS
    CTX --> UI
    GAME --> UI
    REST --> APPS
    WS --> APPS
    APPS --> SQLITE
    APPS -->|"Code Execution"| J0
    APPS -->|"AI Requests"| GEMINI
    APPS -->|"Fallback AI"| GPT
    J0 --> J0W
    J0W --> PG
    J0W --> REDIS
```

---

### 3.2 User Authentication Flow

```mermaid
flowchart TD
    A["👤 User opens Nexora"] --> B{"Has account?"}
    B -->|No| C["📝 Register Page"]
    C --> D["Fill: username, email,<br/>password, role"]
    D --> E["POST /api/auth/register/"]
    E --> F["Creates CustomUser<br/>role: student or teacher"]
    F --> G["Redirect to Login"]

    B -->|Yes| H["🔐 Login Page"]
    H --> I["Enter username + password"]
    I --> J["POST /api/auth/login/"]
    J --> K{"Valid credentials?"}
    K -->|No| L["❌ Show error"]
    L --> H
    K -->|Yes| M["✅ Return JWT tokens<br/>access: 12h, refresh: 7d"]
    M --> N["Store in localStorage"]
    N --> O["🏠 Dashboard Page"]
    G --> H

    O --> P{"Token expired?"}
    P -->|Yes| Q["POST /api/auth/token/refresh/"]
    Q --> R{"Refresh valid?"}
    R -->|Yes| S["New access token"]
    S --> O
    R -->|No| H
```

---

### 3.3 Quiz System Flow

```mermaid
flowchart TD
    A["🎓 Student"] --> B["Quiz Lobby Page"]
    B --> C["Select Subject<br/>Programming, Networking, etc."]
    C --> D["Select Difficulty<br/>Beginner / Intermediate / Hard"]
    D --> E["POST /api/quiz/start/"]
    E --> F["Server creates QuizSession<br/>+ fetches 10 random questions<br/>+ shuffles answer choices"]
    F --> G["Quiz Play Page"]
    G --> H["Display Question #1"]

    H --> I{"Timer per question<br/>30 seconds"}
    I -->|"Student answers"| J["POST /api/quiz/answer/"]
    I -->|"Time's up"| J
    J --> K{"More questions?"}
    K -->|Yes| H
    K -->|No| L["POST /api/quiz/complete/"]

    L --> M["Server calculates:<br/>• Score<br/>• Accuracy<br/>• Time per question"]
    M --> N["Update PlayerStats:<br/>• rank_points += score × 10<br/>• streak check (≥70%)<br/>• total_correct updated"]
    N --> O["📊 Quiz Results Page<br/>Score, time, review answers"]

    G --> P{"Tab switch detected?"}
    P -->|Yes| Q["POST /api/quiz/tab-switch/<br/>Anti-cheat counter +1"]
    Q --> G
```

---

### 3.4 Code Compiler Flow

```mermaid
flowchart TD
    A["💻 Student"] --> B["Code Compiler Page"]
    B --> C["Monaco Editor<br/>Write code"]
    C --> D["Select Language<br/>Python, Java, C++, etc."]
    D --> E["Click 'Run'"]
    E --> F["POST /api/compiler/run/"]
    F --> G["Django sends to Judge0<br/>POST http://localhost:2358"]

    G --> H["Judge0 Process"]
    H --> I["1. Create Docker container"]
    I --> J["2. Compile code<br/>in sandbox"]
    J --> K["3. Execute with<br/>resource limits"]
    K --> L["4. Capture stdout/stderr"]
    L --> M["Return result to Django"]

    M --> N{"Execution result"}
    N -->|"Success"| O["✅ Show output<br/>+ execution time<br/>+ memory used"]
    N -->|"Error"| P["❌ Show compilation<br/>or runtime error"]
    N -->|"Timeout"| Q["⏱️ Time Limit Exceeded"]
```

---

### 3.5 PvP Code Battle Flow

```mermaid
flowchart TD
    A["⚔️ Player 1"] --> B["Code Battle Page"]
    C["⚔️ Player 2"] --> B
    B --> D["WebSocket: ws/battle/"]
    D --> E["Both players connected"]

    E --> F["🕐 3-second countdown"]
    F --> G["Same challenge appears<br/>for both players"]

    G --> H["Players write code<br/>in Monaco Editor"]
    H --> I["Player submits code"]
    I --> J["Code sent to Judge0<br/>Test cases evaluated"]
    J --> K["Results broadcast<br/>via WebSocket to both"]

    K --> L{"All test cases passed?"}
    L -->|"Yes (first)"| M["🏆 WINNER!"]
    L -->|"No"| N["Keep coding..."]
    N --> H

    M --> O["ELO Rating Update"]
    O --> P["Winner: ELO +16 to +32"]
    O --> Q["Loser: ELO -16 to -32"]
    P --> R["Leaderboard updated"]
    Q --> R

    G --> S{"Time expires?"}
    S -->|Yes| T["Player with more<br/>tests passed wins"]
    T --> O
```

---

### 3.6 Tournament Flow

```mermaid
flowchart TD
    A["👨‍🏫 Teacher/Host"] --> B["Create Tournament"]
    B --> C["Set: title, size<br/>4/8/16 players<br/>challenge pool"]
    C --> D["POST /api/compiler/tournaments/"]
    D --> E["Tournament created<br/>Join code generated"]

    E --> F["Share join code<br/>with students"]
    F --> G["Students join<br/>POST /tournaments/join/"]

    G --> H{"Tournament full?"}
    H -->|No| G
    H -->|Yes| I["Host clicks Start"]
    I --> J["generate_bracket()<br/>Seed players by ELO"]

    J --> K["Round 1 Matches"]
    K --> L["Match 1: P1 vs P2"]
    K --> M["Match 2: P3 vs P4"]
    K --> N["Match 3: P5 vs P6"]
    K --> O["Match 4: P7 vs P8"]

    L --> P["Winners advance"]
    M --> P
    N --> P
    O --> P

    P --> Q["Semi-Finals"]
    Q --> R["Finals"]
    R --> S["🏆 Champion!<br/>Placements assigned<br/>Rank points awarded"]

    L -.->|"Spectators watch"| T["ws/spectate/<id>/"]
    Q -.->|"Spectators watch"| T
    R -.->|"Spectators watch"| T
```

---

### 3.7 Classroom & Section Flow

```mermaid
flowchart TD
    A["👨‍🏫 Teacher"] --> B["Teacher Dashboard"]
    B --> C["Create Section"]
    C --> D["Set: Program BSIT/BSCS<br/>Year Level, Section #"]
    D --> E["POST /api/classroom/sections/"]
    E --> F["Section created<br/>Join code: A3X9K2"]

    F --> G["Share code with class"]
    G --> H["👨‍🎓 Students join<br/>POST /sections/join/"]
    H --> I["Students appear in<br/>section member list"]

    B --> J["Create Assignment"]
    J --> K{"Assignment Type?"}
    K -->|"Quiz"| L["Link to Subject +<br/>Difficulty + Questions"]
    K -->|"Tournament"| M["Link to Tournament"]
    K -->|"Code Challenge"| N["Link to CodeChallenge"]

    L --> O["POST /sections/<id>/assign/"]
    M --> O
    N --> O
    O --> P["Students see assignment<br/>in SectionPage"]
    P --> Q["Complete assignment"]
    Q --> R["Teacher views results<br/>in dashboard"]

    I -.-> S["Section Chat<br/>ws/section-chat/<id>/"]
```

---

### 3.8 Daily Challenge Flow

```mermaid
flowchart TD
    A["⏰ New Day"] --> B["System auto-selects<br/>today's challenge"]
    B --> C["Difficulty cycles:<br/>Day 1: Easy<br/>Day 2: Medium<br/>Day 3: Hard<br/>Day 4: Easy..."]

    D["👨‍🎓 Student"] --> E["Daily Challenge Page"]
    E --> F["GET /api/compiler/daily/"]
    F --> G["View challenge +<br/>sample test cases"]
    G --> H["Write solution"]
    H --> I["POST /api/compiler/daily/submit/"]
    I --> J["Judge0 evaluates<br/>all test cases"]

    J --> K{"All tests pass?"}
    K -->|"Yes"| L["✅ Solved!"]
    L --> M["daily_streak += 1<br/>rank_points awarded"]
    K -->|"No"| N["❌ Try again"]
    N --> H

    M --> O{"best_daily_streak<br/>beaten?"}
    O -->|Yes| P["🏆 New record!"]
    O -->|No| Q["Keep going!"]
```

---

### 3.9 Study Buddy Pairing Flow

```mermaid
flowchart TD
    A["👨‍🎓 Student A"] --> B["Study Buddy Page"]
    B --> C["Set interests:<br/>Python, Web Dev, etc."]
    C --> D["Mark: Available for pairing"]
    D --> E["PUT /api/auth/me/"]

    E --> F["Browse available students"]
    F --> G["GET /api/pairing/available/"]
    G --> H["Filtered by<br/>shared interests"]
    H --> I["Send request to Student B"]
    I --> J["POST /api/pairing/request/"]

    J --> K["👨‍🎓 Student B receives<br/>notification"]
    K --> L{"Accept or Decline?"}
    L -->|Accept| M["✅ Now study buddies!<br/>Can message each other"]
    L -->|Decline| N["❌ Request closed"]
```

---

### 3.10 Social & Communication Flow

```mermaid
flowchart TD
    subgraph Social["📱 Social Feed"]
        A["Create Post<br/>text + image"] --> B["POST /api/social/posts/"]
        B --> C["Appears in feed"]
        C --> D["Others like/comment"]
    end

    subgraph Blog["📰 Blog"]
        E["Teacher writes<br/>announcement"] --> F["POST /api/blog/create/"]
        F --> G["Published to<br/>all students"]
    end

    subgraph DM["💬 Messaging"]
        H["Start conversation"] --> I["POST /api/messaging/create/"]
        I --> J["Send messages<br/>POST /messaging/<id>/send/"]
    end

    subgraph Chat["🗨️ Real-time Chat"]
        K["Section Chat<br/>ws/section-chat/<id>/"]
        L["Tournament Chat<br/>ws/tournament-chat/<id>/"]
    end
```

---

### 3.11 Complete User Journey

```mermaid
flowchart LR
    A["Register"] --> B["Login"]
    B --> C["Dashboard"]

    C --> D["📝 Take Quiz"]
    C --> E["💻 Code Compiler"]
    C --> F["⚔️ Code Battle"]
    C --> G["🏆 Tournament"]
    C --> H["📅 Daily Challenge"]
    C --> I["⌨️ Typing Contest"]
    C --> J["🏰 Tower Defense"]

    D --> K["📊 Results"]
    E --> K
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K

    K --> L["🏅 Leaderboard<br/>ELO + Rank Points"]
    K --> M["🎖️ Achievements<br/>Unlocked"]
    K --> N["👤 Profile<br/>Stats + Heatmap"]

    C --> O["💬 Messages"]
    C --> P["📱 Social Feed"]
    C --> Q["📰 Blog"]
    C --> R["🤝 Study Buddy"]
    C --> S["📦 Lost & Found"]
    C --> T["📊 Grade Calculator"]
```

---

### 3.12 Data Flow Overview

```mermaid
flowchart TD
    subgraph User["👤 User Actions"]
        Q["Take Quiz"]
        CB["Code Battle"]
        DC["Daily Challenge"]
        TC["Typing Contest"]
        TD["Tower Defense"]
    end

    subgraph Processing["⚙️ Processing"]
        J0["Judge0<br/>Code Execution"]
        AI["Gemini AI<br/>Quiz Generation"]
        ELO["ELO Calculator<br/>Rating System"]
    end

    subgraph Storage["🗄️ Data Storage"]
        QS["QuizSession<br/>QuizAnswer"]
        BS["BattleSession<br/>PvPBattle"]
        DS["DailySubmission"]
        TR["TypingResult"]
        TDS["TowerDefenseScore"]
        PS["PlayerStats<br/>Leaderboard"]
    end

    Q --> QS
    QS --> PS

    CB --> J0
    J0 --> BS
    BS --> ELO
    ELO --> PS

    DC --> J0
    J0 --> DS
    DS --> PS

    TC --> TR
    TR --> PS

    TD --> TDS
    TDS --> PS

    AI -.->|"Generate Questions"| Q
```

---

### 3.13 Notification System Flow

```mermaid
flowchart TD
    A["Events trigger notifications"]

    A --> B["Battle invite received"]
    A --> C["Pairing request received"]
    A --> D["Tournament match ready"]
    A --> E["Assignment posted"]

    B --> F["NotificationConsumer<br/>ws/notifications/"]
    C --> F
    D --> F
    E --> F

    F --> G["Push to user's browser<br/>in real-time"]
    G --> H["🔔 Notification bell<br/>shows count"]
    H --> I["Click to view details"]

    F --> J["Also stored in DB<br/>GET /api/compiler/notifications/"]
    J --> K["Mark as read<br/>POST /notifications/read/"]
```

---

### 3.14 ELO Rating System Flow

```mermaid
flowchart TD
    A["PvP Battle Ends"] --> B["Determine Winner"]

    B --> C["Calculate Expected Score<br/>E = 1 / (1 + 10^((Opp - Self) / 400))"]

    C --> D{"Result?"}
    D -->|"Win"| E["Actual = 1.0<br/>pvp_wins += 1"]
    D -->|"Loss"| F["Actual = 0.0<br/>pvp_losses += 1"]
    D -->|"Draw"| G["Actual = 0.5<br/>pvp_draws += 1"]

    E --> H["New ELO = Old + 32 × (Actual - Expected)"]
    F --> H
    G --> H

    H --> I["Update PlayerStats"]
    I --> J["Assign Tier"]
    J --> K["🥉 Bronze: 0+"]
    J --> L["🥈 Silver: 800+"]
    J --> M["🥇 Gold: 1200+"]
    J --> N["💎 Diamond: 1600+"]
    J --> O["👑 Master: 2000+"]
```

---

*This document contains all flowcharts, API documentation, and problem-solution analysis for the Nexora system.*

*Last updated: February 15, 2026*
