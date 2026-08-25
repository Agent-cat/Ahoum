from rest_framework.exceptions import APIException


class Conflict(APIException):
    status_code = 409
    default_detail = "Conflict."
    default_code = "conflict"


class Gone(APIException):
    status_code = 410
    default_detail = "Gone."
    default_code = "gone"
