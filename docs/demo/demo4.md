# Troubleshooting cluster error code 5001

Use this guide to diagnose and resolve cluster error code 5001.

## Diagnostic steps

Check the following when error code 5001 appears in the dashboard:

1. Check the interconnects.
2. Check the system logs for partition events.

## Common problems and solutions

### Weak interconnect signal

Refresh the link.

### Primary node failure

Reset the primary node. Use the `-force` flag only if the node
is truly stuck.

### Incorrect heartbeat settings

Increase the heartbeat interval. Set it to a higher value in the
settings.

### Cluster partitions

Run the repair tool. Use standard mode first.

The repair process duration depends on database size.

If none of the above steps resolve the error, contact the duty officer
on the emergency Slack channel.

## Related topics

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- **Advanced diagnostics**: No source content available.
- **Related topics**: No document links or titles provided for the
  referenced topics.
