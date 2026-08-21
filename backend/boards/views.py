from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Prefetch
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from tasks.models import Task
from tasks.serializers import TaskCreateSerializer, TaskSerializer
from tasks.services import create_task

from .models import Board, BoardMember, BoardStatus
from .permissions import IsBoardMember, is_member
from .serializers import (
    BoardColumnSerializer,
    BoardDetailSerializer,
    BoardListSerializer,
    BoardMemberSerializer,
    BoardStatusSerializer,
    BoardStatusWriteSerializer,
)
from .services import create_status, delete_status


class BoardViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Boards the current user is a member of, plus their sub-collections."""

    permission_classes = [permissions.IsAuthenticated, IsBoardMember]

    def get_queryset(self):
        # Only boards the user belongs to — enforced at the DB level. Use a
        # subquery (not a join) so downstream Count annotations are not skewed
        # by the membership filter.
        member_board_ids = BoardMember.objects.filter(
            user=self.request.user
        ).values("board_id")
        return Board.objects.filter(pk__in=member_board_ids)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BoardDetailSerializer
        return BoardListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().annotate(
            member_count=Count("members", distinct=True),
            task_count=Count("tasks", distinct=True),
        )
        serializer = BoardListSerializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        board = (
            self.get_queryset()
            .prefetch_related(
                "columns",
                "statuses",
                Prefetch(
                    "members",
                    queryset=BoardMember.objects.select_related("user"),
                ),
                Prefetch(
                    "tasks",
                    queryset=Task.objects.select_related(
                        "column", "status", "doer"
                    ).order_by("position", "id"),
                    to_attr="prefetched_tasks",
                ),
            )
            .filter(pk=kwargs["pk"])
            .first()
        )
        if board is None:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        self.check_object_permissions(request, board)
        return Response(BoardDetailSerializer(board, context={"request": request}).data)

    # ---- sub-collections ------------------------------------------------

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        board = self.get_object()
        qs = board.members.select_related("user").all()
        return Response(BoardMemberSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def columns(self, request, pk=None):
        board = self.get_object()
        return Response(BoardColumnSerializer(board.columns.all(), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def statuses(self, request, pk=None):
        board = self.get_object()

        if request.method == "GET":
            return Response(
                BoardStatusSerializer(board.statuses.all(), many=True).data
            )

        # POST — create a custom row (status).
        serializer = BoardStatusWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            status_obj = create_status(
                board,
                name=data.get("name", ""),
                is_collapsible=data.get("is_collapsible", False),
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)
        return Response(
            BoardStatusSerializer(status_obj).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"])
    def tasks(self, request, pk=None):
        board = self.get_object()

        if request.method == "GET":
            qs = (
                board.tasks.select_related("column", "status", "doer")
                .order_by("position", "id")
            )
            return Response(
                TaskSerializer(qs, many=True, context={"request": request}).data
            )

        # POST — quick create.
        serializer = TaskCreateSerializer(
            data=request.data, context={"request": request, "board": board}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        default_status = board.statuses.order_by("position", "id").first()
        chosen_status = data.get("status") or default_status
        if chosen_status is None:
            return Response(
                {"detail": "Board has no statuses configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = create_task(
            board=board,
            column=data["column"],
            status=chosen_status,
            title=data["title"],
            description=data.get("description", ""),
            doer_id=data.get("doer_id"),
            deadline=data.get("deadline"),
        )
        return Response(
            TaskSerializer(task, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BoardStatusViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Update (rename / toggle collapsible / collapse / reorder) and delete
    status rows on boards the user belongs to.

    Creation happens through ``POST /api/boards/:id/statuses/``. Membership is
    enforced at the queryset level so rows on other boards are unreachable.
    """

    permission_classes = [permissions.IsAuthenticated, IsBoardMember]

    def get_serializer_class(self):
        return BoardStatusWriteSerializer

    def get_queryset(self):
        return (
            BoardStatus.objects.filter(board__members__user=self.request.user)
            .select_related("board")
            .distinct()
        )

    def destroy(self, request, *args, **kwargs):
        status_obj = self.get_object()
        try:
            delete_status(status_obj)
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)
        return Response(status=status.HTTP_204_NO_CONTENT)
