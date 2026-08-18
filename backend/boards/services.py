"""Domain services for boards.

Business logic lives here (not in signals or views) so board creation and
default seeding are explicit and reusable.
"""

from __future__ import annotations

from django.db import transaction

from .models import Board, BoardColumn, BoardMember, BoardStatus

DEFAULT_STATUSES = ["TODO", "DOING", "DONE"]
POSITION_GAP = 1000


@transaction.atomic
def create_board_with_defaults(
    *,
    name: str,
    description: str = "",
    statuses: list[str] | None = None,
    columns: list[str] | None = None,
) -> Board:
    """Create a board and seed its default statuses (and optional columns)."""
    board = Board.objects.create(name=name, description=description)
    ensure_default_statuses(board, statuses)
    for index, column_name in enumerate(columns or [], start=1):
        BoardColumn.objects.create(
            board=board, name=column_name, position=index * POSITION_GAP
        )
    return board


def ensure_default_statuses(
    board: Board, statuses: list[str] | None = None
) -> list[BoardStatus]:
    """Create the default statuses for a board if it has none yet."""
    if board.statuses.exists():
        return list(board.statuses.all())

    names = statuses or DEFAULT_STATUSES
    created = [
        BoardStatus.objects.create(
            board=board, name=name, position=index * POSITION_GAP
        )
        for index, name in enumerate(names, start=1)
    ]
    return created


def add_member(board: Board, user) -> BoardMember:
    """Idempotently add a user to a board."""
    member, _ = BoardMember.objects.get_or_create(board=board, user=user)
    return member
