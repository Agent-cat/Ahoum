from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "display_name", "role", "avatar_url"]
        read_only_fields = ["id", "username", "email", "avatar_url"]

    def validate_role(self, value):
        if value not in User.Roles.values:
            raise serializers.ValidationError("Role must be 'user' or 'creator'.")
        return value


class GitHubCodeSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=1)
    state = serializers.CharField(required=False, allow_blank=True)


class DevLoginSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=1, max_length=150)
    role = serializers.ChoiceField(choices=[User.Roles.USER, User.Roles.CREATOR], default=User.Roles.USER)
