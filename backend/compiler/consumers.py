"""
PvP Code Battle WebSocket Consumer.

Flow:
  1. Player connects → sends find_match {difficulty}
  2. Server pairs two players in same difficulty queue
  3. Countdown 3-2-1 → battle_start with challenge
  4. Players submit code → server runs through Judge0
  5. Opponent progress broadcast in real-time
  6. First to pass all tests wins (or highest score at timeout)
"""
import asyncio
import json
import uuid
import base64
import requests
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone

JUDGE0_URL = getattr(settings, 'JUDGE0_API_URL', 'http://localhost:2358')

# In-memory matchmaking queues keyed by difficulty
# { 'easy': [{'user': User, 'channel': str, 'elo': int, 'joined_at': float}, ...], ... }
_match_queues = {'easy': [], 'medium': [], 'hard': []}
_queue_lock = asyncio.Lock()

ELO_MATCH_RANGE = 200   # initial ELO range for matchmaking
ELO_EXPAND_RATE = 100   # expand every 15 seconds
ELO_EXPAND_INTERVAL = 15


def _decode_b64(value):
    if not value:
        return ''
    try:
        return base64.b64decode(value).decode('utf-8', errors='replace')
    except Exception:
        return value


def _run_judge0_sync(source_code, language_id, stdin=''):
    """Run code through Judge0 (sync — called via sync_to_async)."""
    payload = {
        'language_id': language_id,
        'source_code': base64.b64encode(source_code.encode()).decode(),
        'stdin': base64.b64encode(stdin.encode()).decode(),
        'base64_encoded': True,
    }
    try:
        resp = requests.post(
            f'{JUDGE0_URL}/submissions?base64_encoded=true&wait=true',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30,
        )
        if resp.status_code in (200, 201):
            r = resp.json()
            return {
                'stdout': _decode_b64(r.get('stdout', '')).strip(),
                'stderr': _decode_b64(r.get('stderr', '')),
                'compile_output': _decode_b64(r.get('compile_output', '')),
                'time': r.get('time'),
                'status_id': r.get('status', {}).get('id', 0),
                'status_desc': r.get('status', {}).get('description', ''),
            }
    except Exception as e:
        return {'stdout': '', 'stderr': str(e), 'status_id': 13}
    return {'stdout': '', 'stderr': 'Judge0 error', 'status_id': 13}


run_judge0 = database_sync_to_async(_run_judge0_sync, thread_sensitive=False)


class BattleConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time PvP code battles."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.room_code = None
        self.battle_id = None
        self.difficulty = None
        self.battle_group = None
        self.player_number = None  # 1 or 2
        self._timer_task = None
        self._elo = 1000

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        await self.accept()
        # Load ELO
        self._elo = await self.get_user_elo(self.user)
        elo_info = await self.get_user_elo_info(self.user)
        await self.send_json({
            'type': 'connected',
            'message': 'Connected! Choose difficulty and find a match.',
            'elo': elo_info,
        })

    async def disconnect(self, close_code):
        # Remove from queue if still waiting
        if self.difficulty:
            async with _queue_lock:
                _match_queues[self.difficulty] = [
                    e for e in _match_queues.get(self.difficulty, [])
                    if e['channel'] != self.channel_name
                ]

        # Notify opponent if in a battle
        if self.battle_group:
            await self.channel_layer.group_send(self.battle_group, {
                'type': 'player.left',
                'username': self.user.username,
            })
            await self.channel_layer.group_discard(self.battle_group, self.channel_name)

        # Cancel timer
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type', '')

        if msg_type == 'find_match':
            await self.handle_find_match(content)
        elif msg_type == 'submit_code':
            await self.handle_submit_code(content)
        elif msg_type == 'leave':
            await self.handle_leave()

    # ────────────────────────────────────────────────────────
    # Matchmaking
    # ────────────────────────────────────────────────────────
    async def handle_find_match(self, content):
        difficulty = content.get('difficulty', 'easy')
        if difficulty not in ('easy', 'medium', 'hard'):
            difficulty = 'easy'
        self.difficulty = difficulty
        import time as _time
        now = _time.time()

        async with _queue_lock:
            queue = _match_queues[difficulty]

            # Remove ourselves if already queued
            queue = [e for e in queue if e['channel'] != self.channel_name]

            # ELO-based matchmaking: find closest ELO within acceptable range
            opponent = None
            best_idx = None
            best_diff = float('inf')

            for i, entry in enumerate(queue):
                # Expand range based on wait time
                wait_seconds = now - entry['joined_at']
                allowed_range = ELO_MATCH_RANGE + (wait_seconds // ELO_EXPAND_INTERVAL) * ELO_EXPAND_RATE
                elo_diff = abs(self._elo - entry['elo'])

                if elo_diff <= allowed_range and elo_diff < best_diff:
                    best_diff = elo_diff
                    best_idx = i

            if best_idx is not None:
                opponent = queue.pop(best_idx)
            else:
                queue.append({
                    'user': self.user, 'channel': self.channel_name,
                    'elo': self._elo, 'joined_at': now,
                })

            _match_queues[difficulty] = queue

        if opponent:
            await self.start_battle(opponent, difficulty)
        else:
            await self.send_json({
                'type': 'waiting',
                'message': f'Looking for a {difficulty} opponent...',
                'difficulty': difficulty,
                'your_elo': self._elo,
            })

    async def start_battle(self, opponent_entry, difficulty):
        """Pair two players and start the battle."""
        room_code = f'pvp-{uuid.uuid4().hex[:8]}'
        self.battle_group = f'battle_{room_code}'
        self.room_code = room_code
        self.player_number = 2  # We joined second
        self.difficulty = difficulty

        # Create DB record
        battle = await self.create_pvp_battle(
            room_code, difficulty, opponent_entry['user'], self.user
        )
        self.battle_id = battle.id

        # Join group
        await self.channel_layer.group_add(self.battle_group, self.channel_name)
        await self.channel_layer.group_add(self.battle_group, opponent_entry['channel'])

        # Get ELO info for both
        my_elo_info = await self.get_user_elo_info(self.user)
        opp_elo_info = await self.get_user_elo_info(opponent_entry['user'])

        # Tell the opponent their battle info
        await self.channel_layer.send(opponent_entry['channel'], {
            'type': 'battle.matched',
            'room_code': room_code,
            'battle_id': battle.id,
            'opponent': self.user.username,
            'opponent_elo': my_elo_info,
            'player_number': 1,
            'difficulty': difficulty,
        })

        # Tell ourselves
        await self.send_json({
            'type': 'matched',
            'room_code': room_code,
            'battle_id': battle.id,
            'opponent': opponent_entry['user'].username,
            'opponent_elo': opp_elo_info,
            'player_number': 2,
            'difficulty': difficulty,
        })

        # Start countdown (runs for the group)
        asyncio.ensure_future(self.run_countdown(room_code, battle.id))

    async def run_countdown(self, room_code, battle_id):
        """3-2-1 countdown then start the battle."""
        for i in range(3, 0, -1):
            await self.channel_layer.group_send(f'battle_{room_code}', {
                'type': 'battle.countdown',
                'seconds': i,
            })
            await asyncio.sleep(1)

        # Pick a random challenge and start
        challenge_data = await self.pick_challenge_and_start(battle_id)

        await self.channel_layer.group_send(f'battle_{room_code}', {
            'type': 'battle.start',
            'challenge': challenge_data,
        })

        # Start 5-minute timer
        self._timer_task = asyncio.ensure_future(self.battle_timeout(room_code, battle_id))

    async def battle_timeout(self, room_code, battle_id):
        """Auto-end battle after 5 minutes."""
        await asyncio.sleep(300)  # 5 minutes
        battle = await self.get_battle(battle_id)
        if battle and battle.status == 'in_progress':
            await self.end_battle(battle_id, room_code, timeout=True)

    # ────────────────────────────────────────────────────────
    # Code Submission
    # ────────────────────────────────────────────────────────
    async def handle_submit_code(self, content):
        if not self.battle_id:
            await self.send_json({'type': 'error', 'message': 'Not in a battle.'})
            return

        source_code = content.get('source_code', '')
        language_id = content.get('language_id', 71)

        if not source_code.strip():
            await self.send_json({'type': 'error', 'message': 'Empty code.'})
            return

        await self.send_json({'type': 'judging', 'message': 'Running your code against test cases...'})

        # Get test cases
        test_cases = await self.get_test_cases(self.battle_id)
        total = len(test_cases)
        passed = 0
        test_results = []
        total_time = 0.0

        for tc in test_cases:
            result = await run_judge0(source_code, language_id, tc['input_data'])
            actual = result.get('stdout', '').strip()
            expected = tc['expected_output'].strip()
            is_pass = (actual == expected) and result.get('status_id') == 3

            if is_pass:
                passed += 1

            exec_time = float(result.get('time') or 0)
            total_time += exec_time

            tr = {
                'passed': is_pass,
                'is_sample': tc['is_sample'],
                'execution_time': exec_time,
                'status': result.get('status_desc', ''),
            }
            if tc['is_sample']:
                tr['input'] = tc['input_data']
                tr['expected'] = expected
                tr['actual'] = actual
                if result.get('stderr'):
                    tr['stderr'] = result['stderr'][:200]
            test_results.append(tr)

        all_passed = passed == total

        # Send results to submitter
        await self.send_json({
            'type': 'your_results',
            'passed': passed,
            'total': total,
            'all_passed': all_passed,
            'execution_time': round(total_time, 3),
            'test_results': test_results,
        })

        # Save code for replay
        await self.save_pvp_code(self.battle_id, self.user, source_code, language_id, passed, total)

        # Update battle scores in DB
        await self.update_battle_score(self.battle_id, self.player_number, passed, total, total_time)

        # Broadcast progress to opponent
        await self.channel_layer.group_send(self.battle_group, {
            'type': 'battle.opponent_progress',
            'player': self.player_number,
            'username': self.user.username,
            'passed': passed,
            'total': total,
            'all_passed': all_passed,
        })

        # If all passed, end battle (this player wins)
        if all_passed:
            await self.end_battle(self.battle_id, self.room_code, winner_number=self.player_number)

    async def handle_leave(self):
        """Player forfeits the match."""
        if self.battle_id and self.battle_group:
            other = 2 if self.player_number == 1 else 1
            await self.end_battle(self.battle_id, self.room_code, winner_number=other, forfeit=True)
        await self.close()

    # ────────────────────────────────────────────────────────
    # End Battle
    # ────────────────────────────────────────────────────────
    async def end_battle(self, battle_id, room_code, winner_number=None, timeout=False, forfeit=False):
        result = await self.finish_battle_db(battle_id, winner_number, timeout, forfeit)
        if not result:
            return

        await self.channel_layer.group_send(f'battle_{room_code}', {
            'type': 'battle.end',
            'battle_id': battle_id,
            'winner': result['winner'],
            'p1_score': result['p1_score'],
            'p2_score': result['p2_score'],
            'points_awarded': result['points_awarded'],
            'elo_changes': result.get('elo_changes', {}),
            'reason': 'forfeit' if forfeit else ('timeout' if timeout else 'solved'),
        })

        # Cancel timer
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()

    # ────────────────────────────────────────────────────────
    # Group message handlers (channels dispatch)
    # ────────────────────────────────────────────────────────
    async def battle_matched(self, event):
        """Received by player1 when opponent joins."""
        self.room_code = event['room_code']
        self.battle_id = event['battle_id']
        self.player_number = event['player_number']
        self.battle_group = f"battle_{event['room_code']}"
        self.difficulty = event.get('difficulty')
        await self.send_json({
            'type': 'matched',
            'room_code': event['room_code'],
            'battle_id': event['battle_id'],
            'opponent': event['opponent'],
            'opponent_elo': event.get('opponent_elo'),
            'player_number': event['player_number'],
            'difficulty': event['difficulty'],
        })

    async def battle_countdown(self, event):
        await self.send_json({'type': 'countdown', 'seconds': event['seconds']})

    async def battle_start(self, event):
        await self.send_json({'type': 'battle_start', 'challenge': event['challenge']})

    async def battle_opponent_progress(self, event):
        # Don't send your own progress back to yourself
        if event['player'] != self.player_number:
            await self.send_json({
                'type': 'opponent_progress',
                'opponent': event['username'],
                'passed': event['passed'],
                'total': event['total'],
                'all_passed': event['all_passed'],
            })

    async def battle_end(self, event):
        await self.send_json({
            'type': 'battle_end',
            'battle_id': event.get('battle_id'),
            'winner': event['winner'],
            'p1_score': event['p1_score'],
            'p2_score': event['p2_score'],
            'points_awarded': event['points_awarded'],
            'elo_changes': event.get('elo_changes', {}),
            'reason': event['reason'],
        })

    async def player_left(self, event):
        await self.send_json({
            'type': 'opponent_left',
            'message': f"{event['username']} left the battle.",
        })

    # ────────────────────────────────────────────────────────
    # Database helpers (sync_to_async)
    # ────────────────────────────────────────────────────────
    @database_sync_to_async
    def create_pvp_battle(self, room_code, difficulty, player1, player2):
        from .models import PvPBattle
        return PvPBattle.objects.create(
            room_code=room_code,
            difficulty=difficulty,
            player1=player1,
            player2=player2,
            status='waiting',
        )

    @database_sync_to_async
    def pick_challenge_and_start(self, battle_id):
        from .models import PvPBattle, CodeChallenge
        battle = PvPBattle.objects.get(id=battle_id)
        # Pick random challenge matching difficulty
        challenge = CodeChallenge.objects.filter(
            difficulty=battle.difficulty, is_active=True
        ).order_by('?').first()

        if not challenge:
            # Fallback to any challenge
            challenge = CodeChallenge.objects.filter(is_active=True).order_by('?').first()

        battle.challenge = challenge
        battle.status = 'in_progress'
        battle.started_at = timezone.now()
        battle.save()

        sample_tests = list(challenge.test_cases.filter(is_sample=True).values(
            'id', 'input_data', 'expected_output', 'is_sample'
        ))
        return {
            'id': challenge.id,
            'slug': challenge.slug,
            'title': challenge.title,
            'description': challenge.description,
            'difficulty': challenge.difficulty,
            'points': challenge.points,
            'time_limit_minutes': challenge.time_limit_minutes,
            'starter_python': challenge.starter_python,
            'starter_javascript': challenge.starter_javascript,
            'starter_cpp': challenge.starter_cpp,
            'starter_java': challenge.starter_java,
            'sample_tests': sample_tests,
            'total_tests': challenge.test_cases.count(),
        }

    @database_sync_to_async
    def get_battle(self, battle_id):
        from .models import PvPBattle
        try:
            return PvPBattle.objects.get(id=battle_id)
        except PvPBattle.DoesNotExist:
            return None

    @database_sync_to_async
    def get_test_cases(self, battle_id):
        from .models import PvPBattle
        battle = PvPBattle.objects.select_related('challenge').get(id=battle_id)
        return list(battle.challenge.test_cases.values(
            'input_data', 'expected_output', 'is_sample'
        ))

    @database_sync_to_async
    def update_battle_score(self, battle_id, player_number, passed, total, exec_time):
        from .models import PvPBattle
        battle = PvPBattle.objects.get(id=battle_id)
        if player_number == 1:
            battle.p1_passed = max(battle.p1_passed, passed)
            battle.p1_total = total
            battle.p1_time = exec_time
        else:
            battle.p2_passed = max(battle.p2_passed, passed)
            battle.p2_total = total
            battle.p2_time = exec_time
        battle.save()

    @database_sync_to_async
    def save_pvp_code(self, battle_id, user, source_code, language_id, passed, total):
        from .models import PvPBattle, PvPSubmission
        battle = PvPBattle.objects.get(id=battle_id)
        LANG_MAP = {71: 'Python', 63: 'JavaScript', 54: 'C++', 62: 'Java'}
        sub, _ = PvPSubmission.objects.update_or_create(
            battle=battle, player=user,
            defaults={
                'source_code': source_code,
                'language_id': language_id,
                'language_name': LANG_MAP.get(language_id, 'Unknown'),
                'passed_tests': passed,
                'total_tests': total,
            }
        )

    @database_sync_to_async
    def get_user_elo(self, user):
        from leaderboard.models import PlayerStats
        stats, _ = PlayerStats.objects.get_or_create(user=user)
        return stats.elo_rating

    @database_sync_to_async
    def get_user_elo_info(self, user):
        from leaderboard.models import PlayerStats
        stats, _ = PlayerStats.objects.get_or_create(user=user)
        return {
            'elo': stats.elo_rating,
            'tier': stats.elo_tier,
            'icon': stats.elo_tier_icon,
            'wins': stats.pvp_wins,
            'losses': stats.pvp_losses,
        }

    @database_sync_to_async
    def finish_battle_db(self, battle_id, winner_number=None, timeout=False, forfeit=False):
        from .models import PvPBattle
        from leaderboard.models import PlayerStats
        try:
            battle = PvPBattle.objects.get(id=battle_id)
        except PvPBattle.DoesNotExist:
            return None

        if battle.status == 'finished':
            return None  # Already ended

        battle.status = 'finished'
        battle.finished_at = timezone.now()

        # Determine winner
        winner_user = None
        is_draw = False
        if winner_number == 1:
            winner_user = battle.player1
        elif winner_number == 2:
            winner_user = battle.player2
        elif timeout:
            if battle.p1_passed > battle.p2_passed:
                winner_user = battle.player1
            elif battle.p2_passed > battle.p1_passed:
                winner_user = battle.player2
            else:
                is_draw = True

        battle.winner = winner_user

        # Award rank points
        points = 0
        if winner_user and battle.challenge:
            points = int(battle.challenge.points * 1.5)
            battle.points_awarded = points
            try:
                stats, _ = PlayerStats.objects.get_or_create(user=winner_user)
                stats.rank_points += points
                stats.save()
            except Exception:
                pass

        # Update ELO for both players
        elo_changes = {}
        try:
            p1_stats, _ = PlayerStats.objects.get_or_create(user=battle.player1)
            p2_stats, _ = PlayerStats.objects.get_or_create(user=battle.player2)
            p1_old_elo = p1_stats.elo_rating
            p2_old_elo = p2_stats.elo_rating

            if is_draw:
                p1_change = p1_stats.update_elo(p2_old_elo, won=False, draw=True)
                p2_change = p2_stats.update_elo(p1_old_elo, won=False, draw=True)
            elif winner_user == battle.player1:
                p1_change = p1_stats.update_elo(p2_old_elo, won=True)
                p2_change = p2_stats.update_elo(p1_old_elo, won=False)
            elif winner_user == battle.player2:
                p1_change = p1_stats.update_elo(p2_old_elo, won=False)
                p2_change = p2_stats.update_elo(p1_old_elo, won=True)
            else:
                p1_change = p1_stats.update_elo(p2_old_elo, won=False, draw=True)
                p2_change = p2_stats.update_elo(p1_old_elo, won=False, draw=True)

            elo_changes = {
                battle.player1.username: {
                    'change': p1_change, 'new_elo': p1_stats.elo_rating,
                    'tier': p1_stats.elo_tier, 'icon': p1_stats.elo_tier_icon,
                },
                battle.player2.username: {
                    'change': p2_change, 'new_elo': p2_stats.elo_rating,
                    'tier': p2_stats.elo_tier, 'icon': p2_stats.elo_tier_icon,
                },
            }
        except Exception:
            pass

        battle.save()

        p1_name = battle.player1.username
        p2_name = battle.player2.username if battle.player2 else '???'

        return {
            'winner': winner_user.username if winner_user else None,
            'p1_score': {'username': p1_name, 'passed': battle.p1_passed, 'total': battle.p1_total},
            'p2_score': {'username': p2_name, 'passed': battle.p2_passed, 'total': battle.p2_total},
            'points_awarded': points,
            'elo_changes': elo_changes,
        }
