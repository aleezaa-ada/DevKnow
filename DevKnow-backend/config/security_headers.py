class SecurityHeadersMiddleware:
    """
    Adds Content-Security-Policy and Permissions-Policy response headers.
    Addresses OWASP ZAP Medium findings:
    - Content Security Policy (CSP) Header Not Set (CWE-693)
    - Permissions Policy Header Not Set (CWE-693)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # CSP: restrict resource loading to same origin.
        # unsafe-inline removed — DRF browsable API loses styling in dev
        # but the JSON API is unaffected (CWE-693).
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )

        # Permissions-Policy: disable browser features not used by this API.
        response['Permissions-Policy'] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Suppress server version disclosure (CWE-497).
        # In production this is handled at the reverse proxy (nginx/gunicorn).
        response['Server'] = 'DevKnow'

        return response
