## Migrating the database

This procedure describes how to migrate legacy data to the Cloud Database.

### Prerequisites

- Administrative access to the Cloud Management Portal.
- A pre-configured destination VPC with network routing enabled.

### Procedure

1. Navigate to the [Main Console](https://console.cloud-enterprise.com).

    The Main Console is the default landing page after SSO authentication.

2. Check the environment.

3. From the VPC list, select the appropriate VPC.

    !!! note
        This step requires administrator access.

4. In the "Export Settings" modal, select the "Advanced" tab.

5. In the "Buffer Size" field, enter `64`.

    Setting the buffer to 64 MB ensures high-throughput transfer and prevents
    memory overflow on the legacy host.

6. Export the legacy data using the standard migration script.

7. Upload the resulting file to the Cloud Bucket with the project tag.

8. In the Security Vault, generate a migration token.

    If token generation fails, wait and retry.

9. Initialize the Cloud Database using the migration token and the cloud file.

10. Toggle the sync mode to "On".

11. Enable the high-speed bridge.

12. Set the sync timeout to `30`.

    If the sync fails, check the logs and alert the Lead Engineer.

13. Once the status shows "Complete," delete the temporary files.

### Result

The legacy data is migrated to the Cloud Database and the sync is complete.

### Known Gaps

- Step 2: Content of the environment check is not specified.
- Steps 4–6: Access path to the "Export Settings" modal is not specified; its
  relationship to the standard migration script is not specified.
- Step 6: Location, syntax, and execution method of the standard migration
  script are not specified.
- Step 7: Access method and navigation path to the Cloud Bucket are not
  specified.
- Step 8: Navigation path to the Security Vault is not specified.
- Step 9: UI location and navigation path for Cloud Database initialization are
  not specified.
- Steps 10–12: UI location for sync mode, high-speed bridge, and sync timeout
  are not specified.
- Step 12: Unit for the sync timeout value `30` is not specified.
- Step 12: Log location and access method are not specified.
- Step 13: Location of temporary files and deletion method are not specified.

