"""Domain services for boards.

Business logic lives here (not in signals or views) so board creation and
default seeding are explicit and reusable.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max

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


def next_status_position(board: Board) -> int:
    """Position for a status appended to the end of a board's row list."""
    current_max = board.statuses.aggregate(m=Max("position"))["m"]
    if current_max is None:
        return POSITION_GAP
    return current_max + POSITION_GAP


def create_status(
    board: Board, *, name: str, is_collapsible: bool = False
) -> BoardStatus:
    """Create a custom status (row) appended to the end of the board."""
    clean_name = (name or "").strip()
    if not clean_name:
        raise ValidationError("Status name cannot be empty.")
    return BoardStatus.objects.create(
        board=board,
        name=clean_name,
        is_collapsible=is_collapsible,
        position=next_status_position(board),
    )


def delete_status(status: BoardStatus) -> None:
    """Delete a status row.

    Guarded: refuses to delete a row that still holds tasks, so archived
    work is never destroyed by accident. Move or clear its tasks first.
    """
    if status.tasks.exists():
        raise ValidationError(
            "Cannot delete a row that still contains tasks. "
            "Move or remove its tasks first."
        )
    status.delete()


def add_member(board: Board, user) -> BoardMember:
    """Idempotently add a user to a board."""
    member, _ = BoardMember.objects.get_or_create(board=board, user=user)
    return member
