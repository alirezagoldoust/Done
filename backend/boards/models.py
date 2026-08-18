from django.conf import settings
from django.db import models


class Board(models.Model):
    """A board owned by many users (through BoardMember).

    Holds its own columns (categories) and statuses (workflow states).
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class BoardMember(models.Model):
    """Membership link between a user and a board.

    Access control is derived entirely from these rows.
    """

    board = models.ForeignKey(
        Board, related_name="members", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="board_memberships",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["board", "user"], name="uniq_board_member"
            )
        ]
        indexes = [models.Index(fields=["board", "user"])]
        ordering = ["board", "user__username"]

    def __str__(self) -> str:
        return f"{self.user} @ {self.board}"


class BoardColumn(models.Model):
    """A task category within a board (e.g. Backend, Frontend)."""

    board = models.ForeignKey(
        Board, related_name="columns", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=100)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        indexes = [models.Index(fields=["board", "position"])]

    def __str__(self) -> str:
        return f"{self.board.name} / {self.name}"


class BoardStatus(models.Model):
    """A workflow state within a board (e.g. TODO, DOING, DONE)."""

    board = models.ForeignKey(
        Board, related_name="statuses", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=100)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name_plural = "board statuses"
        indexes = [models.Index(fields=["board", "position"])]

    def __str__(self) -> str:
        return f"{self.board.name} / {self.name}"
