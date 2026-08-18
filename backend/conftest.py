import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from boards.services import add_member, create_board_with_defaults
from tasks.services import create_task


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def member(db):
    return User.objects.create_user("member", password="pw")


@pytest.fixture
def outsider(db):
    return User.objects.create_user("outsider", password="pw")


@pytest.fixture
def board(db, member):
    b = create_board_with_defaults(
        name="Test Board",
        columns=["Backend", "Frontend"],
    )
    add_member(b, member)
    return b


@pytest.fixture
def other_board(db, outsider):
    b = create_board_with_defaults(name="Other Board", columns=["Ops"])
    add_member(b, outsider)
    return b


@pytest.fixture
def auth_client(api, member):
    api.force_authenticate(user=member)
    return api


@pytest.fixture
def cells(board):
    """Convenience accessor for the test board's columns and statuses."""
    columns = {c.name: c for c in board.columns.all()}
    statuses = {s.name: s for s in board.statuses.order_by("position")}
    return columns, statuses


def make_task(board, column, status, title="T", **kwargs):
    return create_task(
        board=board, column=column, status=status, title=title, **kwargs
    )
