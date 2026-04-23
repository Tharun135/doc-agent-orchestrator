# Troubleshooting cluster error code 5001

Use this guide to diagnose and resolve cluster error code 5001.

## Troubleshooting topic

Cluster error code 5001 appears in the dashboard. This guide covers
interconnect signal issues, primary node failures, heartbeat settings,
and cluster partition events.

## Diagnostic steps

Follow these steps to diagnose the error:

1. Check the interconnects.
2. If the signal is weak, refresh the link.
3. If the error persists, reset the primary node.
   Use the `-force` flag only if the node is truly stuck.
4. If the error persists, increase the heartbeat interval in the settings.

## Common problems and solutions

The following table describes common causes of cluster error code 5001
and their resolutions:

| Problem | Solution |
|---|---|
| Weak interconnect signal | Refresh the link. |
| Primary node failure | Reset the primary node. Use `-force` only if the node is truly stuck. |
| Cluster partition detected | Run the repair tool in standard mode. |
| Incorrect heartbeat settings | Increase the heartbeat interval in the settings. |

## Advanced diagnostics

If the initial steps do not resolve the error, follow these steps:

1. Check the system logs for partition events.
2. If partitions are found, run the repair tool in standard mode.
   The repair process duration depends on the database size.
3. If the error persists, contact the duty officer on the emergency
   Slack channel.

## Related topics

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- The source does not specify the location of the heartbeat settings.
- The source does not provide a target value for the heartbeat interval.
- The source does not provide links for the related topics.
