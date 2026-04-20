# Migrating to the Cloud Database

This procedure describes how to migrate legacy data to the Cloud Database.

## Prerequisites

- Administrative access to the Cloud Management Portal.
- A pre-configured destination VPC with network routing enabled.

## Procedure

1. Navigate to the Main Console at
   [https://console.cloud-enterprise.com](https://console.cloud-enterprise.com).

    The Main Console is the default landing page after SSO authentication.

2. From the VPC list, select the appropriate VPC.

    > **Note:** Administrative access is required for this step.

3. In the "Export Settings" modal, select the "Advanced" tab.

4. In the "Buffer size" field, enter `64`.

    > **Note:** The buffer size is 64 MB. This ensures high-throughput transfer
    > and prevents memory overflow on the legacy host.

5. Export the legacy data using the standard migration script.

6. Upload the resulting file to the Cloud Bucket. Use the bucket with the
   project tag.

7. In the Security Vault, generate a migration token.

    > **Note:** If token generation fails, wait and then retry.

8. Initialize the Cloud Database with the migration token and the cloud file.

9. Toggle the sync mode to `On`.

10. Enable the high-speed bridge.

11. Set the sync timeout to `30`.

    > **Note:** If the sync fails at any point, check the logs and alert the
    > Lead Engineer.

12. Once the status shows "Complete," delete the temporary files.

## Result

The legacy data migration is complete and the sync mode is active.

## Known Gaps

The following gaps require source clarification before the procedure can be
considered complete.

- **Step 1:** The source instructs the user to check the environment but does
  not define what to check or where.
- **Step 2:** The UI location of the VPC list is not specified.
- **Step 5:** The location and method for running the standard migration script
  are not specified.
- **Step 6:** The upload method and UI location for the Cloud Bucket are not
  specified.
- **Step 7:** The UI location and navigation path to the Security Vault are not
  specified.
- **Step 8:** The UI location and method for initializing the Cloud Database
  are not specified.
- **Step 9:** The UI location of the sync mode toggle is not specified.
- **Step 10:** The UI location for enabling the high-speed bridge is not
  specified.
- **Step 11:** The UI location for the sync timeout field is not specified. The
  unit for `30` is not specified. The specific logs to check on sync failure
  are not identified.
- **Step 12:** The UI location of the status indicator is not specified. The
  identity and location of the temporary files are not specified.

