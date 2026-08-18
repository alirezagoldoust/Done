from django.contrib import admin

from boards.models import BoardMember

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "board",
        "status",
        "column",
        "doer",
        "deadline",
        "created_at",
        "updated_at",
    ]
    list_filter = ["board", "status", "column", "doer"]
    search_fields = ["title", "description", "board__name"]
    autocomplete_fields = ["board", "column", "status", "doer"]
    readonly_fields = ["created_at", "updated_at"]
    list_select_related = ["board", "status", "column", "doer"]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limit the doer choices to members of the task's board.

        Only possible while editing an existing task (the board is known);
        on the add form all users are offered and cross-board doers are
        rejected by the serializer / model validation.
        """
        if db_field.name == "doer":
            object_id = request.resolver_match.kwargs.get("object_id")
            if object_id:
                task = Task.objects.filter(pk=object_id).first()
                if task:
                    member_ids = BoardMember.objects.filter(
                        board=task.board
                    ).values_list("user_id", flat=True)
                    kwargs["queryset"] = (
                        db_field.related_model.objects.filter(pk__in=member_ids)
                    )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
