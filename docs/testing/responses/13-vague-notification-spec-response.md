# AI Response - Test 13: Vague Notification Spec

## Overview
The notification system keeps users informed about important events through multiple delivery channels.

## Key Components

### Notification Configuration
- Users can configure notification preferences
- Different notification types exist for different events
- Critical notifications cannot be disabled by users

### Delivery Channels
- System supports multiple delivery channels
- Users choose their preferred notification method

### Notification Timing
- Real-time delivery when possible
- Batched delivery when appropriate

### Notification History
- System stores history of sent notifications
- History is retained for a defined period

## Process Flow
1. Event occurs in the system.
2. System determines notification type.
3. System checks user preferences.
4. Notification is sent via user's preferred channel.
5. Notification is logged to history.

## Preserved Ambiguities
- **"Important events"** - Specific events that trigger notifications not defined
- **"Multiple channels"** - Specific delivery methods not listed (email, SMS, push, etc.)
- **"Real-time when possible"** - Conditions determining real-time vs. batched not specified
- **"Appropriate"** - Batching criteria not detailed
- **"Some period"** - Retention duration not specified
- **"Different notification types"** - Specific types not enumerated

---

## Classification: ✅ PASS

**Did it generate output?** Yes  
**Preserved ambiguity correctly?** Yes  
**Blocked unnecessarily?** No  
**Invented behavior?** No

**Notes:**
- Extreme test of ambiguity preservation
- Didn't invent channel names (email, SMS, Slack)
- Didn't invent notification types (alert, warning, info)
- Preserved "when possible" and "when appropriate" without specification
- Documented the vague spec accurately