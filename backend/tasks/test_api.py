"""API-level tests: authentication, permissions, integrity, creation, update."""

import pytest
from django.contrib.auth.models import User

from boards.services import add_member
from conftest import make_task

pytestmark = pytest.mark.django_db


# --- authentication ------------------------------------------------------

def test_unauthenticated_cannot_list_boards(api):
    resp = api.get("/api/boards/")
    assert resp.status_code in (401, 403)


def test_unauthenticated_cannot_access_board(api, board):
    resp = api.get(f"/api/boards/{board.id}/")
    assert resp.status_code in (401, 403)


# --- board permissions ---------------------------------------------------

def test_member_sees_only_their_boards(auth_client, board, other_board):
    resp = auth_client.get("/api/boards/")
    assert resp.status_code == 200
    ids = {b["id"] for b in resp.json()}
    assert board.id in ids
    assert other_board.id not in ids


def test_member_can_open_board(auth_client, board):
    resp = auth_client.get(f"/api/boards/{board.id}/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == board.id
    assert len(data["columns"]) == 2
    assert len(data["statuses"]) == 3
    assert "tasks" in data


def test_non_member_cannot_open_board(auth_client, other_board):
    resp = auth_client.get(f"/api/boards/{other_board.id}/")
    assert resp.status_code in (403, 404)


# --- task creation -------------------------------------------------------

def test_member_can_create_task(auth_client, board, cells):
    columns, _ = cells
    resp = auth_client.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "New task", "column": columns["Backend"].id},
        format="json",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "New task"
    # Defaults to the first status.
    first_status = board.statuses.order_by("position").first()
    assert data["status"] == first_status.id
    assert data["position"] > 0


def test_create_task_requires_title(auth_client, board, cells):
    columns, _ = cells
    resp = auth_client.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "   ", "column": columns["Backend"].id},
        format="json",
    )
    assert resp.status_code == 400


def test_non_member_cannot_create_task(api, board, outsider, cells):
    columns, _ = cells
    api.force_authenticate(user=outsider)
    resp = api.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "Nope", "column": columns["Backend"].id},
        format="json",
    )
    assert resp.status_code in (403, 404)


def test_create_task_rejects_cross_board_column(auth_client, board, other_board):
    other_col = other_board.columns.first()
    resp = auth_client.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "X", "column": other_col.id},
        format="json",
    )
    assert resp.status_code == 400


def test_create_task_rejects_non_member_doer(auth_client, board, outsider, cells):
    columns, _ = cells
    resp = auth_client.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "X", "column": columns["Backend"].id, "doer_id": outsider.id},
        format="json",
    )
    assert resp.status_code == 400


def test_create_task_accepts_member_doer(auth_client, board, member, cells):
    columns, _ = cells
    resp = auth_client.post(
        f"/api/boards/{board.id}/tasks/",
        {"title": "X", "column": columns["Backend"].id, "doer_id": member.id},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.json()["doer"]["id"] == member.id


# --- task update ---------------------------------------------------------

def test_member_can_update_task(auth_client, board, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"], title="Old")
    resp = auth_client.patch(
        f"/api/tasks/{task.id}/", {"title": "Updated"}, format="json"
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


def test_update_rejects_cross_board_status(auth_client, board, other_board, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"])
    other_status = other_board.statuses.first()
    resp = auth_client.patch(
        f"/api/tasks/{task.id}/", {"status": other_status.id}, format="json"
    )
    assert resp.status_code == 400


def test_non_member_cannot_update_task(api, board, outsider, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"])
    api.force_authenticate(user=outsider)
    resp = api.patch(f"/api/tasks/{task.id}/", {"title": "Hax"}, format="json")
    assert resp.status_code in (403, 404)


def test_member_can_delete_task(auth_client, board, cells):
    columns, statuses = cells
    task = make_task(board, columns["Backend"], statuses["TODO"])
    resp = auth_client.delete(f"/api/tasks/{task.id}/")
    assert resp.status_code == 204
