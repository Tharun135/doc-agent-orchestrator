# Governance Question Triggers (Reference)

This document contains the full list of 42 triggers used by the `doc-agent-orchestrator` to detect gaps in documentation.

## Category 1: Location & Navigation
1.1 **Missing UI Location** - Step has no UI location and one is needed to act.
1.2 **Partial Navigation Path** - Navigation assumes context ("Go to Settings" without starting point).
1.3 **Vague Adjectives as Location** - "appropriate section", "relevant tab", "correct panel".
1.4 **Embedded Conditional Actions Without Location** - Conditional action without UI location.
1.5 **Navigation to Undefined Destination** - "Navigate to Tags" without knowing what/where it is.
1.6 **Third-Person User Actions Without Location** - "User configures the timeout".

## Category 2: Action Clarity
2.1 **Vague Objects or Parameters** - "validates something", "processes data".
2.2 **Actor Ambiguity** - Passive voice without clear actor ("The file is uploaded").
2.3 **Timing/Schedule Unspecified** - "Run the job" without frequency.
2.4 **Multi-Step Actions Collapsed** - Single sentence containing 3+ action verbs.
2.5 **Authentication Method Missing** - "login required" without method specification.
2.6 **Visual Element Without Description** - "Click the icon" without describing which one.

## Category 3: Values & Parameters
3.1 **Set/Configure Without Value** - "Set timeout" without value.
3.2 **Default Values Unspecified** - "defaults to something".
3.3 **Numeric Values Without Units** - "set timeout to 30".
3.4 **Placeholder Tokens Undefined** - `{placeholder}`, `<value>`.
3.5 **Vague Adjectives as Selection Criteria** - "select the appropriate option".
3.6 **Vague Enumeration** - "or whatever", "etc.".
3.7 **Incomplete Enumeration** - "Update settings, etc.".

## Category 4: Conditionals & Branching
4.1 **Conditional Pass Without Indicator** - Success condition without visible outcome.
4.2 **Error Branch Without Recovery** - Error condition with no defined recovery path.
4.3 **Error Appearance Undefined** - "If error occurs" without describing the error.
4.4 **Branch Convergence Missing** - Multiple paths with no common next step.
4.5 **Conditional Prerequisites Undefined** - "May need", "might require".
4.6 **Alternative Path Selection Criteria** - "Method A or Method B" without decision guidance.

## Category 5: Verification & Success
5.1 **Verification Without Method** - "Test connection" without method.
5.2 **Wait Condition Missing** - "Wait for X" without completion signal.
5.3 **State Transition Without Indicator** - "Service becomes active".
5.4 **Success Outcome Missing** - Terminal action without stated result.
5.5 **Restart/Reboot Without Wait Condition** - "Restart runtime" with no wait condition.
5.6 **Vague Completion Status** - "mostly done", "almost ready".
5.7 **Configuration Dependency Checks** - "If the connector is configured for real-time mode...".

## Category 6: Data & Format
6.1 **Data Format Ambiguity** - "export file" without format.
6.2 **Scope/Quantity Unclear** - "import tags" without count/scope.
6.3 **Scope Selection Method Missing** - "selected" items without selection method.
6.4 **Role-Based Access Without Specifics** - "Admins can access".
6.5 **Declarative Vague Enumeration** - "Tags include device name, status, and other fields".

## Category 7: Context & References
7.1 **Check Logs Without Specification** - "Check logs" with no log name.
7.2 **External Reference Without Details** - "See the guide" without steps.
7.3 **Version/Environment Unspecified** - "In the new version".
7.4 **Context Switching Without Method** - "Switch to Runtime view".

## Category 8: Recovery & Maintenance
8.1 **Deployment Without Rollback** - Production deployment without revert path.
8.2 **Fix Without Description** - "Fixed the issue" in past tense.
8.3 **Past-Tense Fix with Vague Condition** - "Changed X that was causing issues".
8.4 **Irreversible Action Warnings** - "delete" without acknowledging permanence.

## Category 9: Incompleteness & Placeholders
9.1 **Incomplete Step Annotation** - "(details TBD)", "TODO".
9.2 **Undefined Standard Process** - "follow standard procedure".
9.3 **Navigation Missing Intermediate Steps** - Jump from A to C without B.
