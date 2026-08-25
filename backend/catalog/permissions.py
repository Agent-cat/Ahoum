from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.permissions import IsCreator


class IsCreatorOrReadOnly(BasePermission):
    """Write access requires the creator role AND ownership of the session."""

    message = "Only the owning creator can modify this session."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsCreator().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.creator_id == request.user.id
