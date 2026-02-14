import random
import string
from django.db import models
from django.conf import settings


class Section(models.Model):
    """A classroom section, e.g. 'BSIT 1 - Sec 1'."""

    PROGRAM_CHOICES = [
        ('BSIT', 'BS Information Technology'),
        ('BSCS', 'BS Computer Science'),
        ('BSIS', 'BS Information Systems'),
        ('ACT', 'Associate in Computer Technology'),
    ]

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='taught_sections'
    )
    program = models.CharField(max_length=10, choices=PROGRAM_CHOICES, default='BSIT')
    year_level = models.IntegerField(choices=[(i, f'{i} Year') for i in range(1, 5)])
    section_num = models.IntegerField(default=1)
    description = models.TextField(blank=True, default='')
    join_code = models.CharField(max_length=6, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['program', 'year_level', 'section_num']
        unique_together = ['program', 'year_level', 'section_num', 'teacher']

    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Section.objects.filter(join_code=code).exists():
                return code

    @property
    def display_name(self):
        return f"{self.program} {self.year_level} - Sec {self.section_num}"

    @property
    def member_count(self):
        return self.memberships.count()

    def __str__(self):
        return f"{self.display_name} ({self.teacher.username})"


class SectionMembership(models.Model):
    """Student enrolled in a section."""
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='memberships')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='section_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['section', 'student']
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.student.username} in {self.section.display_name}"


class SectionAssignment(models.Model):
    """Quiz or tournament assigned to a section by teacher."""

    TYPE_CHOICES = [
        ('quiz', 'Quiz'),
        ('tournament', 'Tournament'),
        ('challenge', 'Code Challenge'),
    ]

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='assigned_work'
    )
    assignment_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')

    # Quiz fields
    subject = models.ForeignKey(
        'quiz.Subject', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    difficulty = models.CharField(max_length=15, blank=True, default='beginner')
    num_questions = models.IntegerField(default=10)

    # Tournament / Challenge link
    tournament = models.ForeignKey(
        'compiler.Tournament', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    challenge = models.ForeignKey(
        'compiler.CodeChallenge', on_delete=models.SET_NULL,
        null=True, blank=True
    )

    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.assignment_type}] {self.title} → {self.section.display_name}"
