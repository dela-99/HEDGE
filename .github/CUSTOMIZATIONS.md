# Agent Customizations Overview

This workspace is configured with production-grade engineering standards aligned with top tech companies (Google, Apple, Tesla, xAI).

## Files Created

### 1. `.github/copilot-instructions.md`

**Foundation customization** — Applies to all Copilot assistance in this project.

Sets expectations for:

- Production-ready code (not demos)
- Deep pre-implementation thinking
- Security, performance, and scalability from the start
- Architectural rigor and trade-off analysis
- Code quality and maintainability standards

**When to reference**: Every engineering conversation.

---

### 2. `.github/agents/architect.agent.md`

**Custom agent for system design** — Deep architectural review.

Use `/architect` when:

- Designing new systems, APIs, or databases
- Making technology choices (database, cache, message queue)
- Planning microservices vs. monolith decisions
- Analyzing scaling bottlenecks and failure scenarios
- Creating architecture diagrams and documentation

**Output**: Architecture overview, components, scaling analysis, failure mitigations, trade-offs, tech recommendations, MVP path.

---

### 3. `.github/agents/security-reviewer.agent.md`

**Custom agent for security** — Threat modeling and security architecture.

Use `/security-reviewer` when:

- Designing authentication or authorization systems
- Planning data security and encryption strategies
- Reviewing APIs for attack surfaces
- Implementing compliance requirements (GDPR, HIPAA, PCI-DSS)
- Threat modeling before implementation
- Assessing vulnerabilities

**Output**: Threat model, attack surfaces, vulnerability matrix, authentication strategy, data protection plan, security checklist, compliance mapping.

---

### 4. `.github/agents/performance-engineer.agent.md`

**Custom agent for performance** — Bottleneck analysis and optimization.

Use `/performance-engineer` when:

- Optimizing latency or throughput
- Designing caching strategies (L1, L2, L3)
- Planning database query optimization
- Load testing and capacity planning
- Analyzing infrastructure bottlenecks
- Scaling strategies for growth

**Output**: Performance profile, bottleneck analysis, optimization priorities, caching strategy, load test plan, scaling roadmap.

---

## How to Use

### In Chat

1. **Start with foundational thinking**: The `copilot-instructions.md` guides all conversations automatically.

2. **Invoke custom agents for specialized work**:
   - Type `/architect` for system design questions
   - Type `/security-reviewer` for security reviews
   - Type `/performance-engineer` for performance optimization

3. **Example conversation flow**:

   ```
   You: "We need to build a real-time notification system for millions of users"

   Copilot applies copilot-instructions.md → thinks about real-world constraints

   You: "What's the architecture?"
   Copilot: "Let me ask..." (invokes /architect internally if relevant)

   You: "How do we secure user data?"
   Copilot: "Use /security-reviewer for a deep dive on this"
   ```

### Best Practices

1. **Ask before coding**: Use agents to think through architecture, security, and performance **before** writing code.

2. **Document trade-offs**: When agents present options, ensure the final decision is documented (why we chose option A over B).

3. **Iterate on design**: If an agent identifies risks, explore alternatives before committing to implementation.

4. **Validate at scale**: Before shipping, use performance agent to load test at 2-5x peak capacity.

5. **Review security**: Have security-reviewer evaluate any authentication, API, or data-handling code.

---

## Customization Principles

These configurations encode:

- **Real-world impact**: Solve actual problems, not theoretical ones
- **Production-grade quality**: Every line should be deployable
- **Architectural rigor**: Design for scale, resilience, security
- **Deep thinking before coding**: Identify risks and trade-offs upfront
- **Maintainability**: Code that evolves gracefully over years
- **Security from the start**: No hardcoded credentials, validation at all boundaries
- **Performance awareness**: Bottleneck identification, caching strategies, load testing

---

## Next Steps

1. **Commit these files**:

   ```
   git add .github/
   git commit -m "Add production engineering standards & custom agents"
   ```

2. **Share with team**: Document these standards in your team onboarding.

3. **Use in your workflow**:
   - Ask Copilot open questions (copilot-instructions guides)
   - Invoke agents for deep dives (`/architect`, `/security-reviewer`, `/performance-engineer`)
   - Iterate on designs before implementation

4. **Evolve over time**: As you discover patterns, refine these instructions to encode team knowledge.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│   copilot-instructions.md                           │
│   (Foundation: All conversations)                   │
└─────────────────────────────────────────────────────┘
           ↓
    ┌──────┴──────┬──────────────┬────────────────┐
    ↓             ↓              ↓                ↓
 General       System          Security      Performance
 Coding       Design           Review        Analysis
   (base)   (/architect)  (/security-       (/performance-
           · Scaling     reviewer)          engineer)
           · Architecture · Threats         · Caching
           · Tech choice  · Vuln            · Bottleneck
           · Failures     · Compliance      · Scaling
```

---

## Reference: Core Principles

**Before implementing anything, ask:**

- ✅ Will this work in production?
- ✅ Will this scale?
- ✅ Is it secure?
- ✅ Is it maintainable?
- ✅ Does it solve the real problem?
- ✅ Is there a simpler solution?

**Think like:** Principal engineer, CTO, technical co-founder, architect

**Design for:** Millions of users, global scale, failures, evolution

**Optimize for:** Long-term impact, maintainability, security, performance, reliability
