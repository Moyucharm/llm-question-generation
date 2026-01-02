# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuAIz is a modern AI-driven online quiz generation and grading system built with React 19, TypeScript, and Vite. The application allows users to generate personalized quizzes through AI, take the quizzes online, and receive automated grading with detailed feedback.

Key features include:
- AI-powered quiz generation with multiple question types
- Online quiz-taking with responsive design
- Automated AI grading with detailed feedback
- Streaming generation and grading for real-time user experience
- Real-time logging system with virtualized rendering for performance
- Time tracking functionality

## Technology Stack

- React 19 with TypeScript
- Vite 7 for build tooling
- Zustand 5 for state management
- TailwindCSS 4 for styling
- React Window for virtualized rendering
- Lucide React for icons
- ESLint 9 and Prettier for code quality

## Project Structure

```
src/
├── components/    # Reusable UI components organized by feature
├── pages/         # Page components (generation, quiz, result)
├── stores/        # Zustand state management organized by feature
├── llm/           # LLM API integration layer
├── types/         # TypeScript type definitions
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── config/        # Application configuration
├── router/        # Application routing
└── test/          # Test utilities
```

## Common Development Commands

- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm check` - Run ESLint and TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm lint:fix` - Auto-fix ESLint issues

## Architecture Overview

### State Management
The application uses Zustand for state management with a modular approach:
- Main store in `src/stores/useAppStore.ts`
- Modular actions in separate files (`generationActions.ts`, `answeringActions.ts`, `gradingActions.ts`)
- Time tracking in `timeRecorderStore.ts`
- Logging system in `logStore/`

### Routing
The application uses a state-based routing system in `src/router/AppRouter.tsx` that automatically switches pages based on the application state:
1. Generation page (default)
2. Quiz page (when quiz is generated)
3. Streaming quiz page (during generation)
4. Result page (after submission)

### Component Organization
Components are organized into feature-based modules:
- Questions: `src/components/Question/`
- Logging: `src/components/LogPanel/`
- Time tracking: `src/components/TimeRecorder/`
- Floating UI: `src/components/FloatingButton/`

### LLM Integration
The LLM integration is abstracted in the `src/llm/` directory with:
- API clients in `src/llm/api/`
- Business services in `src/llm/services/`
- Prompt templates in `src/llm/prompt/`

## Development Guidelines

### Code Quality
- TypeScript is used throughout with strict type checking
- ESLint and Prettier are configured for consistent code style
- Husky is used for git hooks to enforce code quality

### Performance Considerations
- Virtualized rendering with React Window for large data sets
- React.memo, useMemo, and useCallback for optimization
- Streaming data handling for real-time user experience