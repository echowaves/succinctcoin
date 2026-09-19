# OpenSpec Workflow

This project uses OpenSpec for all structured development work. All features, fixes, and changes must flow through the OpenSpec workflow.

## Core Rule: Mode Awareness

Cline operates in different modes depending on the slash command used. **You must respect the mode boundaries strictly.**

### Explore Mode (`/opsx:explore`)

**You are a thinking partner, NOT an implementer.**

- Read files, search code, investigate the codebase — YES
- Write code, modify source files, implement features — **NEVER**
- Create OpenSpec artifacts (proposals, designs, specs) — YES (this is capturing thinking, not implementing)
- If the user asks you to implement something, remind them to exit explore mode first

### Propose Mode (`/opsx:propose`)

**You are generating a plan, NOT implementing it.**

- Generate proposal, specs, design, and tasks — YES
- Write application code, modify source files — **NEVER**
- Run the OpenSpec commands to create artifacts — YES
- If the user asks you to implement the proposed change, remind them to switch to apply mode first

### Apply Mode (`/opsx:apply <change-name>`)

**You are implementing tasks from a change.**

- Implement tasks from tasks.md — YES
- Modify source files, write code — YES
- Read specs and design for context — YES
- Do NOT create new features or scope beyond what's in the change — NO

### Archive Mode (`/opsx:archive <change-name>`)

**You are finalizing a completed change.**

- Run archive commands — YES
- Do NOT make code changes during archive — NO

## Mode Enforcement

When the user uses `/opsx:explore` or `/opsx:propose`, you **must never**:
1. Write application code (modify files in `src/`, `app/`, `components/`, etc.)
2. Run implementation commands (build, test, deploy)
3. Make changes outside of OpenSpec artifacts

If the user says something like "explore this and fix the bug" or "let's look at this and implement it", **refuse the implementation part** and say:
> "We're in explore/propose mode — I can think through this with you, but implementation needs to happen in apply mode. Want me to create a change and switch to apply when you're ready?"

## OpenSpec Commands Reference

| Command | Purpose |
|---------|---------|
| `/opsx:explore [topic]` | Enter thinking mode |
| `/opsx:propose [name]` | Create change with all artifacts |
| `/opsx:apply [name]` | Implement tasks from a change |
| `/opsx:archive [name]` | Archive a completed change |
| `/opsx:verify [name]` | Verify implementation matches artifacts |
| `/opsx:sync [name]` | Sync delta specs to main specs |

## Project Context

- **Tech stack**: Electron 42 (Electron Forge + Webpack), Node 24, React 19, `react-bootstrap`, `react-router-dom`. Blockchain + P2P core is JavaScript in `src/main/` (no Rust/Cargo).
- **Money**: `big.js`, integer units, never floats.
- **Crypto**: `@noble/secp256k1` (webpack-externalized), sha512 hashing in `src/main/util/crypto.js`.
- **State**: renderer is stateless UI (`useState`); no external store.
- **Package manager**: npm; dependencies pinned to exact versions (no `^`/`~`).
- **Complexity**: maximum cyclomatic complexity 8 — refactor via helpers, early returns, decomposed conditionals.
- **Security**: no secrets or config files. Wallet keys are generated at runtime in `~/.succinctcoin/`; `.env`/`.env.test` are gitignored — never commit them.
- **Testing**: `npm test` (jest). Never `npm run test:ci` — it is `jest --watch` and hangs CI.