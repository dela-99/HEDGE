# Copilot AI Agent Customization — Team Onboarding

Welcome to production-grade engineering with AI-assisted development. This guide explains how to work with your customized Copilot environment.

---

## What Was Customized?

Your Copilot is now configured with **production engineering standards** aligned with top tech companies (Google, Apple, Tesla, xAI).

**Files created in `.github/`:**

1. `copilot-instructions.md` — Foundation for all conversations
2. `agents/architect.agent.md` — System design & architecture
3. `agents/security-reviewer.agent.md` — Security & threat modeling
4. `agents/performance-engineer.agent.md` — Performance & scalability
5. `CUSTOMIZATIONS.md` — Overview of all customizations
6. `ENGINEERING_STANDARDS.md` — Quick reference card

---

## How to Use in Your Daily Work

### Standard Development Conversation

```
You: "I need to add a notification system"
Copilot: (thinks through copilot-instructions.md framework)
         "Before we build, let's design this properly."

You: "What's the architecture?"
Copilot: "Let me analyze this systematically..."
         (can invoke /architect for deep dive)

You: "I'm ready to code"
Copilot: "Here's the plan, security review, performance considerations..."
         (generates production-grade code)
```

### Using Custom Agents

**For system design questions:**

```
/architect

"We're building a real-time chat system for 1M users.
What's the architecture?"
```

**For security questions:**

```
/security-reviewer

"Our API handles payment data. What are the security
requirements?"
```

**For performance questions:**

```
/performance-engineer

"This database query is slow. How do we optimize?"
```

---

## Key Principles to Remember

### 1. Think Before Coding

- Define the problem clearly
- Understand constraints (scale, latency, budget)
- Explore architectural options
- Identify risks upfront

### 2. Production Is the Goal

- Every line of code should be deployable
- No demos or "good enough" solutions
- Handle errors and edge cases
- Include logging and monitoring

### 3. Security from the Start

- Threat model before implementation
- Validate all inputs
- Encrypt sensitive data
- Never hardcode credentials
- Use least-privilege access

### 4. Performance & Scale Awareness

- Identify bottlenecks early
- Design multi-layer caching
- Assume millions of users
- Load test before launch

### 5. Simple > Complex

- Default to boring, proven solutions
- Introduce complexity only when justified
- Optimize for long-term maintainability
- Document trade-offs

---

## Example Workflows

### Scenario 1: Building a New API

```
1. Ask Copilot: "Design an API for user authentication"
   → copilot-instructions.md guides thinking

2. Ask /architect: "What's the architecture?"
   → Get auth flow, database design, scaling plan

3. Ask /security-reviewer: "What security do we need?"
   → Get threat model, auth spec, data protection plan

4. Ask /performance-engineer: "What's the load envelope?"
   → Get performance targets, caching strategy

5. Now code with confidence: Have Copilot generate implementation
   → Production-grade code with error handling, logging, security
```

### Scenario 2: Optimizing a Slow Feature

```
1. Ask Copilot: "This endpoint is slow. How do we fix it?"
   → copilot-instructions.md suggests measurement first

2. Ask /performance-engineer: "Analyze this bottleneck"
   → Get bottleneck identification, optimization priorities

3. Measure current performance (get baseline)

4. Implement optimization (caching, query optimization, async)

5. Load test to validate improvement

6. Monitor in production
```

### Scenario 3: New Security Feature

```
1. Ask Copilot: "How do we implement MFA?"
   → copilot-instructions.md emphasizes secure-by-design

2. Ask /security-reviewer: "Design MFA for our system"
   → Get threat model, implementation spec, compliance notes

3. Have Copilot generate secure implementation
   → Proper secret storage, proper token generation, audit logging

4. Security review before shipping
```

---

## Communication Within Team

### When Discussing Architecture

**Use this pattern:**

```
"We chose [Option A] because:
- [Technical reason]
- [Business reason]
- Trade-off: we prioritized [X] over [Y]
- Scaling bottleneck at [X]: mitigation is [Y]"
```

### When Reviewing Code

**Ask these questions:**

- Will this work in production?
- Will this scale? (What are the bottlenecks?)
- Is it secure? (How is data protected?)
- Is it maintainable? (Can someone else understand it?)
- Does it solve the real problem?
- Is there a simpler solution?

### When Planning Features

**Start with:**

1. Business goal (what problem are we solving?)
2. Technical constraints (scale, latency, budget)
3. Architecture proposal (with trade-offs)
4. Security review (threat model, compliance)
5. Performance targets (load envelope, SLAs)

---

## Common Patterns

### 1. The "Pre-Implementation Review"

```
Before writing code:
1. Describe the problem to Copilot
2. Ask /architect for architecture options
3. Ask /security-reviewer for threat model
4. Ask /performance-engineer for scaling plan
5. Discuss trade-offs with team
6. Get approval before coding
```

### 2. The "Production Readiness Checklist"

```
Before shipping:
□ Code reviewed for security
□ Error handling complete
□ Logging in place
□ Performance load tested
□ Monitoring/alerts configured
□ Database migrations tested
□ Deployment runbook written
□ Team trained on failure scenarios
```

### 3. The "Architecture Decision Record"

```
Create a doc describing:
- What problem are we solving?
- What options did we consider?
- What did we choose and why?
- What are the trade-offs?
- When will we revisit this decision?
```

---

## Team Standards

### Code Review Checklist

- [ ] Solves the real problem (not a symptom)
- [ ] Handles errors and edge cases
- [ ] Includes input validation
- [ ] No hardcoded credentials or secrets
- [ ] Includes meaningful logging
- [ ] Has appropriate error messages
- [ ] No N+1 queries or obvious performance issues
- [ ] Security: auth, data protection, rate limiting where needed
- [ ] Documentation: comments on non-obvious logic
- [ ] Tests: at least unit tests for critical paths

### Architecture Review Checklist

- [ ] Clear problem statement and constraints
- [ ] Scaling bottlenecks identified
- [ ] Failure scenarios considered (with mitigations)
- [ ] Security threats modeled
- [ ] Trade-offs documented
- [ ] Tech choices justified (not just "it's popular")
- [ ] MVP path clear
- [ ] Monitoring/alerting strategy defined

### Security Review Checklist

- [ ] Threat model completed
- [ ] Attack surfaces identified
- [ ] Authentication strategy documented
- [ ] Authorization (who can do what?) clear
- [ ] Data classification (what is sensitive?)
- [ ] Encryption at rest and in transit
- [ ] Secrets management (vault, KMS, not hardcoded)
- [ ] Input validation at all boundaries
- [ ] Rate limiting on APIs
- [ ] Audit logging for sensitive operations

---

## FAQ

**Q: Should I always use the agents?**
A: Use agents for major decisions (architecture, security, performance). For routine coding, the base `copilot-instructions.md` guides you.

**Q: How do I know when to use `/architect` vs. just asking Copilot?**
A: Use `/architect` when making technology decisions, designing systems, or planning for scale. Use regular chat for implementation and code generation.

**Q: What if an agent suggests something I disagree with?**
A: Question it! Agents provide analysis and recommendations, but you own final decisions. Document the reasoning.

**Q: Can I customize these instructions further?**
A: Yes! Edit the files in `.github/` to reflect your team's specific practices, tech stack, and standards.

**Q: Do these customizations apply to all projects?**
A: Yes, they're in `.github/`, so they apply to this workspace. For personal customizations (across projects), see `{{VSCODE_USER_PROMPTS_FOLDER}}/`.

---

## Next Steps

1. **Commit these customizations:**

   ```bash
   git add .github/
   git commit -m "Add production engineering standards & custom agents

   - Foundation instructions for all conversations (copilot-instructions.md)
   - Custom agents: /architect, /security-reviewer, /performance-engineer
   - Quick reference guide (ENGINEERING_STANDARDS.md)
   - Team onboarding documentation"
   ```

2. **Share with team:** Link them to this file and `ENGINEERING_STANDARDS.md`.

3. **Start using in your workflow:**
   - Ask open questions (instructions guide thinking)
   - Invoke agents for specialized work
   - Reference the quick reference guide

4. **Evolve over time:** As you discover patterns, update instructions to capture team knowledge.

---

## Support & Questions

**For questions about:**

- **Architecture**: Ask `/architect` or see `CUSTOMIZATIONS.md`
- **Security**: Ask `/security-reviewer` or see `ENGINEERING_STANDARDS.md`
- **Performance**: Ask `/performance-engineer` or see the quick reference
- **General standards**: See `copilot-instructions.md` or `ENGINEERING_STANDARDS.md`

---

## Philosophy

These customizations embody one core belief:

**Build world-class software that solves real problems at scale.**

Not demos. Not theoretical solutions. Production-grade systems capable of serving millions of users reliably, securely, and efficiently.

Think like a principal engineer. Act like a CTO. Ship like a startup founder.

Welcome to production engineering.
