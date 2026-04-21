## Migrating the database

### Overview

This procedure describes how to migrate a legacy database to the Cloud Database.

### Prerequisites

- Administrative access to the Cloud Management Portal.
- A pre-configured destination VPC with network routing enabled.

### Procedure

1. Navigate to the [Main Console](https://console.cloud-enterprise.com).  
    The Main Console is the default landing page after SSO authentication.

2. Check the environment.

3. Select the appropriate VPC from the list.

    !!! note
        Admin access is required for this step.

4. In the "Export Settings" modal, select the "Advanced" tab.

5. Set the buffer size to `64` MB.  
    This ensures high-throughput transfer and prevents memory overflow
    on the legacy host.

6. Export the legacy data using the standard migration script.

7. Upload the resulting file to the Cloud Bucket with the project tag.

8. In the Security Vault, generate a migration token.  
    If token generation fails, wait and retry.

9. Initialize the Cloud Database with the migration token and the cloud file.

10. Toggle the sync mode to "On".

11. Enable the high-speed bridge.

12. Set the sync timeout to `30`.

13. If the sync fails, check the logs and alert the Lead Engineer.

14. Once the status shows "Complete", delete the temporary files.

### Result

The legacy data is migrated to the Cloud Database. Synchronization is complete.

### Known Gaps

- Step 2: The specific checks required when reviewing the environment are not
  defined.
- Step 3: The navigation path to the VPC list is not specified.
- Step 4: The navigation path to open the "Export Settings" modal is not
  specified.
- Step 6: The location and execution method of the standard migration script
  are not specified.
- Step 7: The navigation path to the Cloud Bucket is not specified. The method
  for identifying the bucket with the project tag is not specified.
- Step 8: The navigation path to the Security Vault is not specified. The
  expected wait time before retrying token generation is not specified.
- Step 9: The navigation path and field names for initializing the Cloud
  Database are not specified.
- Steps 10-12: The navigation path and UI location for the sync mode,
  high-speed bridge, and sync timeout settings are not specified.
- Step 12: The unit for the sync timeout value `30` is not specified.
- Step 13: The method for accessing logs is not specified. The escalation
  process for alerting the Lead Engineer is not specified.
- Step 14: The location of the temporary files is not specified.
- General: The abbreviations "VPC" and "SSO" are not defined on first use.

