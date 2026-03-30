First, navigate to the Main Console and check the environment.
Select the appropriate VPC from the list. (Admins only).
Export the legacy data using the standard migration script.
Set the buffer size to 64 before starting the export.
Upload the resulting file to the Cloud Bucket (use the one with the project tag).
Generate a migration token in the Security Vault.
If the token generation fails, wait for a while and then retry.
Initialize the Cloud Database with the migration token and the cloud file.
Toggle the sync mode to 'On'.
Set the sync timeout to 30 (don't forget to enable the high-speed bridge first).
If the sync fails at any point, check the logs and alert the Lead Engineer.
Once the status shows "Complete," delete the temporary files.
