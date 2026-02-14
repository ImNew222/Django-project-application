from django.core.management.base import BaseCommand
from typingcontest.models import TypingText


class Command(BaseCommand):
    help = 'Seed typing contest texts'

    def handle(self, *args, **kwargs):
        texts = [
            # Easy texts
            {
                'title': 'The Quick Brown Fox',
                'difficulty': 'easy',
                'content': 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet. It has been used for typing practice for many years.',
            },
            {
                'title': 'Hello World',
                'difficulty': 'easy',
                'content': 'Hello world. This is my first program. I am learning to type fast and accurately. Practice makes perfect. Keep typing every day.',
            },
            {
                'title': 'School Day',
                'difficulty': 'easy',
                'content': 'Today is a great day at school. We learned about computers and how they work. The teacher showed us how to write code. It was very fun and I want to learn more.',
            },
            {
                'title': 'Simple Code',
                'difficulty': 'easy',
                'content': 'To write code you need a computer. Open your text editor and start typing. Save the file and run it. If there are no errors your program will work. Debug any problems you find.',
            },
            # Medium texts
            {
                'title': 'Programming Basics',
                'difficulty': 'medium',
                'content': 'Programming is the process of creating instructions for a computer to follow. These instructions are written in programming languages like Python, Java, or JavaScript. A good programmer writes clean, readable code that is easy to maintain and debug. Variables store data, loops repeat actions, and functions organize code into reusable blocks.',
            },
            {
                'title': 'The Internet',
                'difficulty': 'medium',
                'content': 'The internet is a global network that connects millions of computers around the world. It uses protocols like TCP/IP to transfer data between devices. Web browsers send HTTP requests to servers, which respond with HTML, CSS, and JavaScript files. These files are rendered by the browser to display web pages that we interact with daily.',
            },
            {
                'title': 'Database Systems',
                'difficulty': 'medium',
                'content': 'A database is an organized collection of structured data stored electronically. Relational databases use SQL to query and manipulate data stored in tables with rows and columns. NoSQL databases provide flexible schemas for unstructured data. Database management systems handle concurrency, backups, and data integrity to keep information safe and accessible.',
            },
            {
                'title': 'Cybersecurity',
                'difficulty': 'medium',
                'content': 'Cybersecurity is the practice of protecting systems, networks, and programs from digital attacks. These attacks are usually aimed at accessing, changing, or destroying sensitive information. Implementing effective security measures requires multiple layers of protection including firewalls, encryption, and authentication. Users should practice strong password habits and be cautious of phishing attempts.',
            },
            # Hard texts
            {
                'title': 'Algorithm Complexity',
                'difficulty': 'hard',
                'content': 'Algorithm complexity analysis is a fundamental concept in computer science that measures the efficiency of algorithms in terms of time and space. Big O notation describes the upper bound of an algorithm\'s growth rate, helping developers choose the most appropriate solution for a given problem. For example, a binary search algorithm has O(log n) time complexity, making it significantly more efficient than a linear search with O(n) complexity when dealing with large, sorted datasets. Understanding these trade-offs is essential for building scalable software systems.',
            },
            {
                'title': 'Machine Learning',
                'difficulty': 'hard',
                'content': 'Machine learning is a subset of artificial intelligence that enables systems to automatically learn and improve from experience without being explicitly programmed. Supervised learning uses labeled training data to make predictions, while unsupervised learning discovers hidden patterns in unlabeled data. Deep learning, inspired by neural networks in the human brain, has revolutionized fields like natural language processing and computer vision. These algorithms require substantial computational resources and large datasets to achieve high accuracy in real-world applications.',
            },
            {
                'title': 'Cloud Computing',
                'difficulty': 'hard',
                'content': 'Cloud computing delivers computing services including servers, storage, databases, networking, and software over the internet. Infrastructure as a Service provides virtualized computing resources, Platform as a Service offers development and deployment environments, and Software as a Service delivers complete applications to end users. Containerization technologies like Docker and orchestration platforms like Kubernetes have transformed how applications are deployed and scaled. Microservices architecture breaks down monolithic applications into smaller, independently deployable services that communicate through APIs.',
            },
        ]

        created_count = 0
        for text_data in texts:
            _, created = TypingText.objects.get_or_create(
                title=text_data['title'],
                defaults=text_data,
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} typing texts ({TypingText.objects.count()} total)'))
