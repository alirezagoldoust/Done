from django.conf import settings
from django.db import models

from boards.models import Board, BoardColumn, BoardStatus


class Task(models.Model):
    """A single task pinned to one board, column (category) and status.

    Ordering within a status/column cell is governed by the integer
    ``position`` field (gap strategy, see tasks.services).
    """

    class Color(models.TextChoices):
        DEFAULT = "default", "Default"
        PURPLE = "purple", "Purple"
        BLUE = "blue", "Blue"
        TEAL = "teal", "Teal"
        RED = "red", "Red"

    board = models.ForeignKey(
        Board, related_name="tasks", on_delete=models.CASCADE
    )
    column = models.ForeignKey(
        BoardColumn, related_name="tasks", on_delete=models.CASCADE
    )
    status = models.ForeignKey(
        BoardStatus, related_name="tasks", on_delete=models.CASCADE
    )

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    doer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    deadline = models.DateField(null=True, blank=True)
    color = models.CharField(
        max_length=16, choices=Color.choices, default=Color.DEFAULT
    )
    position = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        indexes = [
            models.Index(
                fields=["board", "status", "column", "position"],
                name="task_cell_order_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.title
