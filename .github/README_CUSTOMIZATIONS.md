# Copilot Customizations — Visual Guide

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Your Copilot Conversations                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────┐
        │  copilot-instructions.md (FOUNDATION)       │
        │  • Production-grade standards               │
        │  • Deep thinking before coding              │
        │  • Security from the start                  │
        │  • Performance awareness                    │
        │  • Scalability mindset                      │
        │  Applied to ALL conversations               │
        └─────────────────────────────────────────────┘
                        ↓        ↓        ↓        ↓
        ┌───────────┬──────────┬────────┬────────┐
        ↓           ↓          ↓        ↓        ↓
    Regular      /architect  /security /perf    Other
    Coding    (System Design) (Security)(Scale)  Tasks
      ↓           ↓           ↓        ↓
    Code gen   Architecture  Threats  Caching
    Debugging  Scaling       Vulns    Optimize
    Refactor   Failures      Auth     Bottlenecks
```

---

## Three Custom Agents

### 1️⃣ `/architect` — System Design & Architecture

**Use when:**

- Designing new systems
- Making technology choices
- Planning microservices vs. monolith
- Analyzing scaling bottlenecks
- Creating architecture documentation

**Example questions:**

```
"Design a real-time notification system for 10M users"
"Should we use PostgreSQL or DynamoDB?"
"What happens when our database fails?"
"Where are the scaling bottlenecks at 100x scale?"
```

**Output:**

```
✓ Architecture diagram (text)
✓ Components & responsibilities
✓ Scaling bottleneck analysis
✓ Failure scenarios & mitigations
✓ Technology recommendations
✓ Trade-off analysis
✓ MVP path & evolution strategy
```

---

### 2️⃣ `/security-reviewer` — Security & Threat Modeling

**Use when:**

- Designing authentication/authorization
- Planning data security
- Reviewing APIs for vulnerabilities
- Meeting compliance requirements (GDPR, HIPAA, PCI-DSS)
- Threat modeling before implementation
- Assessing security risks

**Example questions:**

```
"How do we authenticate users securely?"
"What are the attack surfaces in our API?"
"Design GDPR-compliant data handling"
"What are the security risks in this architecture?"
```

**Output:**

```
✓ Threat model & attack surfaces
✓ Vulnerability assessment
✓ Authentication & authorization strategy
✓ Data protection & encryption plan
✓ Secrets management approach
✓ Compliance mapping (GDPR, HIPAA, etc.)
✓ Security checklist
✓ Incident response considerations
```

---

### 3️⃣ `/performance-engineer` — Performance & Scalability

**Use when:**

- Optimizing latency or throughput
- Designing caching strategies
- Planning database optimization
- Load testing & capacity planning
- Analyzing bottlenecks
- Planning for growth

**Example questions:**

```
"This endpoint is slow. How do we fix it?"
"Design a caching strategy for our API"
"Load test plan for 10K requests/second?"
"Where are the bottlenecks at scale?"
```

**Output:**

```
✓ Performance profile & bottleneck analysis
✓ Load envelope (current, 6mo, 1yr projections)
✓ Optimization priorities (quick wins, medium, long-term)
✓ Caching strategy (L1/L2/L3)
✓ Query optimization recommendations
✓ Load test plan
✓ Scaling roadmap (horizontal, vertical, sharding)
✓ Monitoring & alerting strategy
```

---

## Workflow Examples

### Example 1: Building a New API

```
Step 1: Ask Copilot the problem
→ "Build an API for user authentication"

Step 2: Use /architect
→ "Design the architecture"
← Get: auth flow, database schema, scaling plan

Step 3: Use /security-reviewer
→ "What are the security requirements?"
← Get: threat model, auth spec, password policy, compliance

Step 4: Use /performance-engineer
→ "What are the performance targets?"
← Get: latency SLAs, load envelope, caching strategy

Step 5: Implement with Copilot
→ Production-grade code with error handling & logging

Step 6: Review & ship
→ Security review + load test + monitoring setup
```

### Example 2: Optimizing a Slow Feature

```
Step 1: Baseline measurement
→ Run load test, capture current latency

Step 2: Use /performance-engineer
→ "Analyze this bottleneck"
← Get: root cause analysis, optimization options

Step 3: Implement optimization
→ Caching, query optimization, or async processing

Step 4: Load test again
→ Verify improvement, measure P95 latency

Step 5: Deploy & monitor
→ Watch metrics in production
```

### Example 3: Security Review

```
Step 1: Ask Copilot
→ "Review this authentication system"

Step 2: Use /security-reviewer
→ "Threat model for our auth"
← Get: attack surfaces, vulnerabilities, mitigations

Step 3: Implement recommendations
→ MFA, session management, rate limiting

Step 4: Compliance check
→ Is it GDPR-compliant? PCI-DSS ready?

Step 5: Penetration test (before launch)
→ Validate security in production-like environment
```

---

## Quick Decision Matrix

| Need                      | Copilot Approach   | Custom Agent            | Output                         |
| ------------------------- | ------------------ | ----------------------- | ------------------------------ |
| **General coding**        | Ask questions      | —                       | Code, explanations             |
| **System design**         | "Design X"         | `/architect`            | Architecture, scaling          |
| **Technology choice**     | "Should we use X?" | `/architect`            | Recommendation, trade-offs     |
| **Authentication design** | "How to auth?"     | `/security-reviewer`    | Auth spec, threat model        |
| **Security review**       | "Is this secure?"  | `/security-reviewer`    | Vulnerabilities, mitigations   |
| **API optimization**      | "Slow endpoint"    | `/performance-engineer` | Bottleneck, optimization plan  |
| **Capacity planning**     | "Scale to 10x?"    | `/performance-engineer` | Load envelope, roadmap         |
| **Failure handling**      | "What if X fails?" | `/architect`            | Failure scenarios, mitigations |

---

## The Decision Tree

```
┌─ What's your question?
│
├─ "How do I code/implement this?"
│  └─ Use regular Copilot chat
│     (copilot-instructions.md guides thinking)
│
├─ "What's the architecture/design?"
│  └─ Use /architect
│     (system design, technology choices, scaling)
│
├─ "Is this secure? What are the risks?"
│  └─ Use /security-reviewer
│     (threat modeling, vulnerabilities, compliance)
│
├─ "How do we optimize/scale this?"
│  └─ Use /performance-engineer
│     (bottleneck analysis, caching, load testing)
│
└─ "How do I approach this problem?"
   └─ Ask Copilot first (instructions guide)
      Then use relevant agent if needed
```

---

## Key Principles

### 1. Think Before Coding

```
Problem → Design → Risks → Code
         (arch)  (security, perf)
```

### 2. Use the Right Tool

```
Strategy/Design      → /architect
Security/Threats     → /security-reviewer
Performance/Scale    → /performance-engineer
Implementation       → Regular Copilot
```

### 3. Production Is the Goal

```
Feature → Design → Code → Test → Monitor → Ship
       (arch)    (prod-grade) (perf)   (alerts)
```

### 4. Always Ask the Six Questions

```
✓ Will this work in production?
✓ Will this scale?
✓ Is it secure?
✓ Is it maintainable?
✓ Does it solve the real problem?
✓ Is there a simpler solution?
```

---

## File Organization

```
.github/
├── copilot-instructions.md        ← Foundation (all conversations)
├── agents/
│   ├── architect.agent.md         ← /architect (system design)
│   ├── security-reviewer.agent.md ← /security-reviewer (security)
│   └── performance-engineer.agent.md ← /performance-engineer (perf)
├── CUSTOMIZATIONS.md              ← Overview
├── ENGINEERING_STANDARDS.md       ← Quick reference
├── TEAM_ONBOARDING.md             ← Team guide
└── README.md                       ← This file
```

---

## Communication Patterns

### In Design Docs

```
**Architecture**: [Diagram]
**Scaling**: Bottleneck at [X], handled by [Y]
**Security**: [Threats] mitigated by [Controls]
**Performance**: P95 latency [target], achieved via [strategy]
```

### In Code Review

```
"Does this work in production? Scale? Secure? Maintainable?
Solves the real problem? Simpler solution?"
```

### In Team Discussions

```
"We chose [Option A] because [reasoning].
Trade-off: we prioritized [X] over [Y].
Revisit if [condition]."
```

---

## Success Metrics

You're using the customizations effectively when:

✅ Code reviews focus on production-readiness (not just syntax)
✅ Architecture decisions are documented with trade-offs
✅ Security is considered from the start (not an afterthought)
✅ Performance is optimized based on data (not guesses)
✅ Team asks "will this scale?" before building
✅ Failures are handled gracefully
✅ Monitoring & alerting are planned upfront
✅ Code is maintainable and understandable

---

## Next Steps

1. **Bookmark this file** → Quick visual reference
2. **Read ENGINEERING_STANDARDS.md** → Quick reference card
3. **Try an agent** → Ask `/architect`, `/security-reviewer`, or `/performance-engineer`
4. **Share with team** → Link to TEAM_ONBOARDING.md
5. **Commit to repo** → `git add .github && git commit -m "Add customizations"`
6. **Iterate** → Refine instructions as team learns

---

## The Goal

Build **world-class software** capable of operating at **global scale**, with:

- ✅ Production-grade code
- ✅ Security from the start
- ✅ Performance & scalability built-in
- ✅ Resilience & failure handling
- ✅ Deep architectural thinking
- ✅ Maintainability for years

Think like a **principal engineer**. Act like a **CTO**. Ship like a **founder**.
