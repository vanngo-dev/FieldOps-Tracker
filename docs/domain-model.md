# Domain Model

## Overview

This domain model describes the core entities, fields, relationships, and statuses for the FieldOps Workflow Tracker. It is intended to guide backend implementation in later phases without introducing database schema files in this phase.

## Entities

### User

Represents a person who can authenticate and use the system.

Key fields:

- `id`
- `name`
- `email`
- `role`
- `status`
- `employeeId`
- `createdAt`
- `updatedAt`

Statuses:

- `active`
- `inactive`

Roles:

- `admin`
- `project_manager`
- `field_user`

Relationships:

- A User may be linked to one Employee.
- A User may manage many Projects as a Project Manager.
- A User may submit Timesheets and Field Reports.
- A User may review Approval records.

### Employee

Represents a field operations employee or worker tracked by the business.

Key fields:

- `id`
- `employeeNumber`
- `firstName`
- `lastName`
- `jobTitle`
- `trade`
- `phone`
- `email`
- `status`
- `userId`
- `createdAt`
- `updatedAt`

Statuses:

- `active`
- `inactive`
- `on_leave`

Relationships:

- An Employee may be linked to one User account.
- An Employee may be assigned to many Projects through Project Assignment records.
- An Employee may create many Timesheets.
- An Employee may be assigned Assets.

### Project

Represents a field work engagement, job, or operational project.

Key fields:

- `id`
- `projectCode`
- `name`
- `description`
- `clientName`
- `siteLocation`
- `projectManagerId`
- `status`
- `plannedStartDate`
- `plannedEndDate`
- `actualStartDate`
- `actualEndDate`
- `createdAt`
- `updatedAt`

Statuses:

- `planned`
- `active`
- `on_hold`
- `completed`
- `cancelled`

Relationships:

- A Project belongs to one Project Manager User.
- A Project has many Project Assignments.
- A Project has many Timesheets.
- A Project has many Field Reports.
- A Project may have many assigned Assets.
- A Project may have many Approval records through submitted project records.

### Project Assignment

Represents an Employee assignment to a Project.

Key fields:

- `id`
- `projectId`
- `employeeId`
- `assignmentRole`
- `startDate`
- `endDate`
- `status`
- `createdAt`
- `updatedAt`

Statuses:

- `planned`
- `active`
- `completed`
- `removed`

Relationships:

- A Project Assignment belongs to one Project.
- A Project Assignment belongs to one Employee.

### Timesheet

Represents employee time submitted for project work.

Key fields:

- `id`
- `projectId`
- `employeeId`
- `submittedByUserId`
- `workDate`
- `regularHours`
- `overtimeHours`
- `notes`
- `status`
- `submittedAt`
- `approvedAt`
- `approvedByUserId`
- `createdAt`
- `updatedAt`

Statuses:

- `draft`
- `submitted`
- `approved`
- `rejected`
- `voided`

Relationships:

- A Timesheet belongs to one Project.
- A Timesheet belongs to one Employee.
- A Timesheet is submitted by one User.
- A Timesheet may be approved by one Project Manager User.
- A Timesheet may have one or more Approval records over time.

### Field Report

Represents a field activity report for a project and date.

Key fields:

- `id`
- `projectId`
- `authorUserId`
- `reportDate`
- `workPerformed`
- `safetyNotes`
- `blockers`
- `assetNotes`
- `generalNotes`
- `status`
- `submittedAt`
- `reviewedAt`
- `reviewedByUserId`
- `createdAt`
- `updatedAt`

Statuses:

- `draft`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `archived`

Relationships:

- A Field Report belongs to one Project.
- A Field Report is authored by one User.
- A Field Report may be reviewed by one Project Manager User.
- A Field Report may reference Assets in narrative notes.
- A Field Report may have one or more Approval records over time.

### Asset

Represents equipment, vehicles, devices, or other tracked operational resources.

Key fields:

- `id`
- `assetTag`
- `name`
- `assetType`
- `serialNumber`
- `status`
- `assignedProjectId`
- `assignedEmployeeId`
- `lastServiceDate`
- `nextServiceDate`
- `notes`
- `createdAt`
- `updatedAt`

Statuses:

- `available`
- `assigned`
- `in_maintenance`
- `retired`
- `lost`

Relationships:

- An Asset may be assigned to one Project.
- An Asset may be assigned to one Employee.
- An Asset may be mentioned in many Field Reports.
- An Asset may participate in Approval records if assignment or maintenance approval is added later.

### Approval

Represents a review request and decision for a submitted operational record.

Key fields:

- `id`
- `subjectType`
- `subjectId`
- `requestedByUserId`
- `reviewerUserId`
- `status`
- `decisionNotes`
- `requestedAt`
- `decidedAt`
- `createdAt`
- `updatedAt`

Statuses:

- `pending`
- `approved`
- `rejected`
- `changes_requested`
- `cancelled`

Relationships:

- An Approval belongs to one submitted subject record.
- An Approval is requested by one User.
- An Approval is reviewed by one Project Manager or Admin User.
- A Timesheet may have many Approval records over time.
- A Field Report may have many Approval records over time.
- Future approval subjects may include asset assignment or project closeout requests.

Subject types:

- `timesheet`
- `field_report`
- `asset_request`
- `project_closeout`

## Relationship Summary

- User to Employee: optional one-to-one.
- User to Project: one Project Manager User manages many Projects.
- Project to Employee: many-to-many through Project Assignment.
- Project to Timesheet: one-to-many.
- Employee to Timesheet: one-to-many.
- Project to Field Report: one-to-many.
- User to Field Report: one-to-many as author.
- Project to Asset: optional one-to-many for assigned assets.
- Employee to Asset: optional one-to-many for assigned assets.
- Timesheet to Approval: one-to-many.
- Field Report to Approval: one-to-many.

## Implementation Notes For Later Phases

- Use stable identifiers for all entities.
- Preserve timestamps for creation, update, submission, and review events.
- Store statuses as constrained values.
- Keep approval history separate from the latest status on the submitted record.
- Enforce role-based authorization in the backend before exposing write operations.
- Defer physical database schema, migrations, API routes, and UI implementation to later phases.
