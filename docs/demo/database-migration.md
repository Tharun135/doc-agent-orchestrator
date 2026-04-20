# Migrating the cloud database

This procedure describes how to migrate legacy data to the cloud database.

## Prerequisites

- Administrative access to the Cloud Management Portal
- A pre-configured destination VPC with network routing enabled

## Procedure

1. Navigate to the Main Console at `https://console.cloud-enterprise.com`.

2. Check the environment.

3. Select the appropriate VPC from the list.

4. In the "Export Settings" modal, open the "Advanced" tab.

5. Set the buffer size to `64 MB`.

    !!! note
        Setting the buffer size to 64 MB ensures high-throughput transfer
        and prevents memory overflow on the legacy host.

6. Export the legacy data using the standard migration script.

7. Upload the resulting file to the Cloud Bucket with the project tag.

8. Generate a migration token in the Security Vault.

    If the token generation fails, wait for a while and then retry.

9. Initialize the Cloud Database with the migration token and the cloud file.

10. Enable the high-speed bridge.

11. Toggle the sync mode to `On`.

12. Set the sync timeout to `30`.

    If the sync fails at any point, check the logs and alert the Lead Engineer.

13. Once the status shows `Complete`, delete the temporary files.

## Result

The migration is complete and the temporary files have been deleted.

## Known Gaps

The following information is missing from the source and the pre-clarifications.
These gaps prevent the user from acting.

| Step | Missing information |
| --- | --- |
| 4 | Navigation path to reach the "Export Settings" modal |
| 6 | Navigation path or UI location for running the standard migration script |
| 7 | Navigation path or UI location for uploading to the Cloud Bucket |
| 8 | Navigation path or UI location for the Security Vault |
| 9 | Navigation path or UI location for initializing the Cloud Database |
| 10 | Navigation path or UI location for enabling the high-speed bridge |
| 11 | Navigation path or UI location for the sync mode toggle |
| 12 | Unit for the sync timeout value (`30`) |
| 12 | Log name and search criteria for the sync failure condition |
