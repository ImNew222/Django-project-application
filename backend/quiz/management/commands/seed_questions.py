from django.core.management.base import BaseCommand
from quiz.models import Subject, Question


class Command(BaseCommand):
    help = 'Seed the database with sample IT quiz questions'

    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Seeding quiz data...\n')

        # Create subjects
        subjects_data = [
            ('Programming', 'Questions about programming concepts and languages', '💻'),
            ('Networking', 'Questions about computer networks and protocols', '🌐'),
            ('Database', 'Questions about databases and SQL', '🗄️'),
            ('Web Development', 'Questions about HTML, CSS, JavaScript, and web tech', '🌍'),
            ('IT Fundamentals', 'General IT knowledge and concepts', '🖥️'),
        ]

        subjects = {}
        for name, desc, icon in subjects_data:
            subject, created = Subject.objects.get_or_create(
                name=name, defaults={'description': desc, 'icon': icon}
            )
            subjects[name] = subject
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  {icon} {name}: {status}')

        # Questions data: (subject, difficulty, text, a, b, c, d, correct)
        questions_data = [
            # ===== PROGRAMMING - Beginner =====
            ('Programming', 'beginner', 'What does HTML stand for?',
             'Hyper Text Markup Language', 'High Tech Modern Language',
             'Hyper Transfer Markup Language', 'Home Tool Markup Language', 'A'),

            ('Programming', 'beginner', 'Which symbol is used for single-line comments in Python?',
             '//', '#', '--', '/*', 'B'),

            ('Programming', 'beginner', 'What is the correct file extension for Python files?',
             '.python', '.pt', '.py', '.pn', 'C'),

            ('Programming', 'beginner', 'Which of the following is NOT a programming language?',
             'Python', 'Java', 'HTML', 'C++', 'C'),

            ('Programming', 'beginner', 'What does the print() function do in Python?',
             'Prints a physical document', 'Displays output on the screen',
             'Saves data to a file', 'Creates a new variable', 'B'),

            ('Programming', 'beginner', 'Which data type is used to store True or False?',
             'String', 'Integer', 'Boolean', 'Float', 'C'),

            ('Programming', 'beginner', 'What is a variable in programming?',
             'A fixed value that never changes', 'A container that stores data',
             'A type of loop', 'A function name', 'B'),

            # ===== PROGRAMMING - Intermediate =====
            ('Programming', 'intermediate', 'What is the time complexity of binary search?',
             'O(n)', 'O(n²)', 'O(log n)', 'O(1)', 'C'),

            ('Programming', 'intermediate', 'What is polymorphism in OOP?',
             'Having multiple constructors', 'Objects taking many forms',
             'Hiding implementation details', 'Inheriting from multiple classes', 'B'),

            ('Programming', 'intermediate', 'What is the difference between == and === in JavaScript?',
             '=== checks type and value, == only checks value', 'They are the same',
             '== is for strings, === is for numbers', '=== is deprecated', 'A'),

            ('Programming', 'intermediate', 'What does API stand for?',
             'Application Programming Interface', 'Applied Program Integration',
             'Automated Process Input', 'Application Process Integration', 'A'),

            ('Programming', 'intermediate', 'Which sorting algorithm has the best average time complexity?',
             'Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort', 'C'),

            ('Programming', 'intermediate', 'What is recursion?',
             'A loop that runs forever', 'A function that calls itself',
             'A type of data structure', 'A way to define variables', 'B'),

            # ===== PROGRAMMING - Hard =====
            ('Programming', 'hard', 'What is the space complexity of a recursive Fibonacci implementation?',
             'O(1)', 'O(n)', 'O(n²)', 'O(2^n)', 'B'),

            ('Programming', 'hard', 'What design pattern uses a single instance of a class?',
             'Factory', 'Observer', 'Singleton', 'Strategy', 'C'),

            ('Programming', 'hard', 'What is a closure in programming?',
             'A way to close a file', 'A function that captures variables from its enclosing scope',
             'A type of error handling', 'A method to end a program', 'B'),

            ('Programming', 'hard', 'What is the difference between a stack and a queue?',
             'Stack is FIFO, Queue is LIFO', 'Stack is LIFO, Queue is FIFO',
             'They are the same', 'Stack uses linked list, Queue uses array', 'B'),

            ('Programming', 'hard', 'What is dynamic programming?',
             'Programming that changes at runtime', 'Breaking problems into overlapping subproblems and caching results',
             'A type of web development', 'Programming with dynamic typing', 'B'),

            # ===== NETWORKING - Beginner =====
            ('Networking', 'beginner', 'What does IP stand for?',
             'Internet Protocol', 'Internal Program', 'Internet Provider', 'Integrated Platform', 'A'),

            ('Networking', 'beginner', 'What device connects multiple computers in a network?',
             'Monitor', 'Router', 'Printer', 'Scanner', 'B'),

            ('Networking', 'beginner', 'What does LAN stand for?',
             'Large Area Network', 'Local Area Network', 'Long Access Network', 'Linked Area Node', 'B'),

            ('Networking', 'beginner', 'What is Wi-Fi?',
             'A programming language', 'Wireless networking technology',
             'A type of cable', 'A web browser', 'B'),

            ('Networking', 'beginner', 'What port does HTTP typically use?',
             '21', '25', '80', '443', 'C'),

            # ===== NETWORKING - Intermediate =====
            ('Networking', 'intermediate', 'What is a subnet mask used for?',
             'To hide your IP address', 'To divide a network into smaller segments',
             'To encrypt data', 'To speed up the internet', 'B'),

            ('Networking', 'intermediate', 'Which protocol is used for secure web browsing?',
             'HTTP', 'FTP', 'HTTPS', 'SMTP', 'C'),

            ('Networking', 'intermediate', 'What does DNS do?',
             'Encrypts network traffic', 'Translates domain names to IP addresses',
             'Manages network cables', 'Creates firewalls', 'B'),

            ('Networking', 'intermediate', 'What is the OSI model?',
             'A programming framework', 'A 7-layer network communication model',
             'A type of router', 'An operating system', 'B'),

            ('Networking', 'intermediate', 'What is a firewall?',
             'A physical wall in a server room', 'A security system that monitors network traffic',
             'A type of cable', 'A networking protocol', 'B'),

            # ===== NETWORKING - Hard =====
            ('Networking', 'hard', 'What is the difference between TCP and UDP?',
             'TCP is faster than UDP', 'TCP is connection-oriented, UDP is connectionless',
             'UDP is more reliable', 'They are the same protocol', 'B'),

            ('Networking', 'hard', 'What is a VLAN?',
             'A type of VPN', 'A virtual local area network that segments traffic logically',
             'A virus scanner', 'A type of firewall', 'B'),

            ('Networking', 'hard', 'What is the purpose of ARP?',
             'To assign IP addresses', 'To map IP addresses to MAC addresses',
             'To encrypt network packets', 'To route traffic between networks', 'B'),

            # ===== DATABASE - Beginner =====
            ('Database', 'beginner', 'What does SQL stand for?',
             'Structured Query Language', 'Simple Question Language',
             'System Query Logic', 'Standard Query Layout', 'A'),

            ('Database', 'beginner', 'What is a primary key?',
             'The first column in a table', 'A unique identifier for each row',
             'The password to access the database', 'A type of database', 'B'),

            ('Database', 'beginner', 'Which SQL command is used to retrieve data?',
             'GET', 'FETCH', 'SELECT', 'RETRIEVE', 'C'),

            ('Database', 'beginner', 'What is a database table?',
             'A physical table for servers', 'An organized collection of data in rows and columns',
             'A type of spreadsheet', 'A file format', 'B'),

            ('Database', 'beginner', 'Which command adds new data to a table?',
             'ADD', 'CREATE', 'INSERT', 'PUT', 'C'),

            # ===== DATABASE - Intermediate =====
            ('Database', 'intermediate', 'What is a foreign key?',
             'A key from another country', 'A field that references the primary key of another table',
             'An encrypted key', 'The second primary key', 'B'),

            ('Database', 'intermediate', 'What is normalization in databases?',
             'Making the database faster', 'Organizing data to reduce redundancy',
             'Adding more tables', 'Encrypting all data', 'B'),

            ('Database', 'intermediate', 'What does JOIN do in SQL?',
             'Merges two databases', 'Combines rows from two or more tables based on a related column',
             'Creates a new table', 'Deletes duplicate rows', 'B'),

            ('Database', 'intermediate', 'What is an index in a database?',
             'The first row of a table', 'A data structure that improves query speed',
             'A type of primary key', 'A backup system', 'B'),

            # ===== DATABASE - Hard =====
            ('Database', 'hard', 'What is ACID in databases?',
             'A type of database engine', 'Atomicity, Consistency, Isolation, Durability',
             'A query optimization technique', 'A security protocol', 'B'),

            ('Database', 'hard', 'What is a database transaction?',
             'A payment process', 'A sequence of operations treated as a single unit of work',
             'A type of query', 'A backup procedure', 'B'),

            ('Database', 'hard', 'What is the difference between HAVING and WHERE in SQL?',
             'They are the same', 'HAVING filters groups after GROUP BY, WHERE filters rows before',
             'WHERE is faster', 'HAVING is deprecated', 'B'),

            # ===== WEB DEVELOPMENT - Beginner =====
            ('Web Development', 'beginner', 'What does CSS stand for?',
             'Computer Style Sheets', 'Cascading Style Sheets',
             'Creative Style System', 'Colorful Style Sheets', 'B'),

            ('Web Development', 'beginner', 'What tag is used for the largest heading in HTML?',
             '<heading>', '<h6>', '<h1>', '<head>', 'C'),

            ('Web Development', 'beginner', 'What does a web browser do?',
             'Creates websites', 'Displays web pages',
             'Stores data', 'Sends emails', 'B'),

            ('Web Development', 'beginner', 'Which HTML tag creates a hyperlink?',
             '<link>', '<a>', '<href>', '<url>', 'B'),

            ('Web Development', 'beginner', 'What is JavaScript primarily used for?',
             'Styling web pages', 'Adding interactivity to web pages',
             'Creating databases', 'Sending emails', 'B'),

            # ===== WEB DEVELOPMENT - Intermediate =====
            ('Web Development', 'intermediate', 'What is responsive web design?',
             'A fast-loading website', 'Design that adapts to different screen sizes',
             'A type of framework', 'A JavaScript library', 'B'),

            ('Web Development', 'intermediate', 'What is the purpose of React.js?',
             'Server-side programming', 'Building user interfaces with components',
             'Database management', 'Styling web pages', 'B'),

            ('Web Development', 'intermediate', 'What is REST in the context of APIs?',
             'A sleep mode for servers', 'An architectural style for designing networked applications',
             'A JavaScript framework', 'A database type', 'B'),

            ('Web Development', 'intermediate', 'What is the difference between GET and POST requests?',
             'GET is faster', 'GET retrieves data, POST sends data to the server',
             'POST is deprecated', 'They are identical', 'B'),

            # ===== WEB DEVELOPMENT - Hard =====
            ('Web Development', 'hard', 'What is CORS?',
             'A CSS framework', 'Cross-Origin Resource Sharing — browser security feature',
             'A React library', 'A JavaScript compiler', 'B'),

            ('Web Development', 'hard', 'What is server-side rendering (SSR)?',
             'Rendering images on a server', 'Generating HTML on the server instead of in the browser',
             'A type of caching', 'A database technique', 'B'),

            ('Web Development', 'hard', 'What is a WebSocket?',
             'A type of electrical socket', 'A protocol for full-duplex communication over a single connection',
             'A web framework', 'A type of API', 'B'),

            # ===== IT FUNDAMENTALS - Beginner =====
            ('IT Fundamentals', 'beginner', 'What does CPU stand for?',
             'Central Processing Unit', 'Computer Personal Unit',
             'Central Program Utility', 'Core Processing Unit', 'A'),

            ('IT Fundamentals', 'beginner', 'What is RAM used for?',
             'Permanent storage', 'Temporary working memory',
             'Internet connection', 'Graphics rendering', 'B'),

            ('IT Fundamentals', 'beginner', 'What is an operating system?',
             'A web browser', 'Software that manages computer hardware and software resources',
             'A programming language', 'An antivirus program', 'B'),

            ('IT Fundamentals', 'beginner', 'What does USB stand for?',
             'Universal Serial Bus', 'United System Bridge',
             'Universal System Backup', 'Unified Serial Buffer', 'A'),

            ('IT Fundamentals', 'beginner', 'What is the purpose of an antivirus program?',
             'To speed up the computer', 'To protect against malicious software',
             'To create websites', 'To manage files', 'B'),

            # ===== IT FUNDAMENTALS - Intermediate =====
            ('IT Fundamentals', 'intermediate', 'What is cloud computing?',
             'Computing in the sky', 'Delivering computing services over the internet',
             'A weather prediction system', 'A type of hardware', 'B'),

            ('IT Fundamentals', 'intermediate', 'What is virtualization?',
             'Virtual reality', 'Running multiple virtual machines on one physical machine',
             'Cloud storage', 'A graphics technique', 'B'),

            ('IT Fundamentals', 'intermediate', 'What does SSD stand for?',
             'System Software Drive', 'Solid State Drive',
             'Super Speed Disk', 'Standard Storage Device', 'B'),

            ('IT Fundamentals', 'intermediate', 'What is version control?',
             'Tracking different versions of an operating system', 'A system that records changes to files over time',
             'A backup system', 'A type of database', 'B'),

            # ===== IT FUNDAMENTALS - Hard =====
            ('IT Fundamentals', 'hard', 'What is containerization in IT?',
             'Putting servers in containers', 'Packaging applications with their dependencies to run in isolated environments',
             'A type of virtualization', 'A security protocol', 'B'),

            ('IT Fundamentals', 'hard', 'What is the difference between authentication and authorization?',
             'They mean the same thing', 'Authentication verifies identity, authorization determines access permissions',
             'Authentication is for users, authorization is for computers', 'Authorization comes before authentication', 'B'),

            ('IT Fundamentals', 'hard', 'What is DevOps?',
             'A programming language', 'A set of practices combining development and operations for faster delivery',
             'A type of server', 'A database management system', 'B'),
        ]

        created_count = 0
        for subject_name, difficulty, text, a, b, c, d, correct in questions_data:
            _, created = Question.objects.get_or_create(
                subject=subjects[subject_name],
                text=text,
                defaults={
                    'difficulty': difficulty,
                    'choice_a': a,
                    'choice_b': b,
                    'choice_c': c,
                    'choice_d': d,
                    'correct_answer': correct,
                }
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Done! Created {created_count} new questions across {len(subjects)} subjects.'
        ))

        # Summary
        for name, subject in subjects.items():
            count = subject.questions.count()
            self.stdout.write(f'  {subject.icon} {name}: {count} questions')
