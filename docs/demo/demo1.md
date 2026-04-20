## Migrating the database

### Overview

This procedure describes how to migrate legacy data to the Cloud Database.

### Prerequisites

- Administrative access to the Cloud Management Portal
- A pre-configured destination VPC with network routing enabled

### Procedure

1. Open the [Main Console](https://console.cloud-enterprise.com).

2. Check the environment.

3. From the VPC list, select the appropriate VPC.

    !!! note
        This step requires administrator access.

4. Open the "Export Settings" modal and select the "Advanced" tab.

5. Set the buffer size to `64`.

6. Export the legacy data using the standard migration script.

7. Upload the resulting file to the Cloud Bucket with the project tag.

8. In the Security Vault, generate a migration token.

    !!! note
        If token generation fails, wait and retry.

9. Initialize the Cloud Database with the migration token and the uploaded file.

10. Enable the high-speed bridge.

11. Set the sync timeout to `30`.

12. Toggle the sync mode to "On".

    !!! note
        If the sync fails, check the logs and alert the Lead Engineer.

13. When the status shows "Complete," delete the temporary files.

### Result

Migration completes. The Cloud Database contains the legacy data.

### Known gaps

- Step 2: The source does not specify what to verify when checking the environment.
- Step 4: The source does not specify how to open the "Export Settings" modal or the navigation path.
- Step 5: The source does not specify the exact UI label for the buffer size field or the unit of measurement.
- Step 6: The source does not specify the location of the standard migration script or how to run it.
- Step 7: The source does not specify the navigation path to the Cloud Bucket or how to identify it by project tag in the UI.
- Step 8: The source does not specify the navigation path to the Security Vault or the wait duration before retrying.
- Step 9: The source does not specify the navigation path or UI controls for initializing the Cloud Database.
- Step 10: The source does not specify how to enable the high-speed bridge or its location in the UI.
- Step 11: The source does not specify the navigation path to the sync timeout setting or the unit of measurement.
- Step 12: The source does not specify the location of the sync mode toggle in the UI.
- Step 12, sync failure: The source does not specify which logs to check, their location, or how to contact the Lead Engineer.
- Step 13: The source does not specify which files are temporary or their location.

