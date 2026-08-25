from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        USER = "user", "User"
        CREATOR = "creator", "Creator"

    email = models.EmailField(blank=True, default="")
    display_name = models.CharField(max_length=150, blank=True, default="")
    role = models.CharField(max_length=10, choices=Roles.choices, default=Roles.USER)
    github_id = models.BigIntegerField(null=True, blank=True, unique=True)
    google_id = models.CharField(max_length=64, null=True, blank=True, unique=True)
    avatar_url = models.URLField(blank=True, default="")

    def __str__(self):
        return f"{self.username} ({self.role})"
