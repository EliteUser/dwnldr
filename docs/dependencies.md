# Dependency maintenance

Last reviewed: October 16, 2026.

Dependency versions are pinned in the workspace manifests and `pnpm-lock.yaml`. Update related packages together:
React with React DOM, all Mantine packages, and Vitest in both workspaces.

Keep Node.js and `@types/node` on major 24. The Node 26 type definitions describe APIs outside the supported
runtime. pnpm stays on major 10 for this update; its exact version must agree in `package.json`, `Dockerfile`,
and the deployment workflow. A pnpm major upgrade needs a separate review of workspace and deployment behavior.

## Remaining development dependency advisory

The October 16 audit reports one high-severity advisory in `braces@3.0.3`, pulled in by Stylelint through
Micromatch. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched upstream
release. It affects deeply nested brace patterns; this project invokes Stylelint with a fixed glob over trusted
repository files. The package is development tooling and is absent from the production dependency tree.

Keep the advisory visible. Recheck when Braces publishes a fix or Stylelint removes the affected dependency;
do not substitute an incompatible override or suppress the audit. The production-only audit currently reports
no vulnerabilities.

```sh
pnpm outdated -r --format json
pnpm audit
pnpm audit --prod
pnpm check
```
