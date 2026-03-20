import { TaskType } from "./types";

export interface Template {
  title: string;
  requiredSections: string[];
  content: string;
}

export const TASK_TEMPLATES: Record<TaskType, Template> = {
  "procedure": {
    title: "Procedure",
    requiredSections: ["Overview", "Prerequisites", "Procedure", "Result"],
    content: `# Overview

Explain what the procedure does.

# Prerequisites

List conditions required before starting.

# Procedure

1. Step-by-step instructions.

# Result

Describe what the user should see when completed.
`
  },

  "concept": {
    title: "Concept",
    requiredSections: ["Overview", "Key Components", "How It Works", "Important Considerations"],
    content: `# Overview

Describe the concept at a high level.

# Key Components

List and briefly describe the main components.

# How It Works

Explain processes and interactions.

# Important Considerations

Add caveats, limitations, or notes.
`
  },

  "troubleshooting": {
    title: "Troubleshooting",
    requiredSections: ["Symptoms", "Possible Causes", "Verification Steps", "Resolution"],
    content: `# Symptoms

Describe observable symptoms.

# Possible Causes

List likely causes.

# Verification Steps

Steps to reproduce or verify the issue.

# Resolution

Steps to resolve the problem.
`
  },

  "reference": {
    title: "Reference",
    requiredSections: ["Description", "Parameters / Options", "Example", "Related Information"],
    content: `# Description

Short description of the item.

# Parameters / Options

List parameters and options.

# Example

Provide an example usage.

# Related Information

Links or pointers to related docs.
`
  },

  "tutorial": {
    title: "Tutorial",
    requiredSections: ["Objective", "Prerequisites", "Steps", "Verification", "Next Steps"],
    content: `# Objective

State the learning objective.

# Prerequisites

List what the learner needs.

# Steps

Step-by-step tutorial.

# Verification

How to confirm the tutorial succeeded.

# Next Steps

Suggested follow-ups.
`
  },

  "release-notes": {
    title: "Release Notes",
    requiredSections: ["New Features", "Improvements", "Bug Fixes", "Breaking Changes", "Known Issues"],
    content: `# New Features

List new features.

# Improvements

List notable improvements.

# Bug Fixes

List fixes.

# Breaking Changes

Document any breaking changes.

# Known Issues

List known issues.
`
  },
  "api-documentation": {
    title: "API Documentation",
    requiredSections: ["Endpoint / Function", "Description", "Request / Parameters", "Response / Return Value", "Examples", "Error Handling"],
    content: `# Endpoint / Function

Describe the endpoint or function name.

# Description

Short description of what the endpoint does.

# Request / Parameters

List request parameters, types, and descriptions.

# Response / Return Value

Describe the response format and fields.

# Examples

Provide example requests and responses.

# Error Handling

List error codes and handling guidance.
`
  },
};

export function getTemplateFor(taskType: TaskType): Template {
  return TASK_TEMPLATES[taskType];
}
