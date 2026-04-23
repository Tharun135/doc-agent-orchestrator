# Troubleshooting cluster error code 5001

Use this guide to diagnose and resolve cluster error code 5001.

## Diagnostic steps

Follow these steps in order:

1. Check the interconnects.
2. Check the primary node status.
3. Check the heartbeat interval in the settings.
4. Check the system logs for partition events.

## Common problems and solutions

The following table lists common causes and their solutions:

| Problem | Solution |
|---|---|
| Weak interconnect signal | Refresh the link. |
| Primary node is stuck | Reset the primary node. Use the `-force` flag only if the node is truly stuck. |
| Incorrect heartbeat settings | Increase the heartbeat interval in the settings. |
| Cluster partition detected | Run the repair tool in standard mode. The repair duration depends on the database size. |

## Advanced diagnostics

If the error persists after completing all steps, contact the duty officer
on the emergency Slack channel.

## Related topics

The following topics provide additional information:

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- No URLs are available for the related topics listed above.
