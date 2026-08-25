from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(APIException):
    status_code = 409
    default_detail = "Conflict."
    default_code = "conflict"


def exception_handler(exc, context):
    # A concurrent insert that violates the unique booking constraint surfaces
    # here; convert it into an explicit conflict instead of a 500.
    if isinstance(exc, IntegrityError):
        return Response(
            {"detail": "You already have a booking for this session."},
            status=status.HTTP_409_CONFLICT,
        )
    return drf_exception_handler(exc, context)
