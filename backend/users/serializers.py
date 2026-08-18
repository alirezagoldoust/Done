from django.contrib.auth.models import User
from rest_framework import serializers

from .utils import display_name, get_initials


class UserSerializer(serializers.ModelSerializer):
    """Compact, safe public representation of a user."""

    initials = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "initials",
        ]

    def get_initials(self, obj: User) -> str:
        return get_initials(obj)

    def get_display_name(self, obj: User) -> str:
        return display_name(obj)
