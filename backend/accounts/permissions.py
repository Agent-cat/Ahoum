from rest_framework.permissions import BasePermission


class IsCreator(BasePermission):
    """Allows access only to authenticated users with the creator role."""

    message = "Only creators can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "creator")
