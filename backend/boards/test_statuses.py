"""API + service tests for custom / collapsable status rows."""

import pytest

from boards.models import BoardStatus
from boards.services import create_status, delete_status
from conftest import make_task
from django.core.exceptions import ValidationError

pytestmark = pytest.mark.django_db


# --- board payload -------------------------------------------------------

def test_board_payload_exposes_collapse_fields(auth_client, board):
    resp = auth_client.get(f"/api/boards/{board.id}/")
    assert resp.status_code == 200
    status = resp.json()["statuses"][0]
    assert status["is_collapsible"] is False
    assert status["collapsed"] is False


# --- create --------------------------------------------------------------

def test_member_can_create_collapsable_row(auth_client, board):
    resp = auth_client.post(
        f"/api/boards/{board.id}/statuses/",
        {"name": "Passed Sprint", "is_collapsible": True},
        format="json",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Passed Sprint"
    assert data["is_collapsible"] is True
    assert data["collapsed"] is False
    # Appended to the end of the existing rows.
    assert data["position"] > board.statuses.exclude(id=data["id"]).order_by(
        "-position"
    ).first().position - 1


def test_create_row_rejects_blank_name(auth_client, board):
    resp = auth_client.post(
        f"/api/boards/{board.id}/statuses/",
        {"name": "   "},
        format="json",
    )
    assert resp.status_code == 400


def test_non_member_cannot_create_row(auth_client, other_board):
    resp = auth_client.post(
        f"/api/boards/{other_board.id}/statuses/",
        {"name": "Sneaky"},
        format="json",
    )
    assert resp.status_code in (403, 404)


# --- update: rename / toggle / collapse / reorder ------------------------

def test_member_can_toggle_and_collapse_row(auth_client, board):
    status = create_status(board, name="Archive", is_collapsible=True)
    resp = auth_client.patch(
        f"/api/statuses/{status.id}/",
        {"collapsed": True, "name": "Archived"},
        format="json",
    )
    assert resp.status_code == 200
    status.refresh_from_db()
    assert status.collapsed is True
    assert status.name == "Archived"


def test_non_member_cannot_update_row(api, outsider, board):
    api.force_authenticate(user=outsider)
    status = board.statuses.first()
    resp = api.patch(
        f"/api/statuses/{status.id}/", {"collapsed": True}, format="json"
    )
    assert resp.status_code in (403, 404)


# --- delete guard --------------------------------------------------------

def test_cannot_delete_row_with_tasks(auth_client, board, cells):
    columns, statuses = cells
    target = create_status(board, name="Archive", is_collapsible=True)
    make_task(board, columns["Backend"], target, title="archived")

    resp = auth_client.delete(f"/api/statuses/{target.id}/")
    assert resp.status_code == 400
    assert BoardStatus.objects.filter(id=target.id).exists()


def test_can_delete_empty_row(auth_client, board):
    target = create_status(board, name="Archive", is_collapsible=True)
    resp = auth_client.delete(f"/api/statuses/{target.id}/")
    assert resp.status_code == 204
    assert not BoardStatus.objects.filter(id=target.id).exists()


# --- service-level guard -------------------------------------------------

def test_delete_status_service_rejects_non_empty(board, cells):
    columns, statuses = cells
    target = create_status(board, name="Archive")
    make_task(board, columns["Backend"], target)
    with pytest.raises(ValidationError):
        delete_status(target)


def test_move_task_into_collapsable_row_works(auth_client, board, cells):
    """Dragging a done task into the archive row uses the normal move path."""
    columns, statuses = cells
    archive = create_status(board, name="Archive", is_collapsible=True)
    task = make_task(board, columns["Backend"], statuses["DONE"])

    resp = auth_client.post(
        f"/api/tasks/{task.id}/move/",
        {"column_id": columns["Backend"].id, "status_id": archive.id},
        format="json",
    )
    assert resp.status_code == 200
    task.refresh_from_db()
    assert task.status_id == archive.id
