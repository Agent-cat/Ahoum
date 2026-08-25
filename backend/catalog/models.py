from django.conf import settings
from django.db import models


class Session(models.Model):
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    starts_at = models.DateTimeField()
    capacity = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [models.Index(fields=["starts_at"])]

    def __str__(self):
        return f"{self.title} by {self.creator_id}"


class Booking(models.Model):
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    # Invariant enforced at the DATABASE level: a user can have at most one
    # booking per session, even under concurrent requests.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session", "user"], name="uniq_booking_per_user_per_session"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"booking(user={self.user_id}, session={self.session_id})"
