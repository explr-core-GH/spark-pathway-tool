# Architecture rules

- Keep privileged internship-demo helpers in a `*.server.ts` module and dynamically import them inside server-function handlers, so browser bundles cannot reach server dependencies.