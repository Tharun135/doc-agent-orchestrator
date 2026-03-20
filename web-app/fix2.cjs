const fs = require('fs');

const procContent = `### [Task Title Using -ing Form]

**Purpose**: Brief one-sentence description of what the user accomplishes.

**Prerequisites**:

- Required access level or role
- Required software/tools installed
- Required configurations in place
- Required knowledge or completed prior tasks

**Estimated time**: X minutes

### Procedure

1. Navigate to **Menu > Submenu > Destination**.

2. In the toolbar, click "Action Button".  
    The [Dialog Name] dialog appears.

3. In the "Field Name" field, enter \`value\`.

4. From the "Dropdown Name" dropdown, select "Option Name".

5. Click "Apply".  
    The system processes the request. A success message appears: "Action completed successfully."

6. To verify the configuration, run the following command:

    \`\`\`bash
    command --verify
    \`\`\`

    Expected output:

    \`\`\`
    Status: Active
    Configuration: Applied
    \`\`\`

### Result

The [feature/configuration/system] is now [state]. You can now [next possible action or capability unlocked].

### Troubleshooting

| Issue | Cause | Solution |
| --- | --- | --- |
| Error message appears | Brief explanation | Step-by-step fix |
| Action fails | Brief explanation | Step-by-step fix |
`;

const conceptContent = `### [Concept Name]

**Overview**: One-paragraph explanation of what this is and why it matters.

### Key characteristics

- Characteristic 1
- Characteristic 2
- Characteristic 3

### How it works

[2-3 paragraphs explaining the underlying mechanism, workflow, or principle. Use diagrams where helpful.]

1. First major step or component
2. Second major step or component
3. Third major step or component

### Use cases

**Use case 1: [Name]**  
Brief description of when and why to use this approach.

**Use case 2: [Name]**  
Brief description of when and why to use this approach.

### Comparison with related concepts

| Aspect | This Concept | Alternative Concept |
| --- | --- | --- |
| Purpose | Description | Description |
| Best for | Use case | Use case |
| Limitation | Constraint | Constraint |

### Example

\`\`\`language
# Code example demonstrating the concept
example_implementation()
\`\`\`

**Explanation**: Brief walkthrough of what the example demonstrates.

### Related topics

- [Link to related concept]
- [Link to related procedure]
`;

const troubleshootContent = `### Troubleshooting [Problem Area]

**Symptom**: Clear description of what the user observes when the problem occurs.

### Diagnostic steps

1. Check [first verification point].  
    Run the following command:

    \`\`\`bash
    diagnostic_command
    \`\`\`

    Expected output if healthy:

    \`\`\`
    Status: OK
    \`\`\`

2. Verify [second verification point].  
    Navigate to **Settings > System > Status** and confirm that "State" shows "Active".

3. Review the log file at \`/path/to/logfile.log\` for error messages.  
    Look for entries containing \`ERROR\` or \`FAILED\`.

### Common problems and solutions

#### Problem 1: [Specific error message or symptom]

**Cause**: Brief explanation of why this happens.

**Solution**:

1. Stop the service:

    \`\`\`bash
    service stop application
    \`\`\`

2. Clear the cache directory:

    \`\`\`bash
    rm -rf /path/to/cache/*
    \`\`\`

3. Restart the service:

    \`\`\`bash
    service start application
    \`\`\`

4. Verify the service is running:

    \`\`\`bash
    service status application
    \`\`\`

    Expected output:

    \`\`\`
    Status: Running
    PID: 12345
    \`\`\`

**Prevention**: How to avoid this issue in the future.

---

#### Problem 2: [Specific error message or symptom]

**Cause**: Brief explanation of why this happens.

**Solution**:

[Step-by-step resolution]

**Prevention**: How to avoid this issue in the future.

---

### Advanced diagnostics

If the above solutions do not resolve the issue:

1. Enable debug logging:

    \`\`\`bash
    config set log_level=DEBUG
    \`\`\`

2. Reproduce the issue.

3. Collect the debug log:

    \`\`\`bash
    logs export --output=/tmp/debug.log
    \`\`\`

4. Contact support with the debug log file and the following information:
    - Application version: \`app --version\`
    - Operating system: \`uname -a\`
    - Exact error message
    - Steps to reproduce

### Related topics

- [Link to related configuration guide]
- [Link to log file reference]
`;

const refContent = `### [Component/Feature] Reference

**Overview**: One-sentence description of what this reference covers.

### Configuration parameters

| Parameter | Type | Default Value | Description | Valid Range/Options |
| --- | --- | --- | --- | --- |
| \`parameter_name\` | String | \`"default"\` | What this controls | Allowed values or range |
| \`timeout_seconds\` | Integer | \`30\` | Request timeout duration | 1-300 |
| \`enable_feature\` | Boolean | \`false\` | Enables/disables feature | \`true\`, \`false\` |

### Command-line options

#### \`command_name\`

**Syntax**:

\`\`\`bash
command_name [OPTIONS] <required_arg> [optional_arg]
\`\`\`

**Options**:

| Option | Short | Description | Example |
| --- | --- | --- | --- |
| \`--verbose\` | \`-v\` | Enable verbose output | \`command_name -v\` |
| \`--output <path>\` | \`-o\` | Specify output file | \`command_name -o /tmp/out.txt\` |
| \`--help\` | \`-h\` | Display help message | \`command_name -h\` |

**Examples**:

\`\`\`bash
# Basic usage
command_name input.txt

# With verbose output and custom output location
command_name -v -o /custom/path.txt input.txt

# Multiple input files
command_name file1.txt file2.txt file3.txt
\`\`\`

### API endpoints

#### GET \`/api/resource\`

**Description**: Retrieves a list of resources.

**Authentication**: Required (Bearer token)

**Query parameters**:

| Parameter | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| \`limit\` | Integer | No | Maximum results to return | \`?limit=50\` |
| \`offset\` | Integer | No | Number of results to skip | \`?offset=100\` |
| \`filter\` | String | No | Filter expression | \`?filter=status:active\` |

**Request example**:

\`\`\`http
GET /api/resource?limit=10&filter=status:active HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
\`\`\`

**Response example** (200 OK):

\`\`\`json
{
  "total": 42,
  "items": [
    {
      "id": "res_123",
      "name": "Resource Name",
      "status": "active"
    }
  ]
}
\`\`\`

**Error responses**:

| Status Code | Description | Example Response |
| --- | --- | --- |
| 401 | Unauthorized (invalid token) | \`{"error": "Invalid token"}\` |
| 403 | Forbidden (insufficient permissions) | \`{"error": "Access denied"}\` |
| 429 | Rate limit exceeded | \`{"error": "Too many requests"}\` |

### Configuration file structure

**File location**: \`/etc/application/config.yml\`

**Format**: YAML

**Example**:

\`\`\`yaml
# Server configuration
server:
  host: "0.0.0.0"
  port: 8080
  timeout: 30

# Database configuration
database:
  host: "localhost"
  port: 5432
  name: "app_db"
  pool_size: 10

# Feature flags
features:
  enable_caching: true
  enable_analytics: false
\`\`\`

**Schema validation**:

- \`server.host\`: String, valid IP address or hostname
- \`server.port\`: Integer, 1-65535
- \`server.timeout\`: Integer, 1-300 (seconds)
- \`database.pool_size\`: Integer, 1-100
- \`features.*\`: Boolean

### Environment variables

| Variable | Description | Default | Example |
| --- | --- | --- | --- |
| \`APP_ENV\` | Deployment environment | \`production\` | \`development\`, \`staging\`, \`production\` |
| \`APP_LOG_LEVEL\` | Logging verbosity | \`INFO\` | \`DEBUG\`, \`INFO\`, \`WARN\`, \`ERROR\` |
| \`APP_SECRET_KEY\` | Application secret key | None (required) | \`your-secret-key-here\` |

### Exit codes

| Code | Meaning | Common Cause |
| --- | --- | --- |
| 0 | Success | Command completed without errors |
| 1 | General error | Invalid input or configuration |
| 2 | Missing argument | Required parameter not provided |
| 127 | Command not found | Application not in PATH |

### Related topics

- [Link to getting started guide]
- [Link to troubleshooting guide]
`;

const tutorialContent = `### [Tutorial Title]: [Specific Goal]

**What you will learn**:

- Skill or concept 1
- Skill or concept 2
- Skill or concept 3

**Prerequisites**:

- Required knowledge level
- Required software installed
- Required accounts or access

**Estimated time**: X minutes

### Overview

[1-2 paragraphs explaining what you will build/accomplish and why it matters. Set the context.]

### Step 1: [First milestone]

[Brief introduction to this step's goal.]

1. Open the terminal and create a new project directory:

    \`\`\`bash
    mkdir my-project
    cd my-project
    \`\`\`

2. Initialize the project:

    \`\`\`bash
    init --template=basic
    \`\`\`

    The initialization creates the following structure:

    \`\`\`
    my-project/
    ├── config/
    ├── src/
    └── README.md
    \`\`\`

3. Verify the setup:

    \`\`\`bash
    validate
    \`\`\`

    Expected output:

    \`\`\`
    ✓ Configuration valid
    ✓ Dependencies resolved
    \`\`\`

**What you accomplished**: Brief summary of this milestone.

---

### Step 2: [Second milestone]

[Brief introduction to this step's goal.]

1. Create a new configuration file:

    \`\`\`yaml title="config/settings.yml"
    app_name: "My Application"
    version: "1.0.0"
    features:
      - authentication
      - logging
    \`\`\`

2. Apply the configuration:

    \`\`\`bash
    apply config/settings.yml
    \`\`\`

3. Test the configuration:

    \`\`\`bash
    test --config=config/settings.yml
    \`\`\`

**What you accomplished**: Brief summary of this milestone.

---

### Step 3: [Third milestone]

[Continue pattern for each major step]

---

### Testing your implementation

1. Run the complete test suite:

    \`\`\`bash
    test --all
    \`\`\`

2. Verify the expected output:

    \`\`\`
    ✓ Test 1: PASSED
    ✓ Test 2: PASSED
    ✓ Test 3: PASSED
    
    All tests passed (3/3)
    \`\`\`

### Summary

You have successfully [recap of what was accomplished]. You learned how to:

- Concrete skill learned
- Concrete skill learned
- Concrete skill learned

### Next steps

- [Link to advanced tutorial building on this]
- [Link to related concept explanation]
- [Link to reference documentation]

### Troubleshooting

**Issue**: Something does not work as expected.  
**Solution**: Check [specific verification point]. Ensure [specific configuration].
`;

const rnContent = `### Release Notes for Version X.Y.Z

**Release date**: YYYY-MM-DD

**Release type**: Major / Minor / Patch

### Overview

[1-2 paragraphs summarizing the key changes, improvements, or themes of this release.]

### New features

#### [Feature Name]

Brief description of what this feature does and why it matters.

**How to use**:

\`\`\`bash
# Example command or configuration
new_feature --enable
\`\`\`

**Related documentation**: [Link to detailed guide]

---

#### [Feature Name]

Brief description of what this feature does and why it matters.

---

### Improvements

- **[Component]**: Description of improvement and its benefit
- **[Component]**: Description of improvement and its benefit
- **Performance**: Specific metric improvement (e.g., "API response time reduced by 40%")
- **Usability**: Description of UX enhancement

### Bug fixes

- **[Component]**: Fixed issue where [symptom] occurred when [condition]. (Issue #123)
- **[Component]**: Resolved error "[error message]" during [action]. (Issue #456)
- **[Component]**: Corrected [specific behavior] to now [expected behavior]. (Issue #789)

### Breaking changes

#### [Change Title]

**Impact**: Description of what breaks and which users are affected.

**Migration path**:

1. Update your configuration from:

    \`\`\`yaml
    # Old format (deprecated)
    old_parameter: value
    \`\`\`

    to:

    \`\`\`yaml
    # New format
    new_parameter: value
    \`\`\`

2. Run the migration command:

    \`\`\`bash
    migrate --from=v1 --to=v2
    \`\`\`

3. Verify the migration:

    \`\`\`bash
    validate --config
    \`\`\`

**Related documentation**: [Link to migration guide]

---

### Deprecated features

The following features are deprecated and will be removed in version X.Y.Z:

- **[Feature Name]**: Use [alternative] instead. [Link to migration guide]
- **[Feature Name]**: Use [alternative] instead. [Link to migration guide]

### Security updates

- **[CVE-YYYY-XXXXX]**: [Severity] - Description of vulnerability and fix. [Link to security advisory]
- Updated dependency [package name] from version X.X to X.Y to address [security issue]

### Known issues

- **[Issue description]**: Workaround: [temporary solution]. Fix planned for version X.Y.Z. (Issue #999)
- **[Issue description]**: Affects [specific scenario]. Investigating. (Issue #1000)

### Upgrade instructions

#### From version X.Y.Z

1. Backup your current configuration:

    \`\`\`bash
    backup --output=/tmp/config_backup.tar.gz
    \`\`\`

2. Stop the application:

    \`\`\`bash
    service stop application
    \`\`\`

3. Install the new version:

    \`\`\`bash
    package install application=X.Y.Z
    \`\`\`

4. Run database migrations:

    \`\`\`bash
    migrate database
    \`\`\`

5. Start the application:

    \`\`\`bash
    service start application
    \`\`\`

6. Verify the upgrade:

    \`\`\`bash
    application --version
    \`\`\`

    Expected output: \`Application version X.Y.Z\`

### System requirements

- Operating System: Ubuntu 20.04+ / RHEL 8+ / Windows Server 2019+
- Memory: 4 GB minimum, 8 GB recommended
- Disk space: 10 GB available
- Dependencies: Node.js 18+, Python 3.9+

### Download

- [Download for Linux (x64)](https://example.com/download/linux)
- [Download for Windows (x64)](https://example.com/download/windows)
- [Download for macOS (ARM)](https://example.com/download/macos)

**Checksums**: [Link to checksums file]

### Contributors

We would like to thank the following contributors to this release:

- [@username1](https://github.com/username1)
- [@username2](https://github.com/username2)
`;

const apiContent = `### [API Name] API Reference

**Base URL**: \`https://api.example.com/v1\`

**Authentication**: Bearer token (OAuth 2.0)

**Rate limits**: 1000 requests per hour per API key

### Authentication

To authenticate requests, include your API key in the Authorization header:

\`\`\`http
Authorization: Bearer YOUR_API_KEY
\`\`\`

**Obtaining an API key**:

1. Navigate to **Account > API Keys**.
2. Click "Generate New Key".
3. Copy the key and store it securely.

### Endpoints

#### Create Resource

\`\`\`http
POST /resources
\`\`\`

Creates a new resource.

**Headers**:

| Header | Value | Required |
| --- | --- | --- |
| \`Content-Type\` | \`application/json\` | Yes |
| \`Authorization\` | \`Bearer <token>\` | Yes |

**Request body**:

\`\`\`json
{
  "name": "Resource Name",
  "type": "standard",
  "configuration": {
    "enabled": true,
    "timeout": 30
  }
}
\`\`\`

**Parameters**:

| Field | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| \`name\` | String | Yes | Resource display name | 1-100 characters |
| \`type\` | String | Yes | Resource type | \`standard\`, \`premium\`, \`enterprise\` |
| \`configuration.enabled\` | Boolean | No | Enable resource | Default: \`true\` |
| \`configuration.timeout\` | Integer | No | Timeout in seconds | 1-300, Default: 30 |

**Response** (201 Created):

\`\`\`json
{
  "id": "res_abc123",
  "name": "Resource Name",
  "type": "standard",
  "status": "active",
  "created_at": "2024-03-20T10:30:00Z"
}
\`\`\`

**Error responses**:

| Status | Description | Example |
| --- | --- | --- |
| 400 | Invalid request body | \`{"error": "Invalid type value"}\` |
| 401 | Unauthorized | \`{"error": "Invalid API key"}\` |
| 409 | Resource already exists | \`{"error": "Resource name already in use"}\` |
| 429 | Rate limit exceeded | \`{"error": "Rate limit exceeded. Retry after 3600s"}\` |

---

#### List Resources

\`\`\`http
GET /resources
\`\`\`

Retrieves a paginated list of resources.

**Query parameters**:

| Parameter | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| \`page\` | Integer | No | Page number | 1 |
| \`per_page\` | Integer | No | Results per page | 20 |
| \`type\` | String | No | Filter by type | All types |
| \`status\` | String | No | Filter by status | All statuses |

**Response** (200 OK):

\`\`\`json
{
  "data": [
    {
      "id": "res_abc123",
      "name": "Resource 1",
      "type": "standard",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
\`\`\`

### Error handling

All errors follow this format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
\`\`\`

**Common error codes**:

| Code | HTTP Status | Description |
| --- | --- | --- |
| \`INVALID_REQUEST\` | 400 | Request body validation failed |
| \`UNAUTHORIZED\` | 401 | Invalid or missing API key |
| \`FORBIDDEN\` | 403 | Insufficient permissions |
| \`NOT_FOUND\` | 404 | Resource does not exist |
| \`RATE_LIMITED\` | 429 | Too many requests |
| \`INTERNAL_ERROR\` | 500 | Server error |

### SDKs and libraries

- [Python SDK](https://github.com/example/python-sdk)
- [JavaScript SDK](https://github.com/example/js-sdk)
- [Ruby SDK](https://github.com/example/ruby-sdk)

### Changelog

- **v1.2.0** (2024-03-20): Added \`configuration.timeout\` parameter
- **v1.1.0** (2024-02-15): Added \`type\` filter to list endpoint
- **v1.0.0** (2024-01-01): Initial release
`;

console.log("Creating output...");
let finalContent = `import { TaskType } from "./types";

export interface Template {
  title: string;
  requiredSections: string[];
  content: string;
}

export const TASK_TEMPLATES: Record<TaskType, Template> = {
  "procedure": {
    title: "Procedure",
    requiredSections: ["Task Title", "Purpose", "Prerequisites", "Procedure", "Result", "Troubleshooting"],
    content: ${JSON.stringify(procContent)}
  },
  "concept": {
    title: "Concept",
    requiredSections: ["Concept Name", "Overview", "Key characteristics", "How it works", "Use cases", "Comparison with related concepts", "Example", "Related topics"],
    content: ${JSON.stringify(conceptContent)}
  },
  "troubleshooting": {
    title: "Troubleshooting",
    requiredSections: ["Troubleshooting Topic", "Symptom", "Diagnostic steps", "Common problems and solutions", "Advanced diagnostics", "Related topics"],
    content: ${JSON.stringify(troubleshootContent)}
  },
  "reference": {
    title: "Reference",
    requiredSections: ["Reference Component", "Overview", "Configuration parameters", "Command-line options", "API endpoints", "Configuration file structure", "Environment variables", "Exit codes", "Related topics"],
    content: ${JSON.stringify(refContent)}
  },
  "tutorial": {
    title: "Tutorial",
    requiredSections: ["Tutorial Title", "What you will learn", "Prerequisites", "Overview", "Steps", "Testing your implementation", "Summary", "Next steps", "Troubleshooting"],
    content: ${JSON.stringify(tutorialContent)}
  },
  "release-notes": {
    title: "Release Notes",
    requiredSections: ["Release Notes Title", "Overview", "New features", "Improvements", "Bug fixes", "Breaking changes", "Deprecated features", "Security updates", "Known issues", "Upgrade instructions", "System requirements", "Download", "Contributors"],
    content: ${JSON.stringify(rnContent)}
  },
  "api-documentation": {
    title: "API Documentation",
    requiredSections: ["API Name", "Authentication", "Endpoints", "Error handling", "SDKs and libraries", "Changelog"],
    content: ${JSON.stringify(apiContent)}
  }
};

export function getTemplateFor(taskType: TaskType): Template {
  return TASK_TEMPLATES[taskType];
}
`;

fs.writeFileSync('src/engine/templates.ts', finalContent);
console.log("Done!");
