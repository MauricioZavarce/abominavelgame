# Staged Prompts

Use these prompts in order. Each prompt is intentionally narrow so a weak model has less freedom to break the game.

## Global Rules

Carry these rules into every stage:

- Edit only `index.html`, `styles.css`, and `script.js` unless there is a clear need for one more tiny file.
- Use only vanilla HTML, CSS, and JavaScript.
- Use one canvas and simple colored rectangles.
- Keep the whole game on one screen. Do not add camera movement.
- Keep one shared state object and arrays of plain objects.
- Do not add libraries, sprites, audio, bundlers, classes, or complex abstractions.
- Preserve all working behavior from earlier stages.
- Keep `createGameState`, `stepGame`, `runSelfCheck`, and `window.__platformerTest` working.

## Stage 1: Verified Scaffold

```text
Build only stage 1 of a tiny browser jump-and-run in the current workspace.

Files:
- index.html
- styles.css
- script.js

Hard constraints:
- Vanilla HTML, CSS, and JavaScript only
- One canvas
- No libraries, no build step, no images
- Keep the code simple and readable
- Make the game core runnable in Node without DOM access
- Wrap browser-only code in environment guards
- Export module.exports = { createGameState, stepGame, runSelfCheck } when module.exports exists
- Expose window.__platformerTest in the browser with getSnapshot(), setKey(code, pressed), step(frames), reset(), and runSelfCheck()
- Do not implement future stages beyond what is requested here

Stage 1 requirements:
- Create a page with a title, a centered canvas, and one short controls line
- Draw a player rectangle and a floor rectangle
- Create a state object with player, world, input, status, platforms, hazards, goals, and coins
- Add a render loop and an update pipeline, even if gameplay is still minimal
- Make stepGame(state) advance exactly one fixed tick and return the state
- Make runSelfCheck() return a JSON-serializable object like { passed, checks, summary }

runSelfCheck() must verify:
- Initial state has numeric player x, y, width, and height
- There is at least one platform acting as the floor
- A call to stepGame() does not throw and keeps key state fields numeric
- The exported Node hooks exist in Node and the browser debug hooks are created in browser code

Before finishing:
1. Re-read the edited files.
2. If node exists, run: node --check script.js
3. If node exists, run: node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
4. Report exactly which checks passed and what remains for the next stage.
```

## Stage 2: Movement, Gravity, and Single Jump

```text
Build only stage 2 of the tiny browser jump-and-run. Preserve all working stage 1 behavior.

Keep these hard constraints:
- Vanilla HTML, CSS, and JavaScript only
- One canvas
- No libraries, no build step, no images
- Keep the pure game core runnable in Node
- Do not refactor the project into many files
- Do not implement later stages yet

Stage 2 requirements:
- Add left and right movement with ArrowLeft/ArrowRight and A/D
- Add gravity
- Add one grounded jump with ArrowUp, W, or Space
- Prevent double jump while airborne
- Keep floor collision so the player lands and stops cleanly on the floor
- Update the browser controls line so it matches the actual keys

Update runSelfCheck() so it verifies at least:
- Stepping with right input increases player.x
- Stepping with left input decreases player.x
- Gravity pulls the player downward until the player lands on the floor
- Jumping from the grounded state gives upward velocity and leaves the ground
- Pressing jump again while airborne does not create a second jump impulse

Before finishing:
1. Re-read the edited files.
2. If node exists, run: node --check script.js
3. If node exists, run: node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
4. Report exactly which checks passed and what still remains for the platforming stage.
```

## Stage 3: Platform Layout and Solid Collisions

```text
Build only stage 3 of the tiny browser jump-and-run. Preserve all working stage 1 and stage 2 behavior.

Keep these hard constraints:
- Vanilla HTML, CSS, and JavaScript only
- One canvas
- No libraries, no assets, no camera
- Keep one shared state object and plain object arrays
- Keep the Node-runnable game core and browser debug hooks intact
- Do not implement hazards, goal handling, or coins yet

Stage 3 requirements:
- Add a small platform layout with several elevated platforms
- Implement solid rectangle collisions for platforms
- Resolve collisions in a simple, stable way so the player can stand on platforms
- Prevent the player from falling through the floor or elevated platforms
- Prevent the player from passing through platform sides or undersides during normal movement

Update runSelfCheck() so it verifies at least:
- A player dropped above an elevated platform lands on that platform
- A player falling for many steps does not sink through the floor
- Moving into the side of a platform does not pass through it
- Jumping into the underside of a platform does not tunnel through it

Before finishing:
1. Re-read the edited files.
2. If node exists, run: node --check script.js
3. If node exists, run: node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
4. Report exactly which checks passed and what remains for win/lose states.
```

## Stage 4: Goal, Hazards, Fall Death, and Reset

```text
Build only stage 4 of the tiny browser jump-and-run. Preserve all working behavior from earlier stages.

Keep these hard constraints:
- Vanilla HTML, CSS, and JavaScript only
- One canvas
- No libraries, no camera, no complex menus
- Keep the Node-runnable core and browser debug hooks intact
- Do not add coins or optional polish yet

Stage 4 requirements:
- Add one goal rectangle
- Add at least one hazard rectangle
- Mark status.won = true when the player touches the goal
- Mark status.dead = true when the player touches a hazard
- Mark status.dead = true when the player falls below the world
- Add a reset path through KeyR and through the browser debug API reset()
- Show a short win or lose message on screen

Update runSelfCheck() so it verifies at least:
- Touching the goal sets won without setting dead
- Touching a hazard sets dead
- Falling below the world sets dead
- Reset returns the player and status to the initial clean state

Before finishing:
1. Re-read the edited files.
2. If node exists, run: node --check script.js
3. If node exists, run: node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
4. Report exactly which checks passed and what remains for the final content pass.
```

## Stage 5: Coins, Score, and Final Sanity Pass

```text
Build only stage 5 of the tiny browser jump-and-run. Preserve all working behavior from earlier stages.

Keep these hard constraints:
- Vanilla HTML, CSS, and JavaScript only
- One canvas
- No libraries, no images, no camera
- Keep the game short, simple, and fully on one screen
- Keep the Node-runnable core and browser debug hooks intact
- This is the final stage, so improve clarity, not complexity

Stage 5 requirements:
- Add a few collectible coin rectangles
- Increase score when a coin is collected
- Remove a coin after collection so it cannot be collected twice
- Show the score in a small HUD or status line
- Make the final level feel like one short left-to-right course from spawn to goal
- Keep the code simple and avoid large refactors

Update runSelfCheck() so it verifies at least:
- Collecting a coin increases score by exactly one
- A collected coin is removed and cannot increment score twice
- The game still reaches a winning state when the player touches the goal
- Earlier stage checks still pass

Before finishing:
1. Re-read the edited files.
2. If node exists, run: node --check script.js
3. If node exists, run: node -e "const g=require('./script.js'); const result=g.runSelfCheck(); console.log(JSON.stringify(result, null, 2)); process.exit(result.passed ? 0 : 1)"
4. Report exactly which checks passed and whether any browser-only manual checks still remain.
```
