# ACMS Gap Analysis Report

**Phase**: 2 — Gap Analysis  
**Date**: 2026-06-08  
**Review Team**: Enterprise Architecture Board  
**Scope**: Identify all missing enterprise documentation beyond the 12 mandatory Build documents

---

## 1. Executive Summary

Beyond the critical deficiencies found in the 12 mandatory Build documents (see REVIEW_REPORT.md), this gap analysis identifies **14 additional enterprise documentation categories** that are entirely absent. For a clinical education management system handling sensitive student and medical data, these gaps represent significant enterprise, operational, security, and compliance risks.

---

## 2. Missing Enterprise Documentation

### 2.1 Architecture Decision Records (ADRs)

**Status**: 🔴 Missing — Empty file exists, should be a directory of numbered ADR documents.

**Required ADRs** (minimum):

| ADR # | Decision | Rationale Needed |
|-------|----------|-----------------|
| ADR-001 | Modular Monolith over Microservices | Why not microservices for a multi-domain system? |
| ADR-002 | Laravel 12 + Next.js 15 Selection | Why this stack over alternatives (NestJS, Django, Spring Boot)? |
| ADR-003 | PostgreSQL 17 over MySQL/MariaDB | Performance, JSON support, row-level security |
| ADR-004 | Shared Schema Multi-tenancy | Why not schema-per-tenant or database-per-tenant? |
| ADR-005 | OAuth2/OIDC over SAML or custom auth | Integration with UMS identity provider |
| ADR-006 | MinIO over Cloud Storage (S3/GCS) | On-premise vs. cloud storage trade-offs |
| ADR-007 | Redis for Queue and Cache | Why single technology for both concerns? |
| ADR-008 | Event-Driven Architecture Pattern | Domain events vs. application events, event bus selection |
| ADR-009 | API Design — REST over GraphQL | Query flexibility vs. simplicity trade-offs |
| ADR-010 | State Machine Library Selection | Workflow engine implementation approach |
| ADR-011 | Rotation Scheduling Algorithm | Constraint satisfaction vs. greedy vs. optimization |
| ADR-012 | Audit Log Storage Strategy | Append-only table vs. event sourcing vs. external service |
| ADR-013 | Frontend State Management (Zustand) | Why Zustand over Redux Toolkit, Jotai, or React Context? |
| ADR-014 | Monorepo vs. Polyrepo | Repository structure decision |
| ADR-015 | SSR vs. SPA vs. Hybrid Rendering | Next.js rendering strategy per page type |

**Impact**: Without ADRs, future developers cannot understand *why* decisions were made, leading to accidental reversals, inconsistency, and architectural drift.

---

### 2.2 Security Architecture Document

**Status**: 🔴 Missing

**Required Sections**:

- Threat model (STRIDE analysis for medical education context)
- Authentication architecture (OAuth2/OIDC flow diagrams, token lifecycle)
- Authorization architecture (RBAC enforcement points, middleware chain)
- Data classification scheme (Public, Internal, Confidential, Restricted)
- Encryption strategy (TLS 1.3 in-transit, AES-256 at-rest, key management)
- Input validation and sanitization standards
- CSRF, XSS, SQL injection protection patterns
- API security (rate limiting, request signing, CORS policy)
- File upload security (type validation, virus scanning, size limits)
- Session management (duration, rotation, concurrent session policy)
- Secrets management (environment variables, vault integration)
- Dependency vulnerability scanning strategy
- Security incident response integration
- Penetration testing schedule

**Impact**: A system managing medical student data and clinical records without a security architecture is a compliance and liability risk.

---

### 2.3 Backup & Disaster Recovery Plan

**Status**: 🔴 Missing

**Required Sections**:

- Recovery Point Objective (RPO) — maximum acceptable data loss
- Recovery Time Objective (RTO) — maximum acceptable downtime
- Backup strategy (PostgreSQL pg_dump/pg_basebackup, WAL archiving)
- Backup frequency and retention schedule
- MinIO/file storage backup
- Redis persistence and backup
- Cross-region replication (if applicable)
- Disaster recovery runbook
- Recovery testing schedule
- Data restoration procedures
- Business continuity plan during academic critical periods (exam weeks, rotation transitions)

**Impact**: Data loss during examination or rotation periods could have severe academic and legal consequences.

---

### 2.4 Infrastructure Architecture Document

**Status**: 🔴 Missing

**Required Sections**:

- Environment definitions (Development, Staging, Production)
- Server architecture (VPS, bare metal, or cloud)
- Network topology and firewall rules
- Load balancing strategy
- SSL/TLS certificate management
- Domain and DNS architecture
- Container orchestration (Docker Compose vs. Kubernetes)
- Database server configuration
- Redis server configuration
- MinIO cluster configuration
- Resource sizing and capacity planning
- Infrastructure-as-Code strategy (Terraform, Ansible, or Docker Compose)

**Impact**: XAMPP is development-only. No production infrastructure design exists.

---

### 2.5 CI/CD Pipeline Strategy

**Status**: 🔴 Missing

**Required Sections**:

- Source control workflow (Git branching strategy — GitFlow, trunk-based, or GitHub Flow)
- CI pipeline definition (build, lint, test, security scan)
- CD pipeline definition (staging deployment, production deployment)
- Environment promotion strategy
- Database migration strategy (zero-downtime migrations)
- Rollback procedures
- Feature flag strategy
- Automated testing gates (unit, integration, e2e)
- Artifact management (Docker images, npm packages)
- Pipeline tooling (GitHub Actions, GitLab CI, Jenkins)

**Impact**: Without CI/CD, manual deployments create human error risk and slow delivery velocity.

---

### 2.6 Monitoring & Observability Strategy

**Status**: 🔴 Missing (Telescope and Sentry mentioned in ARCHITECTURE.md but no strategy)

**Required Sections**:

- Application Performance Monitoring (APM) strategy
- Infrastructure monitoring (CPU, memory, disk, network)
- Database monitoring (slow queries, connection pool, replication lag)
- Log aggregation and centralized logging (ELK, Loki, or CloudWatch)
- Metrics collection (Prometheus, Grafana, or equivalent)
- Alerting rules and escalation policies
- Health check endpoints
- SLA monitoring dashboards
- Error tracking and classification (Sentry configuration)
- Uptime monitoring
- Real User Monitoring (RUM) for frontend
- Queue monitoring (failed jobs, queue depth)

**Impact**: Telescope is development-only and not suitable for production. Sentry captures errors but not performance metrics. No proactive monitoring capability.

---

### 2.7 Data Retention & Archival Policy

**Status**: 🔴 Missing

**Required Sections**:

- Data classification and retention periods per category
- Academic records: Minimum retention per Indonesian education law
- Student assessment data: Lifetime retention requirements
- Audit logs: Immutable, minimum 7-year retention
- Temporary data: Session data, cache expiry policies
- Soft delete vs. hard delete strategy per entity type
- Data archival process (hot → warm → cold storage)
- Data purge procedures and audit trail
- Legal hold capabilities
- GDPR-equivalent (UU PDP) right-to-erasure handling for non-academic data

**Impact**: Medical education records may have lifetime retention requirements. No policy means risk of premature deletion or unbounded storage growth.

---

### 2.8 Privacy & Data Protection Policy (UU PDP Compliance)

**Status**: 🔴 Missing

**Required Sections**:

- Data Protection Impact Assessment (DPIA) framework
- Personal data inventory (what PII is collected, processed, stored)
- Legal basis for processing (consent, legitimate interest, legal obligation)
- Data subject rights implementation (access, rectification, erasure, portability)
- Data Processing Agreement (DPA) template for hospital partners
- Consent management system design
- Data breach notification procedures (72-hour requirement)
- Data Protection Officer (DPO) appointment requirements
- Cross-border data transfer restrictions
- Privacy by Design implementation in architecture
- Cookie and tracking consent (if applicable for web portal)

**Impact**: UU PDP (Law No. 27/2022) is enforceable in Indonesia. Non-compliance carries significant penalties.

---

### 2.9 Testing Strategy Document

**Status**: 🔴 Missing

**Required Sections**:

- Testing pyramid (unit, integration, e2e proportions)
- Backend testing (PHPUnit — unit, feature, database tests)
- Frontend testing (Vitest/Jest — component, hook, integration)
- E2E testing (Playwright or Cypress)
- API contract testing
- Performance/load testing (k6 or JMeter)
- Security testing (OWASP ZAP, dependency scanning)
- Test data management strategy
- Test environment management
- Code coverage requirements and enforcement
- Regression testing strategy
- User Acceptance Testing (UAT) process

**Impact**: No testing strategy means no quality assurance framework, leading to unreliable releases.

---

### 2.10 API Versioning & Deprecation Strategy

**Status**: 🔴 Missing

**Required Sections**:

- API versioning scheme (URI path, header, or query parameter)
- Backward compatibility guarantees
- Deprecation notification process
- Sunset timeline for deprecated endpoints
- Client migration support
- API changelog maintenance

**Impact**: Future multi-program expansion will require API evolution without breaking existing clients.

---

### 2.11 Error Handling & Logging Standards

**Status**: 🔴 Missing

**Required Sections**:

- Error code taxonomy (domain errors, validation errors, system errors)
- Error response format (RFC 7807 Problem Details)
- Logging levels and usage guidelines
- Structured logging format (JSON)
- Correlation ID / trace ID propagation
- Sensitive data redaction in logs
- Error monitoring integration (Sentry)

**Impact**: Inconsistent error handling leads to poor developer experience and difficult debugging.

---

### 2.12 Migration & Seeding Strategy

**Status**: 🔴 Missing

**Required Sections**:

- Database migration conventions (Laravel migrations)
- Seed data strategy (reference data vs. test data)
- Zero-downtime migration patterns
- Data migration from legacy systems (if any)
- Rollback procedures for failed migrations
- Migration testing in CI pipeline

**Impact**: Without migration strategy, database changes become risky and irreversible.

---

### 2.13 Internationalization (i18n) Strategy

**Status**: 🔴 Missing

**Required Sections**:

- Supported locales (id-ID primary, en-US secondary)
- Translation management approach
- Frontend i18n (next-intl or similar)
- Backend i18n (Laravel localization)
- Date/time formatting (WIB/WITA/WIT timezone handling)
- Currency formatting (IDR)
- Number formatting
- RTL support requirements (future expansion consideration)

**Impact**: UI in English but user base is Indonesian. Medical terms require careful bilingual handling.

---

### 2.14 Notification & Communication Architecture

**Status**: 🟡 Partial — Listed as a domain in the phase plan but no specification exists.

**Required Sections**:

- Notification channels (email, SMS, push, in-app)
- Notification templates and personalization
- Delivery retry and failure handling
- User notification preferences
- Batch notification strategy (daily digest)
- Real-time notification architecture (WebSocket, SSE, or polling)
- Email service provider selection (SMTP, SendGrid, Mailgun)
- SMS provider for Indonesia (Twilio, local provider)
- Notification audit trail

**Impact**: Clinical rotation notifications are time-critical. Missed notifications can disrupt academic schedules.

---

## 3. Gap Priority Matrix

| Priority | Gap | Risk Level | Required For |
|----------|-----|------------|--------------|
| P0 | Security Architecture | 🔴 Critical | Phase 3, Phase 7 |
| P0 | Privacy & Data Protection (UU PDP) | 🔴 Critical | Phase 3, Phase 7 |
| P0 | Backup & Disaster Recovery | 🔴 Critical | Phase 4 |
| P0 | ADRs (Architecture Decision Records) | 🔴 Critical | Phase 4 |
| P1 | Infrastructure Architecture | 🟡 Major | Phase 5 |
| P1 | CI/CD Pipeline Strategy | 🟡 Major | Phase 5 |
| P1 | Testing Strategy | 🟡 Major | Phase 5 |
| P1 | Monitoring & Observability | 🟡 Major | Phase 5 |
| P1 | Data Retention & Archival | 🟡 Major | Phase 3 |
| P2 | Error Handling & Logging Standards | 🟠 Moderate | Phase 3 |
| P2 | Migration & Seeding Strategy | 🟠 Moderate | Phase 5 |
| P2 | API Versioning & Deprecation | 🟠 Moderate | Phase 3 |
| P2 | Notification Architecture | 🟠 Moderate | Phase 3 |
| P3 | i18n Strategy | 🟢 Low | Phase 5 |

---

## 4. Recommendations

### Immediate Actions (Block Phase 3)
1. **Create ADR directory** with template and begin documenting critical decisions
2. **Write Security Architecture** as a top-level Build document
3. **Write UU PDP Compliance Specification** addressing Indonesian data protection law
4. **Write Backup & DR Plan** before any data is persisted

### Phase 3 Integration
The following gaps should be addressed as sections within existing mandatory documents:
- Error Handling → CODING_STANDARDS.md
- Migration Strategy → DATABASE_SCHEMA.md
- API Versioning → API_SPECIFICATION.md
- Notification Architecture → ARCHITECTURE.md (as a module specification)
- i18n Strategy → CODING_STANDARDS.md
- Testing Strategy → CODING_STANDARDS.md

### New Standalone Documents Required
The following gaps warrant dedicated Build documents:
- `Build/SECURITY_ARCHITECTURE.md`
- `Build/INFRASTRUCTURE.md`
- `Build/BACKUP_DR.md`
- `Build/CICD_STRATEGY.md`
- `Build/MONITORING.md`
- `Build/DATA_RETENTION.md`
- `Build/TESTING_STRATEGY.md`
- `Build/PRIVACY_COMPLIANCE.md`
- `Build/ADRs/` (directory with numbered ADR files)

---

## 5. Total Documentation Inventory (Post-Gap Analysis)

| # | Document | Status | Category |
|---|----------|--------|----------|
| 1 | README.md | 🔴 Empty → Rewrite | Mandatory |
| 2 | PRD.md | 🟡 Skeletal → Rewrite | Mandatory |
| 3 | ARCHITECTURE.md | 🟡 Skeletal → Rewrite | Mandatory |
| 4 | DATABASE_SCHEMA.md | 🔴 Empty → Write | Mandatory |
| 5 | API_SPECIFICATION.md | 🔴 Empty → Write | Mandatory |
| 6 | CODING_STANDARDS.md | 🔴 Empty → Write | Mandatory |
| 7 | CONVENTIONAL_COMMITS.md | 🔴 Empty → Write | Mandatory |
| 8 | RBAC_MATRIX.md | 🔴 Empty → Write | Mandatory |
| 9 | WORKFLOW_ENGINE.md | 🔴 Empty → Write | Mandatory |
| 10 | ROTATION_ENGINE.md | 🔴 Empty → Write | Mandatory |
| 11 | AUDIT_TRAIL_SPEC.md | 🔴 Empty → Write | Mandatory |
| 12 | ANALYTICS_SPEC.md | 🔴 Empty → Write | Mandatory |
| 13 | REVIEW_REPORT.md | ✅ Complete | Phase 1 Output |
| 14 | GAP_ANALYSIS.md | ✅ Complete | Phase 2 Output |
| 15 | SECURITY_ARCHITECTURE.md | 🔴 New → Write | Gap-identified |
| 16 | INFRASTRUCTURE.md | 🔴 New → Write | Gap-identified |
| 17 | BACKUP_DR.md | 🔴 New → Write | Gap-identified |
| 18 | CICD_STRATEGY.md | 🔴 New → Write | Gap-identified |
| 19 | MONITORING.md | 🔴 New → Write | Gap-identified |
| 20 | DATA_RETENTION.md | 🔴 New → Write | Gap-identified |
| 21 | TESTING_STRATEGY.md | 🔴 New → Write | Gap-identified |
| 22 | PRIVACY_COMPLIANCE.md | 🔴 New → Write | Gap-identified |
| 23 | ADRs/ (directory) | 🔴 New → Write | Gap-identified |

**Total documents requiring creation or major rewrite: 21**
