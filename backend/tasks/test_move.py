"""Tests for the task move endpoint and ordering service."""

import pytest

from conftest import make_task
from tasks.models import Task
from tasks.services import move_task

pytestmark = pytest.mark.django_db


def _three_tasks(board, column, status):
    a = make_task(board, column, status, title="A")
    b = make_task(board, column, status, title="B")
    c = make_task(board, column, status, title="C")
    return a, b, c


def _order(board, column, status):
    return list(
        Task.objects.filter(board=board, column=column, status=status)
        .order_by("position", "id")
        .values_list("title", flat=True)
    )


# --- endpoint permissions ------------------------------------------------

def test_member_can_move(auth_client, board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    resp = auth_client.post(
        f"/api/tasks/{c.id}/move/",
        {
            "column_id": columns["Backend"].id,
            "status_id": statuses["TODO"].id,
            "before_task_id": a.id,
            "after_task_id": b.id,
        },
        format="json",
    )
    assert resp.status_code == 200
    assert _order(board, columns["Backend"], statuses["TODO"]) == ["A", "C", "B"]


def test_non_member_cannot_move(api, board, outsider, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    api.force_authenticate(user=outsider)
    resp = api.post(
        f"/api/tasks/{c.id}/move/",
        {"column_id": columns["Backend"].id, "status_id": statuses["TODO"].id},
        format="json",
    )
    assert resp.status_code in (403, 404)


def test_move_rejects_cross_board_column(auth_client, board, other_board, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"])
    other_col = other_board.columns.first()
    resp = auth_client.post(
        f"/api/tasks/{task.id}/move/",
        {"column_id": other_col.id, "status_id": statuses["TODO"].id},
        format="json",
    )
    assert resp.status_code == 400


def test_move_rejects_cross_board_status(auth_client, board, other_board, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"])
    other_status = other_board.statuses.first()
    resp = auth_client.post(
        f"/api/tasks/{task.id}/move/",
        {"column_id": columns["Backend"].id, "status_id": other_status.id},
        format="json",
    )
    assert resp.status_code == 400


def test_move_persists_position(auth_client, board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    auth_client.post(
        f"/api/tasks/{c.id}/move/",
        {
            "column_id": columns["Backend"].id,
            "status_id": statuses["TODO"].id,
            "before_task_id": a.id,
            "after_task_id": b.id,
        },
        format="json",
    )
    c.refresh_from_db()
    assert a.position < c.position < b.position


# --- ordering service ----------------------------------------------------

def test_move_within_cell(board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    move_task(
        c, column=columns["Backend"], status=statuses["TODO"],
        before_task_id=a.id, after_task_id=b.id,
    )
    assert _order(board, columns["Backend"], statuses["TODO"]) == ["A", "C", "B"]


def test_move_to_another_cell(board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    move_task(a, column=columns["Frontend"], status=statuses["DOING"])
    a.refresh_from_db()
    assert a.column_id == columns["Frontend"].id
    assert a.status_id == statuses["DOING"].id
    assert _order(board, columns["Backend"], statuses["TODO"]) == ["B", "C"]
    assert _order(board, columns["Frontend"], statuses["DOING"]) == ["A"]


def test_move_to_beginning(board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    move_task(
        c, column=columns["Backend"], status=statuses["TODO"],
        before_task_id=None, after_task_id=a.id,
    )
    assert _order(board, columns["Backend"], statuses["TODO"]) == ["C", "A", "B"]


def test_move_to_end(board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    move_task(
        a, column=columns["Backend"], status=statuses["TODO"],
        before_task_id=c.id, after_task_id=None,
    )
    assert _order(board, columns["Backend"], statuses["TODO"]) == ["B", "C", "A"]


def test_move_between_two_rebalances_when_needed(board, cells):
    columns, statuses = cells
    a, b, c = _three_tasks(board, columns["Backend"], statuses["TODO"])
    # Force adjacent positions so the midpoint has no room, triggering rebalance.
    a.position, b.position = 1000, 1001
    a.save(update_fields=["position"])
    b.save(update_fields=["position"])
    move_task(
        c, column=columns["Backend"], status=statuses["TODO"],
        before_task_id=a.id, after_task_id=b.id,
    )
    order = _order(board, columns["Backend"], statuses["TODO"])
    assert order == ["A", "C", "B"]
    positions = list(
        Task.objects.filter(board=board, column=columns["Backend"], status=statuses["TODO"])
        .order_by("position")
        .values_list("position", flat=True)
    )
    # Strictly increasing after rebalance.
    assert positions == sorted(positions)
    assert len(set(positions)) == len(positions)
