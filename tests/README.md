# Node Regression Tests

Run from the repository root with Node 24. No package installation or build step
is needed. Tests import the actual game modules.

## Full Suite

Download the exact Three r160 ES module used by the import map in `index.html`
into temporary storage, then run every test:

```sh
curl --fail --location --max-time 30 \
  https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js \
  --output /tmp/counters-ball-test-three-r160.mjs
COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs
```

The download requires network access. Reuse the temporary file for subsequent
runs. Nothing is vendored into the repository; no binary assets are added.
The test helper checks `THREE.REVISION === '160'` and maps the bare `three`
import to this file using Node's module hooks. An invalid supplied path or
version fails the suite rather than substituting fake physics.

## Pure Tests

```sh
node --test tests/*.test.mjs
```

Without `COUNTERS_TEST_THREE`, the session integration tests explicitly skip;
the remaining tests run without third-party dependencies. Use the full-suite
command for a zero-skip integration check.

## Coverage and Limits

Coverage includes match rules, save compatibility and malformed values, gesture
sampling, skill attribution, timestamp replay, photograph path validation, and
audio resource ownership. Session integration exercises real session methods,
rules, physics, presentation director, and Three transforms; it bypasses the
GPU/DOM stage constructor and records UI/audio boundary calls. Audio tests use
Web Audio boundary doubles to verify scheduling and cleanup.

These tests do not certify browser rendering, touch feel, audible quality,
photograph loading, or GPU performance. They never launch browser automation.
Node may print `MODULE_TYPELESS_PACKAGE_JSON` warnings because the no-build
game uses ES modules without a package manifest; these are not test failures.
