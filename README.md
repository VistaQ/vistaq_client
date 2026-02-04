# Agent Sales Cycle Evaluation System - Technical Documentation

## 1. System Architecture
**Architecture Style:** Modular Monolith (Logical) / Microservices (Physical scaling).
**Frontend:** React 18 SPA with TypeScript and Tailwind CSS.
**Backend (Simulated):** The current implementation uses React Context + LocalStorage to simulate a RESTful backend behavior.
**AI Layer:** Google Gemini API for intelligent coaching, market insights, and data analysis.

### High-Level Components
1.  **Auth Service:** Handles JWT issuance, role validation (RBAC).
2.  **Core API:** Manages Users, Groups, Prospects, Sales.
3.  **Workflow Engine:** State machine ensuring strict transitions (Info -> Appt -> Sales -> Points).
4.  **Reporting Engine:** Aggregates data for dashboards and CSV/PDF exports.
5.  **AI Gateway:** Interfaces with Gemini models for specific tasks (Search, Chat, Thinking).

## 2. Database Schema (ERD Concept)
*   **Users:** `id, name, email, role (ADMIN|TRAINER|LEADER|AGENT), group_id`
*   **Groups:** `id, name, leader_id`
*   **Prospects:** `id, agent_id, name, phone, email, status (NEW|APPOINTMENT|SALES|COMPLETED|LOST), created_at`
*   **WorkflowStates:** `id, prospect_id, stage (1-4), meta_data (json), completed_at`
*   **Sales:** `id, prospect_id, product_type, amount_myr, fyc_amount, status`
*   **Points:** `id, agent_id, prospect_id, points_value, reason, awarded_at`

## 3. Role-Based Permission Matrix
| Feature | Admin | Trainer | Group Leader | Agent |
| :--- | :---: | :---: | :---: | :---: |
| User Mgmt | ✅ | ❌ | ❌ | ❌ |
| View All Data | ✅ | ✅ | ❌ | ❌ |
| View Group Data | ✅ | ✅ | ✅ | ❌ |
| View Own Data | ✅ | ✅ | ✅ | ✅ |
| Manage Prospects | ❌ | ❌ | ❌ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ✅ (Self) |

## 4. Security Considerations
1.  **RBAC Guards:** Frontend routes are protected by higher-order components checking user roles.
2.  **Data Isolation:** `DataContext` filters data queries based on the logged-in user's ID and Role Scope.
3.  **Input Validation:** Strict typing and Zod schemas (conceptual) on forms.

## 5. Deployment Strategy
*   **CI/CD:** GitHub Actions -> Build -> S3/CloudFront (Frontend) + ECS/Fargate (Backend).
*   **Environment:** Production build with distinct API keys for Gemini.
