# Troubleshooting cluster error code 5001

Use this guide to diagnose and resolve cluster error code 5001.

## Troubleshooting topic

Cluster error code 5001 appears in the dashboard.

## Diagnostic steps

Perform these checks in order:

1. Check the interconnects.
2. Check the system logs for partition events.

## Common problems and solutions

The following table lists common problems and their solutions:

| Problem | Solution |
|---|---|
| Weak interconnect signal | Refresh the link. |
| Primary node failure | Reset the primary node. Use the `-force` flag only if the node is stuck. |
| Incorrect heartbeat interval | Increase the heartbeat interval in the settings. |
| Cluster partitions found | Run the repair tool in standard mode. The repair duration depends on the database size. |

## Advanced diagnostics

If the previous steps do not resolve the error, contact the duty officer
on the emergency Slack channel.

## Related topics

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- Related topics: No document links or titles are available in the source.
  Add actual links before publishing.
