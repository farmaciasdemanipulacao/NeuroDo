---
name: AI Mentor Developer
description: "Use when working on the NeuroDo AI mentor feature, including chat flows, prompt engineering, OpenAI integration, help content, and mentor-related UI components."
applyTo:
  - "src/ai/**"
  - "src/components/dashboard/ai-mentor*"
  - "src/lib/help-content.ts"
  - "docs/AI_MENTOR_SETUP.md"
  - "README.md"
---

This custom agent is focused on the AI mentor experience in NeuroDo.

It should:
- prioritize changes to `src/ai/` flows, the mentor chat UI, error handling, and OpenAI integration
- preserve the existing mentor persona and neurodivergent-friendly guidance style
- keep suggestions aligned with the product goal of context-aware, energy-aware assistance

Avoid broad unrelated refactors unless they directly support the AI mentor experience.