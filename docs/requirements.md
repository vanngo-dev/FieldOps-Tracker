# Product Requirements

## Product Purpose

FieldOps Workflow Tracker helps field operations teams plan project work, capture field activity, manage employee time, track asset usage, and route operational records through approval workflows.

The product is intended for teams where project execution happens outside a central office, updates arrive from field users, and managers need a reliable view of work status before payroll, reporting, or closeout decisions are made.

## Users

### Admin

Admins maintain the system setup and access boundaries.

Key responsibilities:

- Manage user accounts and role assignment.
- Maintain employee records.
- Maintain asset inventory records.
- Support workflow configuration and operational cleanup.
- View system-wide records for audit and support.

### Project Manager

Project Managers oversee project execution and approve operational records.

Key responsibilities:

- Create and update project records.
- Assign employees and assets to projects.
- Review timesheets and field reports.
- Approve, reject, or request changes for submitted records.
- Monitor project status, field progress, blockers, and closeout readiness.

### Field User

Field Users submit work updates from the field.

Key responsibilities:

- View assigned projects.
- Submit timesheets for work performed.
- Submit field reports for daily activity, blockers, and notes.
- Record asset usage or issues.
- Respond to rejected records or requested changes.

## Core Workflows

### Project Setup and Execution

1. An Admin or Project Manager creates a project.
2. A Project Manager assigns employees and assets.
3. Field Users perform work against the assigned project.
4. Field Users submit timesheets and field reports.
5. Project Managers review submitted records.
6. Approved records become available for downstream reporting and closeout.
7. Completed projects are closed when required reports, time, and assets are reconciled.

### Timesheet Submission and Approval

1. A Field User creates a timesheet for a project and work date.
2. The timesheet can remain in draft while being edited.
3. The Field User submits the timesheet for approval.
4. A Project Manager approves, rejects, or requests changes.
5. Rejected or change-requested timesheets return to the Field User for correction.

### Field Report Submission and Approval

1. A Field User creates a field report for a project and report date.
2. The report captures work performed, safety notes, blockers, and general observations.
3. The Field User submits the report.
4. A Project Manager reviews the report.
5. Approved reports become part of the project activity history.

### Asset Assignment and Tracking

1. An Admin creates asset records.
2. A Project Manager assigns available assets to projects or employees.
3. Field Users can report asset usage notes or issues through field reports.
4. Assets can be marked as available, assigned, in maintenance, retired, or lost.
5. Assets should be reconciled before project closeout.

### Approval Handling

1. Submittable records create or enter an approval flow.
2. The assigned approver reviews the submitted record.
3. Approval decisions are captured with status, reviewer, timestamp, and optional notes.
4. Approved records become locked for ordinary field edits unless reopened by an authorized user.

## Core Modules

### Projects

Projects represent field work engagements or operational jobs. The module tracks project identity, manager ownership, lifecycle status, assigned employees, assigned assets, and related operational records.

### Employees

Employees represent people available for assignment to field work. Employee records may be linked to user accounts when the person needs system login access.

### Timesheets

Timesheets capture employee labor by project, date, and hours worked. Timesheets are submitted by Field Users and reviewed by Project Managers.

### Field Reports

Field Reports capture daily or shift-level project activity, including work performed, safety notes, blockers, asset notes, and general field observations.

### Assets

Assets represent equipment, vehicles, devices, or other tracked resources used in field work. Assets can be assigned, maintained, retired, or marked lost.

### Approvals

Approvals represent review decisions for submitted operational records. The initial approval targets are timesheets and field reports, with room for asset-related approval requests in later phases.

## Statuses

### Project Statuses

- `planned`: Project is defined but field work has not started.
- `active`: Project is in progress.
- `on_hold`: Project is paused and not currently accepting normal field progress.
- `completed`: Project work is finished and records are reconciled.
- `cancelled`: Project will not proceed.

### Timesheet Statuses

- `draft`: Timesheet is editable and not submitted.
- `submitted`: Timesheet is waiting for manager review.
- `approved`: Timesheet has been accepted.
- `rejected`: Timesheet has been rejected and needs correction or cancellation.
- `voided`: Timesheet is no longer valid.

### Field Report Statuses

- `draft`: Report is editable and not submitted.
- `submitted`: Report is waiting for manager review.
- `under_review`: Report is actively being reviewed.
- `approved`: Report has been accepted into the project record.
- `rejected`: Report has been rejected and needs correction.
- `archived`: Report is retained for history and no longer active.

### Asset Statuses

- `available`: Asset is available for assignment.
- `assigned`: Asset is assigned to a project or employee.
- `in_maintenance`: Asset is unavailable due to maintenance.
- `retired`: Asset is no longer in service.
- `lost`: Asset cannot be located or recovered.

### Approval Statuses

- `pending`: Approval is waiting for reviewer action.
- `approved`: Reviewer accepted the submitted record.
- `rejected`: Reviewer rejected the submitted record.
- `changes_requested`: Reviewer requires updates before approval.
- `cancelled`: Approval request was withdrawn or invalidated.

## Business Rules

- Field Users should only submit timesheets and reports for projects they are assigned to.
- Project Managers should approve records only for projects they manage or are delegated to review.
- Admins can view and maintain records across the system.
- Submitted records should preserve who submitted them and when.
- Approval decisions should preserve reviewer, decision timestamp, status, and notes.
- Approved records should not be casually edited by Field Users.
- Project closeout should require relevant timesheets, reports, and asset assignments to be reconciled.

## Phase Boundary

This document defines requirements only. No application code, package initialization, database schema, API routes, frontend screens, authentication, or persistence implementation belongs in this phase.
