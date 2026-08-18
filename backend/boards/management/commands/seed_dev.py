"""Seed the database with realistic development data.

Idempotent-ish: running it clears previously seeded boards (by name) and
recreates them. Uses only fake data.
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from boards.models import Board, BoardColumn
from boards.services import add_member, create_board_with_defaults
from tasks.services import create_task

USERS = [
    {"username": "alice", "first_name": "Alice", "last_name": "Nguyen", "email": "alice@example.com"},
    {"username": "bob", "first_name": "Bob", "last_name": "Martel", "email": "bob@example.com"},
    {"username": "carol", "first_name": "Carol", "last_name": "Diaz", "email": "carol@example.com"},
]

PASSWORD = "password123"


class Command(BaseCommand):
    help = "Seed development data (users, boards, columns, statuses, tasks)."

    def handle(self, *args, **options):
        today = timezone.now().date()

        # --- users -------------------------------------------------------
        users = {}
        for spec in USERS:
            user, created = User.objects.get_or_create(
                username=spec["username"],
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "email": spec["email"],
                },
            )
            user.set_password(PASSWORD)
            user.save()
            users[spec["username"]] = user
        self.stdout.write(self.style.SUCCESS(f"Users ready: {', '.join(users)}"))

        # A superuser for the admin, if none exists.
        if not User.objects.filter(is_superuser=True).exists():
            admin = User.objects.create_superuser(
                "admin", "admin@example.com", "admin12345"
            )
            self.stdout.write(
                self.style.SUCCESS("Created superuser 'admin' / 'admin12345'")
            )

        # --- clear previously seeded boards -----------------------------
        Board.objects.filter(
            name__in=["Product Launch", "Platform Rebuild"]
        ).delete()

        # --- board 1: default statuses ----------------------------------
        board1 = create_board_with_defaults(
            name="Product Launch",
            description="Cross-functional board for the Q3 launch.",
            columns=["Backend", "Frontend", "Financial", "Infrastructure"],
        )
        for uname in ("alice", "bob", "carol"):
            add_member(board1, users[uname])

        # --- board 2: custom statuses -----------------------------------
        board2 = create_board_with_defaults(
            name="Platform Rebuild",
            description="Engineering board with a longer workflow.",
            statuses=["BACKLOG", "IN PROGRESS", "CODE REVIEW", "TESTING", "DEPLOYED"],
            columns=["Backend", "Frontend", "Infrastructure"],
        )
        for uname in ("alice", "bob"):
            add_member(board2, users[uname])

        self._seed_board1_tasks(board1, users, today)
        self._seed_board2_tasks(board2, users, today)

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write(
            "Log in as alice / bob / carol (password: password123)."
        )

    def _cols(self, board):
        return {c.name: c for c in board.columns.all()}

    def _statuses(self, board):
        return {s.name: s for s in board.statuses.order_by("position")}

    def _seed_board1_tasks(self, board, users, today):
        cols = self._cols(board)
        st = self._statuses(board)
        a, b, c = users["alice"], users["bob"], users["carol"]

        rows = [
            ("Implement JWT authentication", cols["Backend"], st["DOING"], a, today + timedelta(days=1), "Access + refresh tokens with rotation."),
            ("Design board grid layout", cols["Frontend"], st["DOING"], b, today + timedelta(days=2), ""),
            ("Set up Postgres backups", cols["Infrastructure"], st["TODO"], None, None, "Nightly snapshots to object storage."),
            ("Draft Q3 budget", cols["Financial"], st["TODO"], c, today + timedelta(days=5), ""),
            ("Task move API", cols["Backend"], st["TODO"], a, None, "Atomic reorder with position rebalancing."),
            ("Task card component", cols["Frontend"], st["TODO"], b, None, ""),
            ("Board membership permissions", cols["Backend"], st["DONE"], a, today - timedelta(days=1), ""),
            ("Wireframe dashboard", cols["Frontend"], st["DONE"], b, None, "Approved by design."),
            ("Vendor cost analysis", cols["Financial"], st["DOING"], c, today + timedelta(days=3), ""),
            ("CI pipeline", cols["Infrastructure"], st["DOING"], None, today + timedelta(days=4), "Lint + tests + build."),
            ("Search endpoint", cols["Backend"], st["TODO"], None, None, ""),
            ("My-tasks filter", cols["Frontend"], st["TODO"], a, today + timedelta(days=2), ""),
            ("Invoice reconciliation", cols["Financial"], st["DONE"], c, today - timedelta(days=2), ""),
            ("Provision staging", cols["Infrastructure"], st["DONE"], None, None, ""),
            ("Rate limiting", cols["Backend"], st["TODO"], b, None, "Protect the auth endpoints."),
            ("Empty states", cols["Frontend"], st["DOING"], a, None, ""),
        ]
        for title, col, status_obj, doer, deadline, desc in rows:
            create_task(
                board=board, column=col, status=status_obj,
                title=title, description=desc, doer=doer, deadline=deadline,
            )

    def _seed_board2_tasks(self, board, users, today):
        cols = self._cols(board)
        st = self._statuses(board)
        a, b = users["alice"], users["bob"]

        rows = [
            ("Extract service layer", cols["Backend"], st["IN PROGRESS"], a, today + timedelta(days=2), "Move logic out of views."),
            ("Migrate to App Router", cols["Frontend"], st["CODE REVIEW"], b, None, ""),
            ("Terraform modules", cols["Infrastructure"], st["BACKLOG"], None, None, ""),
            ("Domain events", cols["Backend"], st["BACKLOG"], a, None, ""),
            ("Design tokens", cols["Frontend"], st["TESTING"], b, today + timedelta(days=1), ""),
            ("Blue/green deploy", cols["Infrastructure"], st["DEPLOYED"], None, today - timedelta(days=3), "Cutover complete."),
            ("Query optimisation", cols["Backend"], st["IN PROGRESS"], b, None, "Kill N+1 on the board endpoint."),
            ("Skeleton loaders", cols["Frontend"], st["BACKLOG"], a, None, ""),
            ("Observability stack", cols["Infrastructure"], st["IN PROGRESS"], None, today + timedelta(days=6), ""),
            ("Auth refresh flow", cols["Frontend"], st["TESTING"], a, None, ""),
            ("Soft-delete tasks", cols["Backend"], st["BACKLOG"], None, None, ""),
            ("Load testing", cols["Infrastructure"], st["CODE REVIEW"], b, today + timedelta(days=4), ""),
        ]
        for title, col, status_obj, doer, deadline, desc in rows:
            create_task(
                board=board, column=col, status=status_obj,
                title=title, description=desc, doer=doer, deadline=deadline,
            )
