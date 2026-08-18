"""DRF permission classes enforcing board membership.

Membership is always resolved from the database — board/task IDs supplied by
the client are never trusted.
"""

from rest_framework import permissions

from .models import Board, BoardMember


def is_member(user, board_id) -> bool:
    """True if ``user`` is a member of the board identified by ``board_id``."""
    if not user or not user.is_authenticated:
        return False
    return BoardMember.objects.filter(board_id=board_id, user=user).exists()


class IsBoardMember(permissions.BasePermission):
    """Object-level: the user must be a member of the object's board.

    Works for Board instances and for any object exposing a ``board_id``.
    """

    message = "You do not have access to this board."

    def has_object_permission(self, request, view, obj):
        board_id = obj.id if isinstance(obj, Board) else getattr(obj, "board_id", None)
        return is_member(request.user, board_id)
