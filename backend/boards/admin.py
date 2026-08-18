from django.contrib import admin

from .models import Board, BoardColumn, BoardMember, BoardStatus
from .services import ensure_default_statuses


class BoardMemberInline(admin.TabularInline):
    model = BoardMember
    extra = 1
    autocomplete_fields = ["user"]


class BoardColumnInline(admin.TabularInline):
    model = BoardColumn
    extra = 1
    fields = ["name", "position"]
    ordering = ["position"]


class BoardStatusInline(admin.TabularInline):
    model = BoardStatus
    extra = 1
    fields = ["name", "position"]
    ordering = ["position"]


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ["name", "member_count", "created_at", "updated_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [BoardMemberInline, BoardColumnInline, BoardStatusInline]

    @admin.display(description="Members")
    def member_count(self, obj: Board) -> int:
        return obj.members.count()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Seed default statuses so an admin-created board is immediately usable.
        if not change:
            ensure_default_statuses(obj)


@admin.register(BoardMember)
class BoardMemberAdmin(admin.ModelAdmin):
    list_display = ["board", "user", "created_at"]
    list_filter = ["board"]
    search_fields = ["board__name", "user__username", "user__email"]
    autocomplete_fields = ["board", "user"]
    readonly_fields = ["created_at"]


@admin.register(BoardColumn)
class BoardColumnAdmin(admin.ModelAdmin):
    list_display = ["board", "name", "position"]
    list_filter = ["board"]
    search_fields = ["name", "board__name"]
    list_editable = ["position"]
    ordering = ["board", "position"]


@admin.register(BoardStatus)
class BoardStatusAdmin(admin.ModelAdmin):
    list_display = ["board", "name", "position"]
    list_filter = ["board"]
    search_fields = ["name", "board__name"]
    list_editable = ["position"]
    ordering = ["board", "position"]
