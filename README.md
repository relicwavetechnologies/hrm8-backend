# Backend HRM8

A modern, scalable backend for the HRM8 Human Resource Management System, built with Node.js, Express, TypeScript, and Prisma.

## 🚀 Tech Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **ORM**: Prisma
-   **Package Manager**: pnpm

## 🛠️ Getting Started

### Prerequisites

-   Node.js (v18+)
-   pnpm (`npm install -g pnpm`)
-   PostgreSQL

### Installation

1.  Clone the repository:
    ```bash
    git clone <repo-url>
    cd backend-hrm8
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables:
    ```bash
    cp .env.example .env
    # Update .env with your database credentials and secrets
    ```

4.  Initialize Database:
    ```bash
    pnpm prisma:generate
    pnpm prisma:push
    ```

5.  Start the development server:
    ```bash
    pnpm dev
    ```

## 🏗️ Architecture

This project follows a modular **Repository-Service-Controller** pattern to ensure separation of concerns and maintainability.

### Structure (`src/modules/`)

Each feature (e.g., `auth`, `user`, `company`) is a self-contained module containing:

-   **Controller** (`*.controller.ts`): Handles HTTP requests, validation, and responses.
-   **Service** (`*.service.ts`): Contains business logic.
-   **Repository** (`*.repository.ts`): Handles direct database interactions using Prisma.
-   **Routes** (`*.routes.ts`): Defines API endpoints and middlewares.

### Core Components (`src/core/`)

-   `BaseController`: Standardized response handling (`sendSuccess`, `sendError`).
-   `BaseService`: Common service logic.
-   `BaseRepository`: Wrapper around Prisma client.
-   `HttpException`: Standardized error class.

## 🤖 AI-Assisted Development & Contribution

We strongly encourage using AI IDEs (like Trae, Cursor, or VS Code with Copilot) to contribute to this project. To maximize efficiency and maintain context, we use a **Task-Based Workflow**.

### Using the `tasks/` Folder

The `tasks/` directory is the "brain" of our development process. It helps AI agents understand the current context, goals, and progress without needing to read the entire chat history.

**Workflow:**

1.  **Start a New Task**:
    -   Create a markdown file in `tasks/` (e.g., `tasks/feat-add-billing.md`).
    -   Describe the objective, requirements, and steps.

2.  **During Development**:
    -   Reference this file in your prompt to the AI (e.g., "Check `tasks/feat-add-billing.md` and implement step 1").
    -   Ask the AI to update the task file as it completes steps (checking off items, adding notes).

3.  **Benefits**:
    -   **Context Retention**: The AI can always "remember" the plan by reading the task file.
    -   **Documentation**: The task file becomes a record of implementation details.
    -   **Handover**: Easy for another developer (or AI session) to pick up where you left off.

### Contribution Guidelines

Please verify your code against our standards before committing.

1.  **Read the Maintainer Guide**: See [maintainer.md](./maintainer.md) for strict coding rules (Type safety, Class structure, Error handling).
2.  **Run Checks**:
    ```bash
    pnpm build  # Must pass without errors
    pnpm lint   # Code style check
    ```
3.  **Verify**: Ensure all new modules are registered in `src/loaders/express.ts`.

## 📄 License

[License Name]
