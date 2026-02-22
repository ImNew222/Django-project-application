"""
AI-Powered Solution Explanations.

After a student solves (or fails) a code challenge, this view
uses Gemini to generate an explanation of the optimal approach,
complexity analysis, and tips for improvement.
"""
import json
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


def _build_explanation_prompt(challenge_title, challenge_desc, user_code, passed, language='Python'):
    """Build the Gemini prompt for code explanation."""
    result_text = "PASSED all tests" if passed else "FAILED some or all tests"

    return f"""You are a coding mentor. A student just {result_text} on a coding challenge.

Challenge: "{challenge_title}"
Description: {challenge_desc}

Student's Code ({language}):
```
{user_code}
```

Please provide a helpful explanation in this JSON format:
{{
    "approach": "Brief explanation of the optimal approach to solve this problem",
    "complexity": {{
        "time": "O(...) with explanation",
        "space": "O(...) with explanation"
    }},
    "student_feedback": "Specific feedback on the student's code - what they did well and what could be improved",
    "optimal_solution": "A clean, well-commented optimal solution in {language}",
    "tips": ["tip 1", "tip 2", "tip 3"]
}}

IMPORTANT: Return ONLY valid JSON. No markdown code fences, no extra text.
Be encouraging but honest. If the student failed, explain what went wrong specifically.
"""


def _clean_json(raw):
    """Strip markdown fences from AI response."""
    raw = raw.strip()
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[1] if '\n' in raw else raw[3:]
        raw = raw.rsplit('```', 1)[0] if '```' in raw else raw
    return raw.strip()


class GetExplanationView(APIView):
    """POST: Get AI explanation for a challenge solution."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        challenge_id = request.data.get('challenge_id')
        user_code = request.data.get('user_code', '')
        passed = request.data.get('passed', False)
        language = request.data.get('language', 'Python')

        if not challenge_id or not user_code.strip():
            return Response({'error': 'challenge_id and user_code required'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Get challenge info
        from compiler.models import CodeChallenge
        try:
            challenge = CodeChallenge.objects.get(id=challenge_id)
        except CodeChallenge.DoesNotExist:
            return Response({'error': 'Challenge not found'},
                            status=status.HTTP_404_NOT_FOUND)

        prompt = _build_explanation_prompt(
            challenge.title,
            challenge.description[:500],
            user_code[:2000],
            passed,
            language,
        )

        # Try Gemini
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            models_to_try = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash']
            raw = None

            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    raw = response.text
                    break
                except Exception:
                    continue

            if not raw:
                return Response({'error': 'AI service unavailable. Try again later.'},
                                status=status.HTTP_503_SERVICE_UNAVAILABLE)

            cleaned = _clean_json(raw)
            explanation = json.loads(cleaned)

            return Response({
                'explanation': explanation,
                'challenge_title': challenge.title,
                'passed': passed,
            })

        except json.JSONDecodeError:
            return Response({'error': 'AI returned invalid response. Try again.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': f'AI error: {str(e)[:100]}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
