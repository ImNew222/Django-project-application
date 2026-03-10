"""
Chess-Style PvP Code Battle WebSocket Consumer.

Flow:
  1. Player connects → sends find_match {difficulty}
  2. Server pairs two players in same difficulty queue (ELO-based)
  3. Countdown 3-2-1 → battle_start with challenge
  4. Players ALTERNATE writing ONE line of code per turn
  5. After each line → code is auto-run against test cases
  6. Chess clocks tick only on active player's turn
  7. Win: the player who writes the line that passes all tests
  8. Timeout: whoever's code passes more tests when time runs out
"""
import asyncio
import json
import uuid
import base64
import time as _time
import requests
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone

JUDGE0_URL = getattr(settings, 'JUDGE0_API_URL', 'http://localhost:2358')

# Separate matchmaking queues for chess mode
_chess_queues = {'easy': [], 'medium': [], 'hard': []}
_chess_lock = asyncio.Lock()

ELO_MATCH_RANGE = 200
ELO_EXPAND_RATE = 100
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
    headers = {'Content-Type': 'application/json'}
    api_key = getattr(settings, 'JUDGE0_API_KEY', '')
    if api_key:
        headers['X-RapidAPI-Key'] = api_key
        headers['X-RapidAPI-Host'] = getattr(settings, 'JUDGE0_API_HOST', 'judge0-ce.p.rapidapi.com')

    try:
        resp = requests.post(
            f'{JUDGE0_URL}/submissions?base64_encoded=true&wait=true',
            json=payload,
            headers=headers,
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


class ChessBattleConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for chess-style turn-based code battles."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.room_code = None
        self.battle_id = None
        self.difficulty = None
        self.battle_group = None
        self.player_number = None  # 1 or 2
        self._clock_task = None
        self._elo = 1000
        self._language_id = 71  # Default Python

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        await self.accept()
        self._elo = await self.get_user_elo(self.user)
        elo_info = await self.get_user_elo_info(self.user)
        await self.send_json({
            'type': 'connected',
            'message': 'Connected to Chess Battle! Choose difficulty to find a match.',
            'mode': 'chess',
            'elo': elo_info,
        })

    async def disconnect(self, close_code):
        # Remove from queue if still waiting
        if self.difficulty:
            async with _chess_lock:
                _chess_queues[self.difficulty] = [
                    e for e in _chess_queues.get(self.difficulty, [])
                    if e['channel'] != self.channel_name
                ]

        # Notify opponent if in a battle
        if self.battle_group:
            await self.channel_layer.group_send(self.battle_group, {
                'type': 'player.left',
                'username': self.user.username,
            })
            await self.channel_layer.group_discard(self.battle_group, self.channel_name)

        # Cancel clock
        if self._clock_task and not self._clock_task.done():
            self._clock_task.cancel()

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type', '')

        if msg_type == 'find_match':
            await self.handle_find_match(content)
        elif msg_type == 'submit_line':
            await self.handle_submit_line(content)
        elif msg_type == 'delete_line':
            await self.handle_delete_line(content)
        elif msg_type == 'forfeit':
            await self.handle_forfeit()

    # ────────────────────────────────────────────────────────
    # Matchmaking
    # ────────────────────────────────────────────────────────
    async def handle_find_match(self, content):
        difficulty = content.get('difficulty', 'easy')
        if difficulty not in ('easy', 'medium', 'hard'):
            difficulty = 'easy'
        self.difficulty = difficulty
        self._language_id = content.get('language_id', 71)
        now = _time.time()

        async with _chess_lock:
            queue = _chess_queues[difficulty]
            queue = [e for e in queue if e['channel'] != self.channel_name]

            opponent = None
            best_idx = None
            best_diff = float('inf')

            for i, entry in enumerate(queue):
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
                    'language_id': self._language_id,
                })

            _chess_queues[difficulty] = queue

        if opponent:
            await self.start_battle(opponent, difficulty)
        else:
            await self.send_json({
                'type': 'waiting',
                'message': f'Looking for a {difficulty} chess battle opponent...',
                'difficulty': difficulty,
                'your_elo': self._elo,
            })

    async def start_battle(self, opponent_entry, difficulty):
        """Pair two players and start the chess battle."""
        room_code = f'chess-{uuid.uuid4().hex[:8]}'
        self.battle_group = f'chess_{room_code}'
        self.room_code = room_code
        self.player_number = 2
        self.difficulty = difficulty

        battle = await self.create_chess_battle(
            room_code, difficulty, opponent_entry['user'], self.user
        )
        self.battle_id = battle.id

        await self.channel_layer.group_add(self.battle_group, self.channel_name)
        await self.channel_layer.group_add(self.battle_group, opponent_entry['channel'])

        my_elo_info = await self.get_user_elo_info(self.user)
        opp_elo_info = await self.get_user_elo_info(opponent_entry['user'])

        # Tell player 1
        await self.channel_layer.send(opponent_entry['channel'], {
            'type': 'chess.matched',
            'room_code': room_code,
            'battle_id': battle.id,
            'opponent': self.user.username,
            'opponent_elo': my_elo_info,
            'player_number': 1,
            'difficulty': difficulty,
        })

        # Tell ourselves (player 2)
        await self.send_json({
            'type': 'matched',
            'room_code': room_code,
            'battle_id': battle.id,
            'opponent': opponent_entry['user'].username,
            'opponent_elo': opp_elo_info,
            'player_number': 2,
            'difficulty': difficulty,
        })

        # Start countdown
        asyncio.ensure_future(self.run_countdown(room_code, battle.id))

    async def run_countdown(self, room_code, battle_id):
        """3-2-1 countdown then start."""
        for i in range(3, 0, -1):
            await self.channel_layer.group_send(f'chess_{room_code}', {
                'type': 'chess.countdown',
                'seconds': i,
            })
            await asyncio.sleep(1)

        challenge_data = await self.pick_challenge_and_start(battle_id)

        await self.channel_layer.group_send(f'chess_{room_code}', {
            'type': 'chess.start',
            'challenge': challenge_data,
        })

        # Start chess clock monitoring
        self._clock_task = asyncio.ensure_future(
            self.chess_clock_monitor(room_code, battle_id)
        )

    async def chess_clock_monitor(self, room_code, battle_id):
        """Periodically broadcast clock state and check for timeout."""
        while True:
            await asyncio.sleep(1)
            clock = await self.get_clock_state(battle_id)
            if not clock:
                break

            await self.channel_layer.group_send(f'chess_{room_code}', {
                'type': 'chess.clock_tick',
                'p1_time': clock['p1_time'],
                'p2_time': clock['p2_time'],
                'current_turn': clock['current_turn'],
            })

            # Check timeout
            if clock['p1_time'] <= 0 or clock['p2_time'] <= 0:
                # Whoever ran out of time — the OTHER player wins
                if clock['p1_time'] <= 0:
                    winner_num = 2
                else:
                    winner_num = 1
                await self.end_battle(battle_id, room_code, winner_number=winner_num, timeout=True)
                break

            # Check if battle already finished
            if clock['status'] == 'finished':
                break

    # ────────────────────────────────────────────────────────
    # Turn Submission
    # ────────────────────────────────────────────────────────
    async def handle_submit_line(self, content):
        """Player submits a single line of code."""
        if not self.battle_id:
            await self.send_json({'type': 'error', 'message': 'Not in a battle.'})
            return

        line_content = content.get('line', '')
        if not line_content:
            await self.send_json({'type': 'error', 'message': 'Empty line.'})
            return

        # Check if it's this player's turn
        is_valid_turn = await self.check_turn(self.battle_id, self.player_number)
        if not is_valid_turn:
            await self.send_json({'type': 'error', 'message': "It's not your turn!"})
            return

        # Add the line to shared code
        result = await self.add_line_to_code(
            self.battle_id, self.player_number, self.user, line_content
        )

        # Broadcast updated code to both players
        await self.channel_layer.group_send(self.battle_group, {
            'type': 'chess.code_updated',
            'shared_code': result['shared_code'],
            'move_number': result['move_number'],
            'player': self.player_number,
            'username': self.user.username,
            'line': line_content,
            'current_turn': result['next_turn'],
            'p1_time': result['p1_time'],
            'p2_time': result['p2_time'],
        })

        # Auto-run code against test cases after each move
        language_id = content.get('language_id', 71)
        test_cases = await self.get_test_cases(self.battle_id)
        total = len(test_cases)
        passed = 0
        test_results = []

        for tc in test_cases:
            judge_result = await run_judge0(result['shared_code'], language_id, tc['input_data'])
            actual = judge_result.get('stdout', '').strip()
            expected = tc['expected_output'].strip()
            is_pass = (actual == expected) and judge_result.get('status_id') == 3

            if is_pass:
                passed += 1

            tr = {
                'passed': is_pass,
                'is_sample': tc['is_sample'],
                'status': judge_result.get('status_desc', ''),
            }
            if tc['is_sample']:
                tr['input'] = tc['input_data']
                tr['expected'] = expected
                tr['actual'] = actual
                if judge_result.get('stderr'):
                    tr['stderr'] = judge_result['stderr'][:200]
            test_results.append(tr)

        all_passed = passed == total and total > 0

        # Update test scores
        await self.update_test_scores(self.battle_id, passed, total)

        # Broadcast test results
        await self.channel_layer.group_send(self.battle_group, {
            'type': 'chess.test_results',
            'passed': passed,
            'total': total,
            'all_passed': all_passed,
            'test_results': test_results,
            'after_move_by': self.player_number,
            'move_number': result['move_number'],
        })

        # If all tests pass — the player who wrote this line wins!
        if all_passed:
            await self.end_battle(
                self.battle_id, self.room_code,
                winner_number=self.player_number
            )

    async def handle_delete_line(self, content):
        """Player uses their turn to delete a line (strategic move)."""
        if not self.battle_id:
            await self.send_json({'type': 'error', 'message': 'Not in a battle.'})
            return

        is_valid_turn = await self.check_turn(self.battle_id, self.player_number)
        if not is_valid_turn:
            await self.send_json({'type': 'error', 'message': "It's not your turn!"})
            return

        line_number = content.get('line_number', -1)
        result = await self.delete_line_from_code(
            self.battle_id, self.player_number, self.user, line_number
        )

        if not result:
            await self.send_json({'type': 'error', 'message': 'Invalid line number.'})
            return

        await self.channel_layer.group_send(self.battle_group, {
            'type': 'chess.code_updated',
            'shared_code': result['shared_code'],
            'move_number': result['move_number'],
            'player': self.player_number,
            'username': self.user.username,
            'line': f'[DELETED LINE {line_number + 1}]',
            'current_turn': result['next_turn'],
            'p1_time': result['p1_time'],
            'p2_time': result['p2_time'],
        })

    async def handle_forfeit(self):
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

        await self.channel_layer.group_send(f'chess_{room_code}', {
            'type': 'chess.end',
            'battle_id': battle_id,
            'winner': result['winner'],
            'p1_score': result['p1_score'],
            'p2_score': result['p2_score'],
            'total_moves': result['total_moves'],
            'shared_code': result['shared_code'],
            'points_awarded': result['points_awarded'],
            'elo_changes': result.get('elo_changes', {}),
            'reason': 'forfeit' if forfeit else ('timeout' if timeout else 'solved'),
        })

        if self._clock_task and not self._clock_task.done():
            self._clock_task.cancel()

    # ────────────────────────────────────────────────────────
    # Group message handlers
    # ────────────────────────────────────────────────────────
    async def chess_matched(self, event):
        self.room_code = event['room_code']
        self.battle_id = event['battle_id']
        self.player_number = event['player_number']
        self.battle_group = f"chess_{event['room_code']}"
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

    async def chess_countdown(self, event):
        await self.send_json({'type': 'countdown', 'seconds': event['seconds']})

    async def chess_start(self, event):
        await self.send_json({
            'type': 'battle_start',
            'challenge': event['challenge'],
            'current_turn': 1,
            'mode': 'chess',
        })

    async def chess_code_updated(self, event):
        await self.send_json({
            'type': 'code_updated',
            'shared_code': event['shared_code'],
            'move_number': event['move_number'],
            'player': event['player'],
            'username': event['username'],
            'line': event['line'],
            'current_turn': event['current_turn'],
            'p1_time': event['p1_time'],
            'p2_time': event['p2_time'],
        })

    async def chess_test_results(self, event):
        await self.send_json({
            'type': 'test_results',
            'passed': event['passed'],
            'total': event['total'],
            'all_passed': event['all_passed'],
            'test_results': event['test_results'],
            'after_move_by': event['after_move_by'],
            'move_number': event['move_number'],
        })

    async def chess_clock_tick(self, event):
        await self.send_json({
            'type': 'clock_tick',
            'p1_time': event['p1_time'],
            'p2_time': event['p2_time'],
            'current_turn': event['current_turn'],
        })

    async def chess_end(self, event):
        await self.send_json({
            'type': 'battle_end',
            'battle_id': event.get('battle_id'),
            'winner': event['winner'],
            'p1_score': event['p1_score'],
            'p2_score': event['p2_score'],
            'total_moves': event['total_moves'],
            'shared_code': event['shared_code'],
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
    # Database helpers
    # ────────────────────────────────────────────────────────
    @database_sync_to_async
    def create_chess_battle(self, room_code, difficulty, player1, player2):
        from .models import ChessBattle
        return ChessBattle.objects.create(
            room_code=room_code,
            difficulty=difficulty,
            player1=player1,
            player2=player2,
            status='waiting',
        )

    @database_sync_to_async
    def pick_challenge_and_start(self, battle_id):
        from .models import ChessBattle, CodeChallenge
        battle = ChessBattle.objects.get(id=battle_id)
        challenge = CodeChallenge.objects.filter(
            difficulty=battle.difficulty, is_active=True
        ).order_by('?').first()

        if not challenge:
            challenge = CodeChallenge.objects.filter(is_active=True).order_by('?').first()

        battle.challenge = challenge
        battle.status = 'in_progress'
        battle.started_at = timezone.now()
        battle.turn_started_at = timezone.now()
        battle.current_turn = 1
        battle.total_tests = challenge.test_cases.count()
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
            'starter_python': challenge.starter_python,
            'starter_javascript': challenge.starter_javascript,
            'starter_cpp': challenge.starter_cpp,
            'starter_java': challenge.starter_java,
            'sample_tests': sample_tests,
            'total_tests': battle.total_tests,
            'initial_time': battle.initial_time,
        }

    @database_sync_to_async
    def check_turn(self, battle_id, player_number):
        from .models import ChessBattle
        try:
            battle = ChessBattle.objects.get(id=battle_id)
            return battle.current_turn == player_number and battle.status == 'in_progress'
        except ChessBattle.DoesNotExist:
            return False

    @database_sync_to_async
    def add_line_to_code(self, battle_id, player_number, user, line_content):
        from .models import ChessBattle, ChessMove
        battle = ChessBattle.objects.get(id=battle_id)

        # Calculate time spent on this move
        now = timezone.now()
        time_spent = 0.0
        if battle.turn_started_at:
            time_spent = (now - battle.turn_started_at).total_seconds()

        # Deduct time from player's clock
        if player_number == 1:
            battle.p1_time_remaining = max(0, battle.p1_time_remaining - time_spent)
            battle.p1_lines_written += 1
        else:
            battle.p2_time_remaining = max(0, battle.p2_time_remaining - time_spent)
            battle.p2_lines_written += 1

        # Append line to shared code
        battle.move_count += 1
        if battle.shared_code:
            battle.shared_code += '\n' + line_content
        else:
            battle.shared_code = line_content

        # Switch turns
        battle.current_turn = 2 if player_number == 1 else 1
        battle.turn_started_at = now
        battle.save()

        # Record the move
        ChessMove.objects.create(
            battle=battle,
            player=user,
            move_number=battle.move_count,
            line_content=line_content,
            time_spent=time_spent,
        )

        return {
            'shared_code': battle.shared_code,
            'move_number': battle.move_count,
            'next_turn': battle.current_turn,
            'p1_time': round(battle.p1_time_remaining, 1),
            'p2_time': round(battle.p2_time_remaining, 1),
        }

    @database_sync_to_async
    def delete_line_from_code(self, battle_id, player_number, user, line_number):
        from .models import ChessBattle, ChessMove
        battle = ChessBattle.objects.get(id=battle_id)

        lines = battle.shared_code.split('\n')
        if line_number < 0 or line_number >= len(lines):
            return None

        # Calculate time spent
        now = timezone.now()
        time_spent = 0.0
        if battle.turn_started_at:
            time_spent = (now - battle.turn_started_at).total_seconds()

        # Deduct time
        if player_number == 1:
            battle.p1_time_remaining = max(0, battle.p1_time_remaining - time_spent)
        else:
            battle.p2_time_remaining = max(0, battle.p2_time_remaining - time_spent)

        # Remove the line
        deleted_line = lines.pop(line_number)
        battle.shared_code = '\n'.join(lines)
        battle.move_count += 1
        battle.current_turn = 2 if player_number == 1 else 1
        battle.turn_started_at = now
        battle.save()

        ChessMove.objects.create(
            battle=battle,
            player=user,
            move_number=battle.move_count,
            line_content=f'[DELETE] {deleted_line}',
            time_spent=time_spent,
        )

        return {
            'shared_code': battle.shared_code,
            'move_number': battle.move_count,
            'next_turn': battle.current_turn,
            'p1_time': round(battle.p1_time_remaining, 1),
            'p2_time': round(battle.p2_time_remaining, 1),
        }

    @database_sync_to_async
    def get_clock_state(self, battle_id):
        from .models import ChessBattle
        try:
            battle = ChessBattle.objects.get(id=battle_id)
        except ChessBattle.DoesNotExist:
            return None

        if battle.status == 'finished':
            return {'status': 'finished', 'p1_time': 0, 'p2_time': 0, 'current_turn': 0}

        # Calculate live time remaining
        p1_time = battle.p1_time_remaining
        p2_time = battle.p2_time_remaining

        if battle.turn_started_at and battle.status == 'in_progress':
            elapsed = (timezone.now() - battle.turn_started_at).total_seconds()
            if battle.current_turn == 1:
                p1_time = max(0, p1_time - elapsed)
            else:
                p2_time = max(0, p2_time - elapsed)

        return {
            'status': battle.status,
            'p1_time': round(p1_time, 1),
            'p2_time': round(p2_time, 1),
            'current_turn': battle.current_turn,
        }

    @database_sync_to_async
    def get_test_cases(self, battle_id):
        from .models import ChessBattle
        battle = ChessBattle.objects.select_related('challenge').get(id=battle_id)
        return list(battle.challenge.test_cases.values(
            'input_data', 'expected_output', 'is_sample'
        ))

    @database_sync_to_async
    def update_test_scores(self, battle_id, passed, total):
        from .models import ChessBattle
        battle = ChessBattle.objects.get(id=battle_id)
        battle.tests_passed = passed
        battle.total_tests = total
        battle.save()

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
        from .models import ChessBattle
        from leaderboard.models import PlayerStats
        try:
            battle = ChessBattle.objects.get(id=battle_id)
        except ChessBattle.DoesNotExist:
            return None

        if battle.status == 'finished':
            return None

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
            # On timeout, compare tests passed (run final code)
            if battle.tests_passed > 0:
                # Last player to improve tests wins
                if battle.p1_lines_written > battle.p2_lines_written:
                    winner_user = battle.player1
                elif battle.p2_lines_written > battle.p1_lines_written:
                    winner_user = battle.player2
                else:
                    is_draw = True
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

        # Update ELO
        elo_changes = {}
        try:
            p1_stats, _ = PlayerStats.objects.get_or_create(user=battle.player1)
            p2_stats, _ = PlayerStats.objects.get_or_create(user=battle.player2)
            p1_old = p1_stats.elo_rating
            p2_old = p2_stats.elo_rating

            if is_draw:
                p1_change = p1_stats.update_elo(p2_old, won=False, draw=True)
                p2_change = p2_stats.update_elo(p1_old, won=False, draw=True)
            elif winner_user == battle.player1:
                p1_change = p1_stats.update_elo(p2_old, won=True)
                p2_change = p2_stats.update_elo(p1_old, won=False)
            elif winner_user == battle.player2:
                p1_change = p1_stats.update_elo(p2_old, won=False)
                p2_change = p2_stats.update_elo(p1_old, won=True)
            else:
                p1_change = p1_stats.update_elo(p2_old, won=False, draw=True)
                p2_change = p2_stats.update_elo(p1_old, won=False, draw=True)

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
            'p1_score': {
                'username': p1_name,
                'lines_written': battle.p1_lines_written,
                'time_remaining': round(battle.p1_time_remaining, 1),
            },
            'p2_score': {
                'username': p2_name,
                'lines_written': battle.p2_lines_written,
                'time_remaining': round(battle.p2_time_remaining, 1),
            },
            'total_moves': battle.move_count,
            'shared_code': battle.shared_code,
            'points_awarded': points,
            'elo_changes': elo_changes,
        }
