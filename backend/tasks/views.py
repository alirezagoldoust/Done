from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from boards.models import BoardColumn, BoardStatus
from boards.permissions import IsBoardMember

from .models import Task
from .serializers import TaskMoveSerializer, TaskSerializer
from .services import move_task


class TaskViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Retrieve, update, delete and move individual tasks.

    Every task is scoped to boards the user belongs to; cross-board access is
    impossible because the queryset filters on membership.
    """

    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardMember]

    def get_queryset(self):
        return (
            Task.objects.filter(board__members__user=self.request.user)
            .select_related("board", "column", "status", "doer")
            .distinct()
        )

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        task = self.get_object()

        payload = TaskMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        column = BoardColumn.objects.filter(pk=data["column_id"]).first()
        target_status = BoardStatus.objects.filter(pk=data["status_id"]).first()
        if column is None or target_status is None:
            raise ValidationError("Destination column or status not found.")

        try:
            task = move_task(
                task,
                column=column,
                status=target_status,
                before_task_id=data.get("before_task_id"),
                after_task_id=data.get("after_task_id"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)

        return Response(
            TaskSerializer(task, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
