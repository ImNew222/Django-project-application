import json
from openai import OpenAI
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from quiz.models import Subject, Question


class IsTeacherOrAdmin(permissions.BasePermission):
    """Only teachers and admins can generate questions."""
    def has_permission(self, request, view):
        return request.user.role in ['teacher', 'admin']


def build_prompt(topic, difficulty, num_questions):
    """Build the quiz generation prompt."""
    return f"""Generate exactly {num_questions} multiple-choice quiz questions about "{topic}" for a school quiz app.

Difficulty level: {difficulty}
- beginner: Simple recall and basic concepts
- intermediate: Application and understanding
- hard: Analysis, problem-solving, tricky edge cases

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.
Each question object must have exactly these fields:
- "text": the question text (string)
- "choice_a": first option (string)
- "choice_b": second option (string)
- "choice_c": third option (string)
- "choice_d": fourth option (string)
- "correct_answer": the correct letter, one of "A", "B", "C", or "D" (string)

Example format:
[{{"text": "What is 2+2?", "choice_a": "3", "choice_b": "4", "choice_c": "5", "choice_d": "6", "correct_answer": "B"}}]
"""


def clean_json_response(raw):
    """Strip markdown fences and whitespace from AI response."""
    raw = raw.strip()
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[1] if '\n' in raw else raw[3:]
        raw = raw.rsplit('```', 1)[0] if '```' in raw else raw
    return raw.strip()


def try_gemini(prompt):
    """Try Gemini models (free tier first)."""
    from google import genai
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash']

    for model_name in models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return response.text, model_name
        except Exception:
            continue
    return None, None


def try_openai(prompt):
    """Fallback to OpenAI GPT."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': 'You are a quiz question generator. Return only valid JSON arrays.'},
            {'role': 'user', 'content': prompt},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content, 'gpt-4o-mini'


class AIGenerateQuestionsView(APIView):
    """Use Gemini AI (with GPT fallback) to generate quiz questions."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request):
        topic = request.data.get('topic', '').strip()
        difficulty = request.data.get('difficulty', 'beginner')
        num_questions = min(int(request.data.get('num_questions', 5)), 10)
        subject_id = request.data.get('subject_id')

        if not topic:
            return Response({'error': 'Topic is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if difficulty not in ['beginner', 'intermediate', 'hard']:
            return Response({'error': 'Invalid difficulty.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Subject.objects.get(id=subject_id)
        except (Subject.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'Valid subject_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        prompt = build_prompt(topic, difficulty, num_questions)

        # Try Gemini first (free), then GPT as fallback
        raw, model_used = try_gemini(prompt)

        if raw is None:
            try:
                raw, model_used = try_openai(prompt)
            except Exception as e:
                return Response({
                    'error': f'Both Gemini and GPT failed. Try again later. ({str(e)[:100]})',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            cleaned = clean_json_response(raw)
            questions_data = json.loads(cleaned)

            if not isinstance(questions_data, list):
                return Response({'error': 'AI returned invalid format. Try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            created_questions = []
            for q in questions_data:
                required = ['text', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_answer']
                if not all(f in q for f in required):
                    continue
                if q['correct_answer'] not in ['A', 'B', 'C', 'D']:
                    continue

                question = Question.objects.create(
                    subject=subject,
                    text=q['text'],
                    difficulty=difficulty,
                    choice_a=q['choice_a'],
                    choice_b=q['choice_b'],
                    choice_c=q['choice_c'],
                    choice_d=q['choice_d'],
                    correct_answer=q['correct_answer'],
                )
                created_questions.append({
                    'id': question.id,
                    'text': question.text,
                    'choice_a': question.choice_a,
                    'choice_b': question.choice_b,
                    'choice_c': question.choice_c,
                    'choice_d': question.choice_d,
                    'correct_answer': question.correct_answer,
                    'difficulty': question.difficulty,
                })

            return Response({
                'message': f'Generated {len(created_questions)} questions for "{topic}"',
                'questions': created_questions,
                'subject': subject.name,
                'topic': topic,
                'difficulty': difficulty,
                'ai_model': model_used,
            }, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError:
            return Response({
                'error': 'AI returned unparseable response. Please try again.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'error': f'AI generation failed: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
