from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import Conflict
from .models import Booking, Session
from .permissions import IsCreatorOrReadOnly
from .serializers import BookingSerializer, CreatorSessionSerializer, SessionSerializer


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related("creator")
    serializer_class = SessionSerializer
    permission_classes = [IsCreatorOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            return qs.annotate(booked_count=Count("bookings"))
        return qs

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def book(self, request, pk=None):
        session = Session.objects.filter(pk=pk).first()
        if session is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if session.creator_id == request.user.id:
            return Response({"detail": "Creators cannot book their own session."}, status=status.HTTP_400_BAD_REQUEST)

        # All booking attempts for a session serialize on this row lock, so the
        # capacity check below can never race with another concurrent insert.
        with transaction.atomic():
            locked = Session.objects.select_for_update().get(pk=session.pk)

            if locked.starts_at <= timezone.now():
                return Response({"detail": "This session has already started."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                booking = Booking.objects.create(session=locked, user=request.user)
            except IntegrityError:
                return Response(
                    {"detail": "You already booked this session."},
                    status=status.HTTP_409_CONFLICT,
                )

            if locked.bookings.count() > locked.capacity:
                raise Conflict("Session is fully booked.")

        data = BookingSerializer(booking).data
        data["seats_left"] = max(locked.capacity - locked.bookings.count(), 0)
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def unregister(self, request, pk=None):
        session = Session.objects.filter(pk=pk).first()
        if session is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            locked = Session.objects.select_for_update().get(pk=session.pk)
            deleted, _ = Booking.objects.filter(session=locked, user=request.user).delete()

            if deleted == 0:
                return Response(
                    {"detail": "You are not booked for this session."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response({"detail": "Unregistered successfully.", "seats_left": max(locked.capacity - locked.bookings.count(), 0)})


class MySessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "creator":
            return Response({"detail": "Only creators can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        sessions = (
            Session.objects.filter(creator=request.user)
            .annotate(booked_count=Count("bookings"))
            .order_by("-created_at")
        )
        return Response(CreatorSessionSerializer(sessions, many=True).data)


class BookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = (
            Booking.objects.filter(user=request.user)
            .select_related("session")
            .order_by("session__starts_at")
        )
        now = timezone.now()
        data = [
            {**BookingSerializer(b).data, "is_past": b.session.starts_at <= now}
            for b in bookings
        ]
        return Response(data)
