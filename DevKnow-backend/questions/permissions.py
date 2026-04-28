from rest_framework.permissions import BasePermission
 
 
class IsSeniorOrAdmin(BasePermission):
    """
    Only senior developers and admins can access this view.
    Standard users get a clear 403 error message.
    """
    message = 'You must be a senior developer to perform this action.'
 
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_senior()
