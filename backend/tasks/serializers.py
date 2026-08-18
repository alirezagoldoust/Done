from rest_framework import serializers

from boards.models import BoardColumn, BoardMember, BoardStatus
from users.serializers import UserSerializer

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    """Read/update representation of a task.

    ``column`` and ``status`` serialise to their ids and accept ids on write.
    ``doer`` is a nested user on read; ``doer_id`` sets/clears it on write.
    """

    column = serializers.PrimaryKeyRelatedField(
        queryset=BoardColumn.objects.all()
    )
    status = serializers.PrimaryKeyRelatedField(
        queryset=BoardStatus.objects.all()
    )
    doer = UserSerializer(read_only=True)
    doer_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "board",
            "column",
            "status",
            "title",
            "description",
            "doer",
            "doer_id",
            "deadline",
            "color",
            "position",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["board", "position", "created_at", "updated_at"]

    # ---- validation -----------------------------------------------------

    def validate_title(self, value: str) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def _board_for(self, attrs):
        # On update, the task already has a board; on create the view injects it.
        if self.instance is not None:
            return self.instance.board
        return attrs.get("board") or self.context.get("board")

    def validate(self, attrs):
        board = self._board_for(attrs)
        if board is None:
            raise serializers.ValidationError("Board could not be determined.")

        column = attrs.get("column") or (self.instance and self.instance.column)
        status = attrs.get("status") or (self.instance and self.instance.status)

        if column is not None and column.board_id != board.id:
            raise serializers.ValidationError(
                {"column": "Column does not belong to this board."}
            )
        if status is not None and status.board_id != board.id:
            raise serializers.ValidationError(
                {"status": "Status does not belong to this board."}
            )

        if "doer_id" in attrs and attrs["doer_id"] is not None:
            is_member = BoardMember.objects.filter(
                board=board, user_id=attrs["doer_id"]
            ).exists()
            if not is_member:
                raise serializers.ValidationError(
                    {"doer_id": "Assignee must be a member of this board."}
                )
        return attrs

    def update(self, instance, validated_data):
        if "doer_id" in validated_data:
            instance.doer_id = validated_data.pop("doer_id")
        return super().update(instance, validated_data)


class TaskCreateSerializer(TaskSerializer):
    """Quick-create: only title + column required; status/position defaulted."""

    status = serializers.PrimaryKeyRelatedField(
        queryset=BoardStatus.objects.all(), required=False
    )

    class Meta(TaskSerializer.Meta):
        read_only_fields = ["board", "position", "created_at", "updated_at"]


class TaskMoveSerializer(serializers.Serializer):
    """Payload for POST /api/tasks/:id/move/."""

    column_id = serializers.IntegerField()
    status_id = serializers.IntegerField()
    before_task_id = serializers.IntegerField(
        required=False, allow_null=True
    )
    after_task_id = serializers.IntegerField(
        required=False, allow_null=True
    )
