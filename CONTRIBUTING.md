# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

1. Use Node 20.19+ (`nvm use` reads `.nvmrc`) and run `npm ci`.
2. Keep the engine pure: anything random goes through the seeded RNG in `src/engine/rng.ts`, never
   `Math.random()`, so runs stay reproducible.
3. Add or update tests for engine changes. Write the failing test first when you can.
4. Before opening a PR, run `npm run lint && npm run typecheck && npm test && npm run build`.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`...).

UI changes: please include a screenshot in both themes and check the layout at phone width.
