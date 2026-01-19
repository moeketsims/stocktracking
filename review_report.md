# Code Review Report: Potato Stock Tracking Platform

This report provides a comprehensive review of the current state of the codebase, covering project organization, database architecture, mobile application structure, and security.

## Executive Summary

The project is well-organized and leverages modern, industry-standard technologies (React Native/Expo, Supabase, TanStack Query, Zustand). The database schema is robust, and the application architecture is clean and maintainable. 

However, there is a discrepancy between the project documentation (README) and the actual implementation regarding **Offline Support**, and there is a recommendation for improving **data atomicity** in critical stock operations.

---

## 1. Project Organization & Configuration

- **Monorepo Structure**: The use of a monorepo for `apps/mobile` and `infra/supabase` is appropriate and helps keep infrastructure close to the application logic.
- **Dependencies**: Dependency versions are modern (e.g., React 19, Expo 54, Supabase-js 2.39).
- **TypeScript**: The codebase is fully TypeScript-enabled with generated database types in `src/types/database.ts`.

## 2. Database & Security Review

- **Schema Design**: 
    - The **Ledger Pattern** in `stock_transactions` is excellent for traceability and auditability. 
    - **Batch Tracking** (FIFO support) is correctly implemented in `stock_batches`.
    - Views like `stock_balance` and `batch_balance` efficiently handle complex calculations.
- **Security (RLS)**: 
    - Row-Level Security (RLS) is enabled on all critical tables.
    - Custom helper functions (e.g., `has_location_access`) simplify policy management.
    - **Security Fixes**: The presence of `security_invoker = true` on views and `SET search_path = public` on `SECURITY DEFINER` functions shows a high degree of security awareness.
- **Audit Logging**: Comprehensive, immutable audit logs are automated via database triggers on critical tables (`profiles`, `locations`, `zones`, `stock_transactions`).

## 3. Application Architecture Review

- **Core Logic**: Logic is appropriately abstracted into custom hooks (e.g., `useAuth`, `useTransactions`).
- **State Management**: The combination of **TanStack Query** (server state) and **Zustand** (global client state) is a best-practice approach.
- **Routing**: **Expo Router** is used effectively with grouping for `(auth)` and `(tabs)`.
- **UI System**: A clean theme-driven approach is used in `src/constants/theme.ts` with custom UI components.

## 4. Key Findings & Recommendations

### ⚠️ Atomicity of Stock Operations
> [!IMPORTANT]
> Operations like `useReceiveStock` and `useIssueStock` perform multiple individual Supabase calls (insert transaction -> insert batch -> update transaction). If any step fails mid-way, it could lead to data inconsistency.
> **Recommendation**: Move these multi-step operations into **Supabase RPC (PostgreSQL functions)** to ensure they run within a single database transaction.

### ❓ Missing Offline Support
> [!WARNING]
> The `README.md` claims "Offline Support: SQLite (Expo SQLite)" and "Queue transactions when offline". While `expo-sqlite` is listed as a dependency, there is **no implementation** found in the source code for offline sync or transaction queuing.
> **Recommendation**: Verify if this is a planned feature or if the implementation is missing from the current repository.

### 🛠️ Code Consistency
> [!NOTE]
> - `stock_batches.quality_score`: An ENUM exists in the DB but the column uses an INTEGER check. It's recommended to use the ENUM type for better type safety at the DB level.
> - `useTransactions.ts`: The hook file is becoming large. Consider splitting it into `useReceive`, `useIssue`, and `useTransfer` for better modularity.

---

## Conclusion

The codebase is in a very healthy state. The implementation of security best practices and the robust ledger system are major highlights. Addressing the atomicity concerns with Supabase RPCs would take the platform to a production-grade level of reliability.
