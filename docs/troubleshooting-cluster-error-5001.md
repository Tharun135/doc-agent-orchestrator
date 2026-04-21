# Troubleshooting Cluster Error Code 5001

Use this guide to diagnose and resolve `Cluster Error Code 5001`.

## Performing diagnostic steps

1. Check the interconnects in the "Dashboard".

2. If the signal is weak, refresh the link.

3. If the error remains, reset the "Primary Node".  
    Only use the `-force` flag if the node is stuck.

4. If the error continues, set the "Heartbeat Interval" to a higher value.  
    Adjust this value within the "Settings".

## Resolving common problems

### Addressing weak interconnect signals

**Cause**: The interconnect link signal strength is low.

**Solution**:

1. Refresh the link in the "Dashboard".

---

### Resetting the primary node

**Cause**: The "Primary Node" failed or stopped responding.

**Solution**:

1. Reset the "Primary Node".  
    Only use the `-force` flag if the node is stuck.

---

### Adjusting heartbeat settings

**Cause**: The heartbeat settings are incorrect.

**Solution**:

1. Open the "Settings".

2. Increase the "Heartbeat Interval" to a higher value.

---

### Repairing cluster partitions

**Cause**: The system logs contain partition events.

**Solution**:

1. Run the "Repair Tool".  
    Use the "Standard" mode first.  
    The repair process duration depends on the database size.

## Performing advanced diagnostics

1. Check the system logs for partition events.

2. If the error persists, contact the duty officer on the emergency "Slack" 
    channel.

## Viewing related topics

- Access cluster monitoring.
- Perform system log analysis.
- Use node reset procedures.
- Configure the heartbeat settings.
- Use the cluster repair tool.

## Known gaps

- The navigation path to the "Heartbeat Interval" setting is missing.
- The command to reset the "Primary Node" is unknown.
- The file path for system logs is not specified.
- The command to run the "Repair Tool" is missing.
- The recommended higher value for the heartbeat interval is undefined.
- The link for the emergency "Slack" channel is not provided.
