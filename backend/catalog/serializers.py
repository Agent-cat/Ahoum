from django.utils import timezone
from rest_framework import serializers

from .models import Booking, Session


class SessionSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source="creator.display_name", read_only=True)
    seats_left = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id",
            "title",
            "description",
            "starts_at",
            "capacity",
            "seats_left",
            "creator",
            "creator_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "creator", "created_at", "updated_at", "seats_left"]

    def get_seats_left(self, obj):
        booked = getattr(obj, "booked_count", None)
        if booked is None:
            booked = obj.bookings.count()
        return max(obj.capacity - booked, 0)

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        return value

    def validate_starts_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Sessions must start in the future.")
        return value


class CreatorSessionSerializer(serializers.ModelSerializer):
    booked_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Session
        fields = [
            "id",
            "title",
            "description",
            "starts_at",
            "capacity",
            "booked_count",
            "created_at",
            "updated_at",
        ]


class BookingSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="session.title", read_only=True)
    starts_at = serializers.DateTimeField(source="session.starts_at", read_only=True)

    class Meta:
        model = Booking
        fields = ["id", "session", "title", "starts_at", "created_at"]
