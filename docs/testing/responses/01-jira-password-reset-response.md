# AI Response - Test 01: Jira Password Reset

## Prerequisites
- Valid user account
- Access to registered email address

## Procedure

1. Request a password reset.
2. Check your email for the reset link.
3. Click the reset link.
4. Enter your new password.
5. You are automatically logged in after the password is reset.

## Notes

- The reset link expires after a period of time.
- You must use the link before it expires.

## Preserved Ambiguities
- **"Some time"** - Exact expiration duration not specified in source
- **"Request reset"** - Specific UI location or method not detailed
- **"Email sent"** - Email template, subject, or sender not defined

---

## Classification: ✅ PASS

**Did it generate output?** Yes  
**Preserved ambiguity correctly?** Yes  
**Blocked unnecessarily?** No  
**Invented behavior?** No

**Notes:**
- Documented vague timing as "period of time"
- Didn't invent specific expiration (24 hours, etc.)
- Didn't add password requirements not mentioned