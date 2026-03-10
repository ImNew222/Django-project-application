"""
Daily AI Bot Activity Command.

Generates social posts, blog posts, comments, and likes from AI bots
to make the platform feel alive. Run daily via cron or manually.

Usage: python manage.py ai_activity
       python manage.py ai_activity --posts-only
       python manage.py ai_activity --blogs-only
"""
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import CustomUser, AIPersonality
from accounts.ai_services import (
    generate_social_post, generate_blog_post, generate_comment, get_unsplash_image
)
from social.models import Post, Like, Comment
from blog.models import BlogPost


class Command(BaseCommand):
    help = 'Generate AI bot activity — social posts, blog posts, comments, and likes'

    def add_arguments(self, parser):
        parser.add_argument('--posts-only', action='store_true', help='Only generate social posts')
        parser.add_argument('--blogs-only', action='store_true', help='Only generate blog posts')
        parser.add_argument('--comments-only', action='store_true', help='Only generate comments')
        parser.add_argument('--dry-run', action='store_true', help='Don\'t save, just print what would be generated')

    def handle(self, *args, **options):
        bots = AIPersonality.objects.filter(is_active=True).select_related('user')

        if not bots.exists():
            self.stdout.write(self.style.WARNING('No active AI bots found. Run seed_ai_bots first.'))
            return

        self.stdout.write(f'🤖 Starting AI activity for {bots.count()} bots...\n')

        posts_only = options.get('posts_only')
        blogs_only = options.get('blogs_only')
        comments_only = options.get('comments_only')
        dry_run = options.get('dry_run')
        do_all = not (posts_only or blogs_only or comments_only)

        stats = {'posts': 0, 'blogs': 0, 'comments': 0, 'likes': 0}

        for personality in bots:
            bot = personality.user
            self.stdout.write(f'\n  {"🧑‍🏫" if personality.bot_role == "teacher" else "🤖"} {personality.display_name}:')

            # ── Social Posts ──
            if do_all or posts_only:
                # Check how many posts this bot has made today
                today_posts = Post.objects.filter(
                    author=bot,
                    created_at__date=timezone.now().date()
                ).count()

                remaining = max(0, personality.posts_per_day - today_posts)
                for _ in range(remaining):
                    content = generate_social_post(personality)
                    if content and not dry_run:
                        # Sometimes attach an image
                        Post.objects.create(author=bot, content=content)
                        stats['posts'] += 1
                        self.stdout.write(f'    📝 Post: "{content[:60]}..."')
                    elif content:
                        self.stdout.write(f'    📝 [DRY] Post: "{content[:60]}..."')

            # ── Blog Posts (weekly) ──
            if do_all or blogs_only:
                week_blogs = BlogPost.objects.filter(
                    author=bot,
                    created_at__gte=timezone.now() - timezone.timedelta(days=7)
                ).count()

                if week_blogs < personality.blogs_per_week:
                    title, content = generate_blog_post(personality)
                    if title and content and not dry_run:
                        # Try to get a relevant cover image
                        image_url = get_unsplash_image(personality.specialty.split(',')[0].strip())
                        BlogPost.objects.create(
                            author=bot,
                            title=title,
                            content=content,
                        )
                        stats['blogs'] += 1
                        self.stdout.write(f'    📰 Blog: "{title}"')
                    elif title:
                        self.stdout.write(f'    📰 [DRY] Blog: "{title}"')

            # ── Comments on recent posts ──
            if do_all or comments_only:
                today_comments = Comment.objects.filter(
                    author=bot,
                    created_at__date=timezone.now().date()
                ).count()

                if today_comments < personality.comments_per_day:
                    # Find recent posts (not by this bot) to comment on
                    recent_posts = Post.objects.exclude(
                        author=bot
                    ).order_by('-created_at')[:20]

                    posts_to_comment = random.sample(
                        list(recent_posts),
                        min(personality.comments_per_day - today_comments, len(recent_posts))
                    )

                    for post in posts_to_comment:
                        # Don't comment on the same post twice
                        if Comment.objects.filter(author=bot, post=post).exists():
                            continue

                        comment_text = generate_comment(personality, post.content)
                        if comment_text and not dry_run:
                            Comment.objects.create(
                                author=bot,
                                post=post,
                                content=comment_text
                            )
                            stats['comments'] += 1
                            self.stdout.write(f'    💬 Comment on post #{post.id}: "{comment_text[:40]}..."')

            # ── Likes ──
            if do_all:
                # Each bot likes 3-8 random recent posts
                num_likes = random.randint(3, 8)
                recent_posts = Post.objects.exclude(
                    author=bot
                ).order_by('-created_at')[:30]

                for post in random.sample(list(recent_posts), min(num_likes, len(recent_posts))):
                    if not Like.objects.filter(user=bot, post=post).exists():
                        if not dry_run:
                            Like.objects.create(user=bot, post=post)
                            stats['likes'] += 1

        # Summary
        self.stdout.write(f'\n')
        self.stdout.write(self.style.SUCCESS(
            f'✅ AI Activity Complete!\n'
            f'   📝 {stats["posts"]} social posts\n'
            f'   📰 {stats["blogs"]} blog posts\n'
            f'   💬 {stats["comments"]} comments\n'
            f'   ❤️  {stats["likes"]} likes'
        ))
