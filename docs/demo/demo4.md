# Troubleshooting cluster error code 5001

Use this guide to diagnose and resolve cluster error code 5001.

## Troubleshooting topic

Cluster error code 5001 appears in the "dashboard". Common causes
include:

- Weak interconnect signals
- Primary node failures
- Cluster partitions
- Incorrect heartbeat settings

## Diagnostic steps

Follow these steps in order to resolve the error:

1. Check the interconnects.
2. If the signal is weak, refresh the link.
3. If the error persists, reset the primary node.
   Use the `-force` flag only if the node is stuck.
4. If the error persists, increase the heartbeat interval
   in the "settings".
5. Check the system logs for partition events.
6. If partitions are found, run the repair tool in standard mode.
7. If the error persists, contact the duty officer on the
   emergency Slack channel.

## Common problems and solutions

| Problem | Solution |
|---|---|
| Weak interconnect signal | Refresh the link. |
| Primary node failure | Reset the primary node. Use `-force` only if the node is stuck. |
| Cluster partitions | Run the repair tool. Use standard mode first. |
| Incorrect heartbeat settings | Increase the heartbeat interval in "settings". |

## Advanced diagnostics

Check the system logs for partition events. If partitions are found,
run the repair tool in standard mode. The repair process duration
depends on the database size.

If the error persists after all steps, contact the duty officer on
the emergency Slack channel.

## Related topics

- Cluster monitoring
- System log analysis
- Node reset procedures
- Heartbeat configuration
- Cluster repair tool

## Known gaps

- Related topics: no URLs or file paths available for the listed
  topics.
