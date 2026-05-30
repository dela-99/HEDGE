# Production Engineering Standards — Quick Reference

## Core Mindset

Think like a **principal engineer, CTO, or technical co-founder**. Solve real-world problems at scale. Production-grade code only.

---

## Pre-Implementation Checklist

Before writing code, ask yourself:

- [ ] **What is the real problem?** (Not the symptom, the actual problem)
- [ ] **What are the business goals?** (User growth, retention, revenue, speed?)
- [ ] **What are the technical constraints?** (Scale, latency, data volume, team size?)
- [ ] **What's the simplest architecture?** (No premature complexity)
- [ ] **What could break?** (Failures, security, performance cliffs?)
- [ ] **Is it secure?** (Auth, data protection, secrets, validation?)
- [ ] **Will it scale?** (Bottlenecks at 1x, 10x, 100x?)
- [ ] **Is there a simpler solution?** (Always ask)

---

## The Three Custom Agents

### 🏗️ `/architect` — System Design

**When**: Designing systems, APIs, databases, microservices, technology choices.

**Output**: Architecture diagrams, components, scaling bottlenecks, failure scenarios, trade-offs, tech recommendations, MVP path.

**Questions to ask**:

- What's the simplest architecture?
- Where are the scaling bottlenecks?
- What happens when services fail?
- Monolith or microservices?
- What tech stack (database, cache, queue)?

---

### 🔒 `/security-reviewer` — Security & Threat Modeling

**When**: Authentication, authorization, APIs, data security, compliance, threat modeling.

**Output**: Threat model, attack surfaces, vulnerabilities, auth strategy, data protection, security checklist, compliance mapping.

**Questions to ask**:

- What are the attack surfaces?
- How do we authenticate users?
- Where is sensitive data? How is it protected?
- What could an attacker do?
- Are we GDPR/HIPAA/PCI-DSS compliant?

---

### ⚡ `/performance-engineer` — Performance & Scalability

**When**: Optimizing latency, throughput, capacity planning, caching, load testing, infrastructure scaling.

**Output**: Performance profile, bottleneck analysis, optimization priorities, caching strategy, load test plan, scaling roadmap.

**Questions to ask**:

- What are the performance bottlenecks?
- What's our caching strategy (L1, L2, L3)?
- How do we scale to 10x users?
- What's the load envelope (current, 6mo, 1yr)?
- What latency/throughput targets must we hit?

---

## Code Quality Standards

### Structure

- Modular, reusable components
- Single responsibility principle
- Clear separation of concerns (business, infra, UI)
- Dependency injection where appropriate
- Configuration externalized (no hardcoded values)

### Error Handling

- Handle all error paths; no silent failures
- Meaningful logging (not just stack traces)
- Clear error messages for debugging
- Graceful degradation where possible

### Security

- Validate all inputs at all boundaries
- No hardcoded credentials (use secrets vault)
- Encrypt sensitive data in transit (TLS 1.3) and at rest (AES-256)
- Parameterized queries (prevent SQL injection)
- CSRF tokens on state-changing requests
- Rate limiting on APIs

### Performance

- Query optimization (indexes, avoid N+1)
- Multi-layer caching (app, Redis, CDN)
- Asynchronous processing for slow operations
- Connection pooling and reuse
- Profiling before optimization

---

## Architecture Decision Template

When proposing an architecture, document:

```
## Problem
[What are we solving?]

## Constraints
[Scale, latency, team size, budget?]

## Options Considered
A. [Monolith vs. Microservices]
B. [PostgreSQL vs. DynamoDB]
C. [Synchronous vs. Async]

## Recommendation
**Option A** because:
- [Reason 1]
- [Reason 2]
- [Trade-off: we're choosing X over Y]

## Scaling Bottleneck
At [10x scale], bottleneck is [database writes].
Mitigation: [Sharding, read replicas, caching]

## Security Review
- Attack surface: [List]
- Mitigation: [Auth, encryption, validation]

## Monitoring & Alerts
- Metric: [Latency]
- Alert: > [threshold] for [duration]
```

---

## Security Checklist

Before shipping any code:

- [ ] No hardcoded credentials
- [ ] Passwords hashed with bcrypt/Argon2
- [ ] TLS 1.3 for all network traffic
- [ ] Input validation on all APIs
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting enabled
- [ ] Secrets rotated regularly
- [ ] Audit logging for sensitive operations
- [ ] MFA for admin/privileged accounts
- [ ] Dependencies scanned for CVEs
- [ ] Penetration testing scheduled

---

## Performance Optimization Hierarchy

1. **Measure first** — Benchmark, profile, trace. Don't guess.
2. **Address the bottleneck** — Optimize the slowest component first.
3. **Cache strategically** — Multi-layer: app, Redis, CDN, database.
4. **Design for scale** — Stateless servers, horizontal scaling, sharding.
5. **Monitor continuously** — Alert when latency/throughput deviate.

---

## Scaling Checklist

As you approach limits:

- [ ] Single database → Read replicas
- [ ] Read replicas → Sharding
- [ ] Vertical scaling → Horizontal scaling
- [ ] Synchronous → Asynchronous/queues
- [ ] Monolith → Microservices (only if justified)
- [ ] Single region → Multi-region
- [ ] DNS → Service mesh
- [ ] Manual ops → Infrastructure as code + automation

---

## The Quality Gate Questions

**Before considering code complete, ask:**

✅ **Will this work in production?** (Can it handle edge cases, failures, scale?)
✅ **Will this scale?** (What are the bottlenecks? How many users/requests?)
✅ **Is it secure?** (Validation, auth, secrets, attack surface?)
✅ **Is it maintainable?** (Can the next engineer understand it?)
✅ **Does it solve the real problem?** (Or am I solving a symptom?)
✅ **Is there a simpler solution?** (Complexity should be justified)

If you can't answer "yes" to all six, iterate before shipping.

---

## Communication Pattern

**For stakeholders**: "This solves [problem] by [approach], handles [scale], with [trade-offs]."

**For engineers**: "Bottleneck is [component]. We mitigate with [solution]. Trade-offs: [list]."

**For architecture review**: "This design scales to [10x], fails gracefully via [mechanism], and protects data via [security]."

---

## Remember

- **Simple beats clever** (your future self will thank you)
- **Production is the goal** (not passing a demo)
- **Failures are features** (design for resilience)
- **Security is not optional** (threat model from day one)
- **Performance is architectural** (not just code optimization)
- **Scalability is inevitable** (design for it upfront)
