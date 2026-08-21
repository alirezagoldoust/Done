from rest_framework import serializers

from tasks.serializers import TaskSerializer
from users.serializers import UserSerializer

from .models import Board, BoardColumn, BoardMember, BoardStatus


class BoardMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = BoardMember
        fields = ["id", "user", "created_at"]


class BoardColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardColumn
        fields = ["id", "name", "position"]


class BoardStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardStatus
        fields = ["id", "name", "position", "is_collapsible", "collapsed"]


class BoardStatusWriteSerializer(serializers.ModelSerializer):
    """Create/update payload for a status row.

    ``name`` and ``is_collapsible`` are settable on create; ``collapsed`` and
    ``position`` (reorder) are settable on update. Positioning on create is
    handled by the service, so ``position`` stays read-only there.
    """

    class Meta:
        model = BoardStatus
        fields = ["id", "name", "position", "is_collapsible", "collapsed"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "name": {"required": False},
            "position": {"required": False},
            "is_collapsible": {"required": False},
            "collapsed": {"required": False},
        }

    def validate_name(self, value: str) -> str:
        clean = (value or "").strip()
        if not clean:
            raise serializers.ValidationError("Status name cannot be empty.")
        return clean


class BoardListSerializer(serializers.ModelSerializer):
    """Lightweight board representation for the dashboard."""

    member_count = serializers.IntegerField(read_only=True)
    task_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Board
        fields = [
            "id",
            "name",
            "description",
            "member_count",
            "task_count",
            "created_at",
            "updated_at",
        ]


class BoardDetailSerializer(serializers.ModelSerializer):
    """Full board payload — everything needed to render the grid in one call."""

    columns = BoardColumnSerializer(many=True, read_only=True)
    statuses = BoardStatusSerializer(many=True, read_only=True)
    members = BoardMemberSerializer(many=True, read_only=True)
    tasks = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            "id",
            "name",
            "description",
            "columns",
            "statuses",
            "members",
            "tasks",
            "created_at",
            "updated_at",
        ]

    def get_tasks(self, obj: Board):
        # Uses the prefetched, ordered queryset set on the view to avoid N+1.
        tasks = getattr(obj, "prefetched_tasks", None)
        if tasks is None:
            tasks = obj.tasks.all()
        return TaskSerializer(tasks, many=True, context=self.context).data
