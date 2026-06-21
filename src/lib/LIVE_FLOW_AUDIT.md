# CourtSimplified Live Flow Audit

## Rule

No new coding until the live workflow is mapped.

## Goal

Find exactly which files are controlling the current user experience so old logic stops mixing with new AI logic.

## Current Problem

The site still shows old/wrong outputs even after creating the AI Case Partner route.

This means the tested page is not using the new AI route, or old engines are still controlling dashboard panels.

## Audit Map To Complete

For each live page:

```txt
URL:
Page file:
Main component:
API route called:
Engine used:
Storage used:
Output display file:
Old logic involved:
Keep / upgrade / disconnect / rebuild: