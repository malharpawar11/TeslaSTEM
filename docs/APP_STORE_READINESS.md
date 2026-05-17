# App Store Readiness

- Uses only school SSO accounts ending in `@lwsd.org`.
- Requests push permission only to send followed-club announcements.
- No school-wide messaging without Super Admin approval.
- Includes privacy and terms screen in app.
- Backend must enforce HTTPS, Supabase RLS, rate limiting on edge functions, input validation, content sanitization, and audit logs.
- No secrets or service-role keys belong in the mobile app.
