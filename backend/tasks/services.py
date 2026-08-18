"""Domain services for tasks: ordering and moves.

Ordering uses an integer ``position`` gap strategy (1000, 2000, ...). New
tasks are appended to the end of their cell. Moving computes a position
between two neighbours; when there is no room, the target cell is rebalanced
inside the same transaction.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max

from boards.models import Board, BoardColumn, BoardStatus

from .models import Task

POSITION_GAP = 1000


def _cell_qs(board: Board, status: BoardStatus, column: BoardColumn):
    return Task.objects.filter(board=board, status=status, column=column)


def next_position(board: Board, status: BoardStatus, column: BoardColumn) -> int:
    """Position for a task appended to the end of a cell."""
    current_max = _cell_qs(board, status, column).aggregate(m=Max("position"))["m"]
    if current_max is None:
        return POSITION_GAP
    return current_max + POSITION_GAP


def create_task(
    *,
    board: Board,
    column: BoardColumn,
    status: BoardStatus,
    title: str,
    description: str = "",
    doer=None,
    doer_id=None,
    deadline=None,
) -> Task:
    """Create a task appended to the end of its (status, column) cell.

    Accepts either a ``doer`` instance or a ``doer_id``; the instance wins.
    """
    task = Task(
        board=board,
        column=column,
        status=status,
        title=title,
        description=description,
        deadline=deadline,
        position=next_position(board, status, column),
    )
    if doer is not None:
        task.doer = doer
    elif doer_id is not None:
        task.doer_id = doer_id
    task.save()
    return task


def _rebalance(board: Board, status: BoardStatus, column: BoardColumn) -> None:
    """Rewrite positions in a cell to clean multiples of POSITION_GAP."""
    tasks = list(
        _cell_qs(board, status, column).order_by("position", "id")
    )
    for index, task in enumerate(tasks, start=1):
        new_pos = index * POSITION_GAP
        if task.position != new_pos:
            task.position = new_pos
            task.save(update_fields=["position"])


@transaction.atomic
def move_task(
    task: Task,
    *,
    column: BoardColumn,
    status: BoardStatus,
    before_task_id: int | None = None,
    after_task_id: int | None = None,
) -> Task:
    """Move ``task`` into (status, column) between two neighbours.

    ``before_task_id`` is the task that should end up immediately *above*
    (lower position) the moved task; ``after_task_id`` immediately *below*
    (higher position). Either may be None (drop at start/end of the cell).

    All integrity is validated here: column and status must belong to the
    same board as the task, and neighbour tasks must live in the target cell.
    """
    if column.board_id != task.board_id:
        raise ValidationError("Column does not belong to the task's board.")
    if status.board_id != task.board_id:
        raise ValidationError("Status does not belong to the task's board.")

    board = task.board

    # Resolve neighbours, ensuring they are in the destination cell and are not
    # the task being moved.
    def _resolve(neighbour_id):
        if neighbour_id is None:
            return None
        try:
            neighbour = Task.objects.get(pk=neighbour_id)
        except Task.DoesNotExist as exc:
            raise ValidationError("Neighbour task not found.") from exc
        if neighbour.pk == task.pk:
            return None
        if (
            neighbour.board_id != board.id
            or neighbour.status_id != status.id
            or neighbour.column_id != column.id
        ):
            raise ValidationError(
                "Neighbour task is not in the destination cell."
            )
        return neighbour

    before = _resolve(before_task_id)
    after = _resolve(after_task_id)

    before_pos = before.position if before else None
    after_pos = after.position if after else None

    if before_pos is None and after_pos is None:
        # Dropped into an (effectively) empty target or no neighbours given:
        # append to the end of the destination cell, excluding the task itself.
        others = _cell_qs(board, status, column).exclude(pk=task.pk)
        current_max = others.aggregate(m=Max("position"))["m"]
        new_position = (current_max or 0) + POSITION_GAP
    elif before_pos is None:
        # Drop at the very top.
        new_position = after_pos - POSITION_GAP
    elif after_pos is None:
        # Drop at the very bottom.
        new_position = before_pos + POSITION_GAP
    else:
        new_position = (before_pos + after_pos) // 2

    task.column = column
    task.status = status
    task.position = new_position
    task.save(update_fields=["column", "status", "position", "updated_at"])

    # If the gap collapsed (duplicate/adjacent positions), rebalance the cell
    # and re-read the moved task's position.
    if before_pos is not None and after_pos is not None and (
        new_position <= before_pos or new_position >= after_pos
    ):
        _rebalance(board, status, column)
        task.refresh_from_db(fields=["position"])

    return task
