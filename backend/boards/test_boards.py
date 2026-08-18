import pytest

from boards.models import BoardStatus
from boards.services import create_board_with_defaults, ensure_default_statuses

pytestmark = pytest.mark.django_db


def test_new_board_gets_default_statuses():
    board = create_board_with_defaults(name="Fresh")
    names = list(
        board.statuses.order_by("position").values_list("name", flat=True)
    )
    assert names == ["TODO", "DOING", "DONE"]


def test_ensure_default_statuses_is_idempotent():
    board = create_board_with_defaults(name="Fresh")
    ensure_default_statuses(board)
    assert BoardStatus.objects.filter(board=board).count() == 3


def test_custom_statuses_supported():
    board = create_board_with_defaults(
        name="Custom", statuses=["BACKLOG", "IN PROGRESS", "DEPLOYED"]
    )
    names = list(
        board.statuses.order_by("position").values_list("name", flat=True)
    )
    assert names == ["BACKLOG", "IN PROGRESS", "DEPLOYED"]
