---
name: browser-platformer-weak-llm
description: Build a very small 2D browser jump-and-run or platformer in HTML, CSS, and JavaScript using staged prompts optimized for weak models. Use when OpenCode needs to create or extend a simple browser platformer, keep the game runnable after every step, or verify gameplay changes with lightweight debug hooks and Node-runnable self-checks.
---

# Browser Platformer Weak LLM

Keep scope narrow. Use plain `index.html`, `styles.css`, and `script.js`, one `canvas`, rectangle-based entities, no framework, no build step, and no external assets.

## Workflow

1. Open [references/staged-prompts.md](references/staged-prompts.md).
2. Pick the next unfinished stage and send that stage prompt with minimal edits.
3. Preserve all working behavior from earlier stages. Do not refactor aggressively once a stage passes.
4. Keep verification hooks alive from stage 1 onward.
5. If a stage fails, fix that stage before moving forward.

## Required Architecture

- Keep gameplay logic in `script.js`.
- Use one shared state object and arrays of plain objects for `platforms`, `hazards`, `goals`, and `coins`.
- Use rectangle collisions and simple deterministic update steps.
- Make the game core runnable in Node without DOM access.
- Export `createGameState`, `stepGame`, and `runSelfCheck` through `module.exports` when available.
- Expose `window.__platformerTest` in the browser with at least `getSnapshot()`, `setKey(code, pressed)`, `step(frames)`, `reset()`, and `runSelfCheck()`.
- Return JSON-serializable objects from verification helpers.

## Verification Discipline

- After each stage, re-read the edited files and confirm the requested pieces exist.
- Run `node --check script.js` when Node is available.
- Run the exported self-check in Node when available:

```bash
node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
```

- If browser automation is available, also check `window.__platformerTest`. If it is not available, say so explicitly instead of claiming full runtime browser verification.
- Keep the self-check current. Do not leave stale assertions from an earlier stage only.

## References

- Use [references/staged-prompts.md](references/staged-prompts.md) for the copy-paste stage prompts.
- Keep the verification block from each prompt intact so the agent actually proves the stage works.
