# 🎯 AI Coding Practice Coach - Frontend

## Project Overview

AI Coding Practice Coach is an intelligent coding  platform that combines problem-solving, real-time code execution, AI-powered mentoring, and personalized learning recommendations. The platform helps users improve their programming skills through guided practice, automated evaluation, and targeted feedback tailored to their learning progress.

## Target Users

- Students preparing for coding interviews.
- Developers improving problem-solving skills.
- Competitive programming beginners.
- University students learning Data Structures and Algorithms.

## Core Features

### Feature 1: Coding Question Repository
Users can solve curated coding problems categorized by topic, difficulty, and learning objectives.

### Feature 2: Integrated Code Editor & Execution Engine
Users can write, execute, and validate solutions against predefined test cases directly within the platform.

### Feature 3: AI-Powered Mentoring & Hint Generation
The Mentor Agent provides contextual hints, explanations, and learning guidance based on evaluation results, attempt history, and learner profile without revealing complete solutions.

### Feature 4: Personalized Learning & Recommendations
The Profile & Skill Agent tracks learner progress, identifies strengths and weaknesses, and recommends targeted practice questions.

### Feature 5: Solution Evaluation & Interview Readiness
The Evaluation Agent analyzes correctness, complexity, code quality, and edge-case handling, then generates interview-style follow-up questions to strengthen understanding.

## AI Agents

### Mentor Agent
Provides contextual hints and explanations without revealing complete solutions.

### Evaluation Agent
Analyzes correctness, complexity, code quality, and edge-case handling.

### Profile & Skill Agent
Tracks learner progress and identifies knowledge gaps.

### Recommendation Agent
Suggests personalized practice problems based on performance trends.

---

## ⚛️ Tech Stack

### Core

* React.js — Frontend library
* TypeScript — Type-safe application development
* Vite — Fast development and optimized production builds

### Routing

* TanStack Router — Type-safe client-side routing

### State Management

* Zustand — Client-side state management
* TanStack Query — Server-state management, caching, and synchronization

### UI & Styling

* Tailwind CSS — Utility-first styling
* Shadcn UI — Reusable component system
* Radix UI — Accessible UI primitives

### Forms & Validation

* React Hook Form — Form state management
* Zod — Schema validation and type inference

### Data Visualization

* Recharts — Business dashboards and analytics
* Apache ECharts — Advanced visualizations

### Code Quality

* Biome — Formatting, linting, and static analysis

---

## 🚀 Installation

### Prerequisites

* Node.js v20+
* pnpm

### Setup

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project:

```bash
cd skill-gap-detection-agent-frontend
```

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:5173
```

---

## 📜 Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build production bundle
pnpm preview      # Preview production build

pnpm lint         # Run lint checks
pnpm format       # Format code
pnpm check        # Run Biome checks
pnpm check:fix    # Automatically fix issues
```

---

## 🏗️ Architecture

The application follows a **Feature-Based Architecture**.

Each feature owns its:

* Components
* Hooks
* Services
* Store
* Schemas
* Types
* Utilities
* Static Data

This keeps business logic close to the feature it belongs to and prevents the codebase from becoming difficult to maintain as it grows.

### Rule of Thumb

Before creating a file in a root-level directory, ask:

> Will this be used by multiple features?

If yes → place it in a shared/global directory.

If no → keep it inside the feature.

---

## 📂 Project Structure

```txt
src
│
├── assets/
│
├── components/
│   ├── common/              # Shared reusable components
│   └── ui/                  # Shadcn UI components
│
├── constants/              # Global constants
├── hooks/                  # Shared hooks
├── layouts/                # Application layouts
├── providers/              # Global providers
├── routes/                 # TanStack Router routes
├── schemas/                # Shared schemas
├── services/               # Shared services
├── store/                  # Global stores
├── types/                  # Shared types
├── lib/                    # Shared
│
├── features/
│   │
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── data/
│   │   └── index.ts
│   │
│   ├── profile-analysis/
│   ├── skill-gap-analysis/
│   ├── assessments/
│   └── recommendations/
│
├── main.tsx
└── ...
```

---

## 📁 Folder Responsibilities

| Folder            | Responsibility                  |
| ----------------- | ------------------------------- |
| features          | Feature-specific business logic |
| components/common | Shared reusable components      |
| components/ui     | Shadcn UI components            |
| types             | Shared TypeScript types         |
| schemas           | Shared Zod schemas              |
| utils             | Shared utility functions        |
| providers         | Application providers           |
| store             | Global Zustand stores           |
| routes            | Route definitions               |
| layouts           | Application layouts             |
| constants         | Application-wide constants      |

---

## 🔄 State Management Strategy

### Zustand

Use for:

* Authentication state
* Theme state
* UI state
* Local application state

### TanStack Query

Use for:

* API requests
* User data
* Skill analysis results
* Learning recommendations
* Assessment results
* Query caching
* Mutations

### Important Rule

❌ Do not store API data in Zustand.

✅ Use TanStack Query for all server state.

---

## 📝 Forms & Validation

All forms should use:

* React Hook Form
* Zod

Example structure:

```txt
features/authentication/
├── components/
│   └── login-form.tsx
├── schemas/
│   └── login-schema.ts
└── services/
    └── auth-service.ts
```

All user input must be validated before submission.

---

## 📐 Development Guidelines

### File Naming

Use **kebab-case** for all files and folders.

✅ Good

```txt
skill-gap-card.tsx
profile-summary.tsx
learning-path.tsx
use-auth.ts
user-service.ts
```

❌ Bad

```txt
SkillGapCard.tsx
ProfileSummary.tsx
LearningPath.tsx
UserService.ts
```

---

### Component Naming

Use **PascalCase** for React components.

```tsx
export function SkillGapCard() {
  return <div>Skill Gap Card</div>;
}
```

---

### Hook Naming

All custom hooks must start with `use`.

```txt
use-auth.ts
use-user-profile.ts
use-skill-analysis.ts
```

---

### Store Naming

```txt
auth-store.ts
theme-store.ts
assessment-store.ts
```

---

### Service Naming

```txt
auth-service.ts
user-service.ts
assessment-service.ts
recommendation-service.ts
```

---

### Schema Naming

```txt
login-schema.ts
profile-schema.ts
assessment-schema.ts
```

---

### API Layer Rules

All API requests must live inside service files.

✅ Good

```ts
export const getProfile = () =>
  api.get("/profile");
```

❌ Avoid API calls directly inside components.

---

### Import Order

```ts
// React
import { useState } from "react";

// Third-party libraries
import { useQuery } from "@tanstack/react-query";

// Internal imports
import { Button } from "@/components/ui/button";

// Relative imports
import "./styles.css";
```

---

### TypeScript Rules

* Avoid `any`
* Prefer `unknown` when needed
* Use interfaces and types appropriately
* Keep types close to their feature unless shared

---

### Styling Rules

* Use Tailwind CSS first
* Reuse Shadcn UI components
* Avoid inline styles
* Avoid custom CSS unless necessary

---

### Component Rules

* Keep components focused and reusable
* Prefer composition over prop drilling
* Keep business logic outside presentation components

---

### Git Commit Convention

Follow Conventional Commits.

```txt
feat: add skill gap dashboard
fix: resolve assessment validation issue
refactor: simplify recommendation logic
docs: update setup guide
style: format dashboard components
chore: update dependencies
```

---

## 🎯 Development Principles

* Type Safety First
* Feature-Based Architecture
* Reusable Components
* Accessibility by Default
* Clean Code Practices
* Consistent User Experience
* Performance-Oriented Development
* Maintainability Over Cleverness
* Scalability Over Short-Term Convenience

---

## ✅ Pull Request Checklist

Before creating a PR:

```bash
pnpm check
pnpm build
```

Ensure:

* No TypeScript errors
* No linting issues
* Production build succeeds
* New code follows project conventions
* Feature-specific code remains inside its feature directory

---

## 🤝 Support & Contribute

If you found this project helpful, consider giving it a ⭐ on GitHub.

Contributions, suggestions, and improvements are always welcome.
