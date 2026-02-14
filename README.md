# ScholarHub - Comprehensive Learning Management System

ScholarHub is a modern, feature-rich Learning Management System (LMS) designed to enhance the educational experience for students and teachers. It combines traditional classroom management tools with gamified learning elements like quizzes, coding battles, and typing contests.

## Key Features

-   **Classroom Management**: Teachers can create sections, post announcements, and manage student rosters.
-   **Gamified Quizzes**: Interactive quizzes with leaderboards to make learning fun.
-   **Code Compiler**: Built-in online code compiler supporting multiple languages (Python, C++, Java, etc.), powered by Judge0.
-   **Coding Battles**: Real-time coding competitions between students.
-   **Typing Contests**: Improve typing speed and accuracy with competitive typing tests.
-   **Social Features**: Profiles, friend systems, and activity feeds to foster a learning community.
-   **Analytics**: Detailed performance tracking for students and teachers.

## Tech Stack

-   **Frontend**: React (Vite), Tailwind CSS, Framer Motion
-   **Backend**: Django Rest Framework, Django Channels (WebSockets)
-   **Database**: SQLite (Development), PostgreSQL (Production ready)
-   **Code Execution**: Judge0 (Self-hosted via Docker)

## Getting Started

### Prerequisites

-   Python 3.10+
-   Node.js 18+
-   Docker (for Judge0)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ImNew222/Django-project-application.git
    cd Django-project-application
    ```

2.  **Setup Backend**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    
    # Create .env file with your secrets (see settings.py for required vars)
    # python manage.py migrate
    # python manage.py runserver
    ```

3.  **Setup Frontend**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

4.  **Run Judge0 (Optional, for Compiler)**
    ```bash
    docker compose up -d
    ```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is open-source and available under the MIT License.
