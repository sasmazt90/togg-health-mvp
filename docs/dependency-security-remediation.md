# Dependency security migration

The vehicle App Router application moves from Next 14.2.35 / React 18.3.1 to
exact Next 15.5.27 / React and React DOM 19.0.8. `eslint-config-next` is pinned
to 15.5.27; React type packages are pinned to 19.0.14 and 19.0.6. Next 16 is
not required for this migration. Published package metadata was checked before
installation, including Node, React and ESLint peer compatibility.

Next 15's asynchronous request APIs do not require application migrations here:
the source does not use server cookies, headers, draftMode or dynamic-route
params. Existing client-side FastAPI requests remain unchanged. There are no new
Server Actions, middleware, rewrites, dynamic routes or server-side fetch paths.
Three skin component ref prop declarations now include `null`, matching the real
React 19 video refs; camera effects, RAF logic and cleanup are unchanged.

Next 15.5 generates route definitions referenced by `next-env.d.ts`. Run
`npm run typecheck` to generate them with `next typegen` before TypeScript,
including on a fresh checkout without `.next`.

Next still declares PostCSS 8.4.31. The root override is deliberately scoped:

```json
"overrides": {
  "next@15.5.27": {
    "postcss": "8.5.28"
  }
}
```

The already safe directly declared PostCSS chain is unchanged. The old
`@next/eslint-plugin-next -> glob@10.3.10` chain disappears with the aligned
Next lint package, which uses fast-glob. Unrelated ESLint glob 7 dependencies
are retained. All framework peer paths resolve to the pinned React 19 pair.
The lock retains existing unrelated resolutions; added Sharp platform packages
come from Next 15's optional optimizer dependency, not an unrestricted refresh.

Owned frontend dev/start commands and the audit server bind to `127.0.0.1`.
The Windows demo backend command and documented manual backend command also
explicitly bind to `127.0.0.1`. This is a local Windows demo plus Linux CI; a
public/LAN deployment would require its own exposure assessment.

## Bounded security checks

Against a running production frontend and FastAPI backend, run:

```sh
node tests/security/dependency-regressions.cjs
```

`ATTUNE_AUDIT_BASE`, `ATTUNE_API_BASE` and `ATTUNE_SECURITY_OUT` can select the
loopback service ports and evidence path. Non-loopback targets are rejected.
The checks exercise the actual installed framework and Next-resolved PostCSS:

- Native traversal keys in five incremental-cache kinds must be rejected;
  a real safe write must succeed and a disposable sentinel must be unchanged.
- Absolute HTTP and WebSocket upgrade destinations must not cause Next to
  connect to a controlled loopback listener. A direct positive control proves
  the listener works.
- Twelve real image variant cache keys must obey a two-fixture disk budget,
  evicting old entries while preserving the newest entry. This tests the new
  LRU mechanism. Production uses the patched default finite budget of half
  available disk space; the test's small budget is confined to a temporary cache.
- Previous source maps cannot be loaded outside the controlled CSS fixture
  directory, including traversal and absent-`from` variants. An ordinary map
  inside that directory must still load.
- Actual trusted, untrusted and preflight API requests preserve the CORS policy.

Files are temporary, non-sensitive fixtures, and recursive cleanup verifies the
absolute disposable target first. The tests do not execute RCE payloads, read
secrets, probe third-party proxy destinations, or attempt disk exhaustion.
Windows RCE mitigation is checked through patched cache path handling rather
than exploit execution. Existing consent/deletion/crisis/vehicle and functional
tests remain unchanged.

CI saves and gates both full and production-only npm audit JSON reports and
the complete installed dependency graph. A zero npm audit result is dependency
inventory evidence; runtime and functional evidence are separate requirements.

## Primary references

- [Next 15 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Windows cache/RCE advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36)
- [WebSocket SSRF advisory](https://github.com/advisories/GHSA-c4j6-fc7j-m34r)
- [Image cache growth advisory](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8)
