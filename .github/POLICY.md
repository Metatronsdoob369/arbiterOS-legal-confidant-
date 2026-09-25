# GitHub Policy and Actions Guidelines

## Overview

This document outlines the repository policy for GitHub Actions, deployments, and AI model usage within CI/CD pipelines.

---

## 1. Deployment & Infrastructure Policy (Vercel Removal)

- **Vercel Removal**: Vercel integration and automated deployments to Vercel have been removed and are no longer supported.
- **CI Focus**: GitHub Actions workflows are dedicated exclusively to verification, testing (unit, e2e), type checking, and artifact building.
- **No External Deployment Triggers**: Workflows must not require or invoke external Vercel tokens or deployment actions.

---

## 2. AI Model Usage Policy for GitHub Actions

- **Allowed Models in CI**: GitHub Actions workflows must only use mock AI providers or designated open/compliant models (e.g., `test-model`, `gpt-4o-mini`, or local `llama3.1` stubs).
- **Prohibited Models**: Direct invocation of restricted or paid external AI models that require production API keys or breach rate-limits is prohibited during automated GitHub Actions runs.
- **Mocking Requirement**: End-to-end and unit tests running on GitHub Actions must mock AI provider network calls (as configured in `playwright.config.ts` with `AI_MODEL: test-model`).
