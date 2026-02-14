"""
Seed the database with starter coding challenges.
Usage:  python manage.py seed_challenges
"""
from django.core.management.base import BaseCommand
from compiler.models import CodeChallenge, TestCase


CHALLENGES = [
    # ── EASY ──────────────────────────────────────────────────
    {
        'title': 'Two Sum',
        'slug': 'two-sum',
        'difficulty': 'easy',
        'time_limit_minutes': 20,
        'description': (
            '## Two Sum\n\n'
            'Given two integers on separate lines, print their sum.\n\n'
            '### Input\n'
            'Two lines, each containing a single integer.\n\n'
            '### Output\n'
            'Print a single integer — the sum of the two numbers.\n\n'
            '### Example\n'
            '```\nInput:\n3\n5\n\nOutput:\n8\n```'
        ),
        'starter_python': '# Read two numbers and print their sum\na = int(input())\nb = int(input())\n# Your code here\n',
        'starter_javascript': '// Read input from stdin\nconst lines = require("fs").readFileSync("/dev/stdin", "utf8").trim().split("\\n");\nconst a = parseInt(lines[0]);\nconst b = parseInt(lines[1]);\n// Your code here\n',
        'starter_cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    // Your code here\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        // Your code here\n    }\n}\n',
        'tests': [
            {'input': '3\n5', 'output': '8', 'sample': True},
            {'input': '10\n20', 'output': '30', 'sample': True},
            {'input': '0\n0', 'output': '0', 'sample': False},
            {'input': '-5\n15', 'output': '10', 'sample': False},
            {'input': '999\n1', 'output': '1000', 'sample': False},
        ],
    },
    {
        'title': 'FizzBuzz',
        'slug': 'fizzbuzz',
        'difficulty': 'easy',
        'time_limit_minutes': 20,
        'description': (
            '## FizzBuzz\n\n'
            'Given an integer **n**, print numbers from 1 to n.\n'
            'But for multiples of 3 print `Fizz`, for multiples of 5 print `Buzz`, '
            'and for multiples of both print `FizzBuzz`.\n\n'
            '### Input\n'
            'A single integer n (1 ≤ n ≤ 100).\n\n'
            '### Output\n'
            'Print n lines, each containing the number or Fizz/Buzz/FizzBuzz.\n\n'
            '### Example\n'
            '```\nInput:\n5\n\nOutput:\n1\n2\nFizz\n4\nBuzz\n```'
        ),
        'starter_python': 'n = int(input())\n# Print FizzBuzz from 1 to n\n',
        'starter_javascript': 'const n = parseInt(require("fs").readFileSync("/dev/stdin", "utf8").trim());\n// Print FizzBuzz from 1 to n\n',
        'starter_cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Print FizzBuzz from 1 to n\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        int n = new Scanner(System.in).nextInt();\n        // Print FizzBuzz from 1 to n\n    }\n}\n',
        'tests': [
            {'input': '5', 'output': '1\n2\nFizz\n4\nBuzz', 'sample': True},
            {'input': '15', 'output': '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', 'sample': True},
            {'input': '1', 'output': '1', 'sample': False},
            {'input': '3', 'output': '1\n2\nFizz', 'sample': False},
        ],
    },
    {
        'title': 'Reverse String',
        'slug': 'reverse-string',
        'difficulty': 'easy',
        'time_limit_minutes': 15,
        'description': (
            '## Reverse String\n\n'
            'Given a string, print it reversed.\n\n'
            '### Input\n'
            'A single line containing a string.\n\n'
            '### Output\n'
            'Print the reversed string.\n\n'
            '### Example\n'
            '```\nInput:\nhello\n\nOutput:\nolleh\n```'
        ),
        'starter_python': 's = input()\n# Print the reversed string\n',
        'starter_javascript': 'const s = require("fs").readFileSync("/dev/stdin", "utf8").trim();\n// Print the reversed string\n',
        'starter_cpp': '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    // Print the reversed string\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        // Print the reversed string\n    }\n}\n',
        'tests': [
            {'input': 'hello', 'output': 'olleh', 'sample': True},
            {'input': 'Nexora', 'output': 'aroxeN', 'sample': True},
            {'input': 'a', 'output': 'a', 'sample': False},
            {'input': 'racecar', 'output': 'racecar', 'sample': False},
            {'input': '12345', 'output': '54321', 'sample': False},
        ],
    },

    # ── MEDIUM ────────────────────────────────────────────────
    {
        'title': 'Palindrome Check',
        'slug': 'palindrome-check',
        'difficulty': 'medium',
        'time_limit_minutes': 25,
        'description': (
            '## Palindrome Check\n\n'
            'Given a string, determine if it is a palindrome (reads the same forwards and backwards). '
            'Ignore case and non-alphanumeric characters.\n\n'
            '### Input\n'
            'A single line containing a string.\n\n'
            '### Output\n'
            'Print `true` if the string is a palindrome, `false` otherwise.\n\n'
            '### Example\n'
            '```\nInput:\nA man, a plan, a canal: Panama\n\nOutput:\ntrue\n```'
        ),
        'starter_python': 's = input()\n# Check if s is a palindrome (ignore case and non-alphanumeric)\n',
        'starter_javascript': 'const s = require("fs").readFileSync("/dev/stdin", "utf8").trim();\n// Check if s is a palindrome\n',
        'starter_cpp': '#include <iostream>\n#include <string>\n#include <cctype>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    // Check if palindrome\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        // Check if palindrome\n    }\n}\n',
        'tests': [
            {'input': 'A man, a plan, a canal: Panama', 'output': 'true', 'sample': True},
            {'input': 'hello', 'output': 'false', 'sample': True},
            {'input': 'racecar', 'output': 'true', 'sample': False},
            {'input': 'Was it a car or a cat I saw?', 'output': 'true', 'sample': False},
            {'input': 'No lemon, no melon', 'output': 'true', 'sample': False},
            {'input': 'python', 'output': 'false', 'sample': False},
        ],
    },
    {
        'title': 'Fibonacci Sequence',
        'slug': 'fibonacci-sequence',
        'difficulty': 'medium',
        'time_limit_minutes': 25,
        'description': (
            '## Fibonacci Sequence\n\n'
            'Given an integer **n**, print the first n Fibonacci numbers, separated by spaces.\n'
            'The Fibonacci sequence starts with 0, 1, 1, 2, 3, 5, 8, ...\n\n'
            '### Input\n'
            'A single integer n (1 ≤ n ≤ 30).\n\n'
            '### Output\n'
            'Print n Fibonacci numbers separated by spaces.\n\n'
            '### Example\n'
            '```\nInput:\n7\n\nOutput:\n0 1 1 2 3 5 8\n```'
        ),
        'starter_python': 'n = int(input())\n# Print first n Fibonacci numbers\n',
        'starter_javascript': 'const n = parseInt(require("fs").readFileSync("/dev/stdin", "utf8").trim());\n// Print first n Fibonacci numbers\n',
        'starter_cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Print Fibonacci\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        int n = new Scanner(System.in).nextInt();\n        // Print Fibonacci\n    }\n}\n',
        'tests': [
            {'input': '7', 'output': '0 1 1 2 3 5 8', 'sample': True},
            {'input': '1', 'output': '0', 'sample': True},
            {'input': '2', 'output': '0 1', 'sample': False},
            {'input': '10', 'output': '0 1 1 2 3 5 8 13 21 34', 'sample': False},
            {'input': '5', 'output': '0 1 1 2 3', 'sample': False},
        ],
    },
    {
        'title': 'Anagram Check',
        'slug': 'anagram-check',
        'difficulty': 'medium',
        'time_limit_minutes': 25,
        'description': (
            '## Anagram Check\n\n'
            'Given two strings on separate lines, determine if they are anagrams of each other. '
            'Ignore case and spaces.\n\n'
            '### Input\n'
            'Two lines, each containing a string.\n\n'
            '### Output\n'
            'Print `true` if they are anagrams, `false` otherwise.\n\n'
            '### Example\n'
            '```\nInput:\nlisten\nsilent\n\nOutput:\ntrue\n```'
        ),
        'starter_python': 'a = input()\nb = input()\n# Check if a and b are anagrams\n',
        'starter_javascript': 'const lines = require("fs").readFileSync("/dev/stdin", "utf8").trim().split("\\n");\nconst a = lines[0], b = lines[1];\n// Check anagram\n',
        'starter_cpp': '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string a, b;\n    getline(cin, a);\n    getline(cin, b);\n    // Check anagram\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String a = sc.nextLine();\n        String b = sc.nextLine();\n        // Check anagram\n    }\n}\n',
        'tests': [
            {'input': 'listen\nsilent', 'output': 'true', 'sample': True},
            {'input': 'hello\nworld', 'output': 'false', 'sample': True},
            {'input': 'Dormitory\nDirty room', 'output': 'true', 'sample': False},
            {'input': 'The eyes\nThey see', 'output': 'true', 'sample': False},
            {'input': 'abc\nabd', 'output': 'false', 'sample': False},
        ],
    },

    # ── HARD ──────────────────────────────────────────────────
    {
        'title': 'Balanced Brackets',
        'slug': 'balanced-brackets',
        'difficulty': 'hard',
        'time_limit_minutes': 30,
        'description': (
            '## Balanced Brackets\n\n'
            'Given a string containing only brackets `()[]{}`, '
            'determine if the brackets are balanced.\n\n'
            '### Input\n'
            'A single line containing a string of brackets.\n\n'
            '### Output\n'
            'Print `true` if the brackets are balanced, `false` otherwise.\n\n'
            '### Example\n'
            '```\nInput:\n{[()]}\n\nOutput:\ntrue\n```'
        ),
        'starter_python': 's = input()\n# Check if brackets are balanced\n',
        'starter_javascript': 'const s = require("fs").readFileSync("/dev/stdin", "utf8").trim();\n// Check balanced brackets\n',
        'starter_cpp': '#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    // Check balanced brackets\n    return 0;\n}\n',
        'starter_java': 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        // Check balanced brackets\n    }\n}\n',
        'tests': [
            {'input': '{[()]}', 'output': 'true', 'sample': True},
            {'input': '{[(])}', 'output': 'false', 'sample': True},
            {'input': '', 'output': 'true', 'sample': False},
            {'input': '((()))', 'output': 'true', 'sample': False},
            {'input': '([)]', 'output': 'false', 'sample': False},
            {'input': '{{}[][()]}', 'output': 'true', 'sample': False},
        ],
    },
    {
        'title': 'Caesar Cipher',
        'slug': 'caesar-cipher',
        'difficulty': 'hard',
        'time_limit_minutes': 30,
        'description': (
            '## Caesar Cipher\n\n'
            'Given a string and a shift value, encrypt the string using a Caesar cipher. '
            'Only shift alphabetic characters; preserve case and leave non-alpha characters unchanged.\n\n'
            '### Input\n'
            'Line 1: The string to encrypt.\n'
            'Line 2: The shift value (integer).\n\n'
            '### Output\n'
            'Print the encrypted string.\n\n'
            '### Example\n'
            '```\nInput:\nHello, World!\n3\n\nOutput:\nKhoor, Zruog!\n```'
        ),
        'starter_python': 's = input()\nshift = int(input())\n# Encrypt with Caesar cipher\n',
        'starter_javascript': 'const lines = require("fs").readFileSync("/dev/stdin", "utf8").trim().split("\\n");\nconst s = lines[0];\nconst shift = parseInt(lines[1]);\n// Encrypt with Caesar cipher\n',
        'starter_cpp': '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    int shift;\n    getline(cin, s);\n    cin >> shift;\n    // Caesar cipher\n    return 0;\n}\n',
        'starter_java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        int shift = Integer.parseInt(sc.nextLine());\n        // Caesar cipher\n    }\n}\n',
        'tests': [
            {'input': 'Hello, World!\n3', 'output': 'Khoor, Zruog!', 'sample': True},
            {'input': 'abc\n1', 'output': 'bcd', 'sample': True},
            {'input': 'xyz\n3', 'output': 'abc', 'sample': False},
            {'input': 'Attack at dawn!\n13', 'output': 'Nggnpx ng qnja!', 'sample': False},
            {'input': 'Test 123\n0', 'output': 'Test 123', 'sample': False},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed the database with starter coding challenges'

    def handle(self, *args, **kwargs):
        created_count = 0
        for c in CHALLENGES:
            challenge, created = CodeChallenge.objects.get_or_create(
                slug=c['slug'],
                defaults={
                    'title': c['title'],
                    'difficulty': c['difficulty'],
                    'description': c['description'],
                    'time_limit_minutes': c['time_limit_minutes'],
                    'starter_python': c.get('starter_python', ''),
                    'starter_javascript': c.get('starter_javascript', ''),
                    'starter_cpp': c.get('starter_cpp', ''),
                    'starter_java': c.get('starter_java', ''),
                },
            )
            if created:
                created_count += 1
                for i, t in enumerate(c['tests']):
                    TestCase.objects.create(
                        challenge=challenge,
                        input_data=t['input'],
                        expected_output=t['output'],
                        is_sample=t['sample'],
                        order=i,
                    )
                self.stdout.write(f'  ✅ {challenge}')
            else:
                self.stdout.write(f'  ⏭️  {challenge} (already exists)')

        self.stdout.write(self.style.SUCCESS(f'\nDone! Created {created_count} new challenges.'))
