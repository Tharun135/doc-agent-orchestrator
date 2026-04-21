## Migrating the database

### Overview

This procedure describes how to migrate the database.

### Prerequisites

- Administrative access to the Cloud Management Portal
- A pre-configured destination VPC with network routing enabled

### Procedure

1. In the Cloud Management Portal, select "Console" from the top navigation menu.

    The Main Console opens. The Environment Overview section displays the system status.

2. Check the environment.

3. Set the buffer size to `64`.

4. From the VPC list, select the appropriate VPC.

    !!! note
        This step requires administrator access.

5. Export the legacy data using the standard migration script.

6. Upload the resulting file to the Cloud Bucket with the project tag.

7. In the Security Vault, generate a migration token.

    If the token generation fails, wait and retry.

8. Initialize the Cloud Database with the migration token and the cloud file.

9. Toggle the sync mode to `On`.

10. Enable the high-speed bridge.

11. Set the sync timeout to `30`.

    If the sync fails at any point, check the logs and alert the Lead Engineer.

12. Once the status shows `Complete`, delete the temporary files.

### Result

The database migration is complete.

### Known Gaps

The following information is missing from the source and the pre-clarifications.

| Step | Missing information |
| --- | --- |
| 2 | Success criteria for checking the environment are not defined |
| 3 | UI location for the buffer size setting is not specified; unit for the value `64` is not specified |
| 5 | Location and execution method for the standard migration script are not specified |
| 6 | UI location for the Cloud Bucket is not specified; method for identifying the project-tagged bucket is not specified |
| 7 | UI location for the Security Vault is not specified |
| 7 | Wait duration before retrying token generation is not specified |
| 8 | UI location for Cloud Database initialization is not specified |
| 9 | UI location for the sync mode toggle is not specified |
| 10 | UI location and enabling method for the high-speed bridge are not specified |
| 11 | UI location for the sync timeout setting is not specified |
| 11 | Unit of measurement for the sync timeout value `30` is not specified |
| 11 | Which logs to check and how to access them are not specified |
| 11 | Lead Engineer notification method is not specified |
| 12 | Location of the temporary files is not specified |

**Note on step ordering:** The source states "Set the buffer size to 64 before starting the export" after the export step. This procedure places step 3 before step 5 to reflect the stated prerequisite. Confirm the intended sequence.
