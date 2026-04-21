# Troubleshooting Cluster Error Code 5001

Use this guide to diagnose and resolve Cluster Error Code 5001.

Cluster Error Code 5001 appears in the dashboard.

## Diagnostic steps

1. Check the interconnects in the dashboard.
2. If the signal is weak, refresh the link.
3. If the error persists, reset the primary node.

    > **Note:** Use the `-force` flag only if the node is stuck.

4. If the error persists, increase the heartbeat interval.
   Set a higher value in the settings.
5. Check the system logs for partition events.
6. If the logs show partitions, run the repair tool in standard mode.

    The repair duration depends on the database size.

## Common problems and solutions

### Weak interconnect signal

**Cause:** The interconnect signal is weak.

**Solution:**

1. Check the interconnects in the dashboard.
2. Refresh the link.

---

### Primary node failure

**Cause:** The primary node is stuck or failing.

**Solution:**

1. Reset the primary node.
2. If the node is stuck, use the `-force` flag.

---

### Cluster partitions

**Cause:** The system logs show partition events.

**Solution:**

1. Check the system logs for partition events.
2. Run the repair tool in standard mode.

---

### Incorrect heartbeat interval

**Cause:** The heartbeat interval is too low.

**Solution:**

1. Increase the heartbeat interval in the settings.

---

## Advanced diagnostics

If the above solutions do not resolve the issue, contact the duty officer
on the emergency Slack channel.

## Related topics

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- Exact dashboard location for checking interconnects
- Command or UI path to refresh the link
- Command or UI path to reset the primary node
- UI path to increase the heartbeat interval in settings
- Recommended heartbeat interval value
- Location of system logs
- Command or UI path to run the repair tool
- Emergency Slack channel name
- Links or URLs for all related topics

