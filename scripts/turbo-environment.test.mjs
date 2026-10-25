import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (relative) =>
  JSON.parse(readFileSync(path.join(root, relative), "utf8"));
const webEnv = ["GRAPHQL_INTERNAL_URL", "ENABLE_EXPERIMENTAL_REACT_COMPILER"];
const webCredentials = [
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_AUTH_EMULATOR_HOST",
];
const cases = [
  {
    name: "service-web",
    tasks: ["build", "dev"],
    hashed: [...webEnv, "BUNDLE_ANALYZE"],
    passed: [...webCredentials, "SENTRY_AUTH_TOKEN"],
  },
  {
    name: "admin-web",
    tasks: ["build", "dev"],
    hashed: webEnv,
    passed: webCredentials,
  },
  {
    name: "visual-web",
    tasks: ["build", "dev"],
    hashed: webEnv,
    passed: [...webCredentials, "SENTRY_AUTH_TOKEN"],
  },
  {
    name: "tier-web",
    tasks: ["dev"],
    hashed: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SITE_URL",
    ],
    passed: ["SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    name: "graphql-api",
    tasks: ["dev"],
    hashed: [],
    passed: [
      "INFRA_ENV",
      "RUNNING_ENV",
      "DATABASE_URL",
      "MONGODB_URI",
      "FIREBASE_PROJECT_ID",
      ...webCredentials,
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "OPEN_ROUTER_API_KEY",
      "OPEN_ROUTER_ENDPOINT",
      "OPEN_ROUTER_MODEL",
      "OPEN_ROUTER_THINKING_LEVEL",
      "BRAVE_API_KEY",
      "CURSOR_SIGNATURE_SECRET",
      "VOTE_IP_SALT",
      "VISUAL_VIEW_IP_SALT",
      "VISUAL_FLOW_WRITES_ENABLED",
      "ALLOW_LEGACY_CURSOR",
    ],
  },
];

// Exercise the installed Turbo with production configs; all environment values are synthetic.
for (const contract of cases) {
  test(`${contract.name} receives only its declared build/dev environment`, () => {
    const fixture = mkdtempSync(path.join(tmpdir(), "darun-turbo-env-"));
    const app = path.join(fixture, "apps", contract.name);
    const publicName = "NEXT_PUBLIC_GRAPHQL_URL";
    const values = Object.fromEntries(
      [...contract.hashed, ...contract.passed, publicName].map(
        (name, index) => [name, `fixture-${index}`],
      ),
    );
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      COREPACK_HOME: process.env.COREPACK_HOME,
      ...values,
      UNDECLARED_SECRET: "must-stay-out",
      TURBO_TELEMETRY_DISABLED: "1",
    };
    const run = (task, extraEnv = {}, dry = false) => {
      const result = spawnSync(
        path.join(root, "node_modules/.bin/turbo"),
        [
          "run",
          task,
          `--filter=${contract.name}`,
          ...(dry ? ["--dry=json"] : ["--force"]),
        ],
        {
          cwd: fixture,
          env: { ...env, ...extraEnv },
          encoding: "utf8",
          timeout: 30_000,
        },
      );
      assert.ifError(result.error);
      // Do not surface child output, which could contain a credential if the contract regresses.
      assert.equal(result.status, 0, `Turbo ${task} must succeed`);
      return dry
        ? JSON.parse(result.stdout).tasks.find((item) => item.task === task)
        : JSON.parse(readFileSync(path.join(app, "observed.json"), "utf8"));
    };
    try {
      mkdirSync(app, { recursive: true });
      writeFileSync(
        path.join(fixture, "package.json"),
        JSON.stringify({
          name: "environment-fixture",
          private: true,
          packageManager: readJson("package.json").packageManager,
        }),
      );
      writeFileSync(
        path.join(fixture, "pnpm-workspace.yaml"),
        'packages: ["apps/*"]\nverifyDepsBeforeRun: false\n',
      );
      writeFileSync(
        path.join(fixture, "pnpm-lock.yaml"),
        "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  apps/" +
          contract.name +
          ": {}\n",
      );
      writeFileSync(
        path.join(fixture, "turbo.json"),
        readFileSync(path.join(root, "turbo.json")),
      );
      const config = path.join(root, "apps", contract.name, "turbo.json");
      if (existsSync(config))
        writeFileSync(path.join(app, "turbo.json"), readFileSync(config));
      symlinkSync(
        path.join(root, "node_modules"),
        path.join(fixture, "node_modules"),
        "dir",
      );
      writeFileSync(
        path.join(app, "package.json"),
        JSON.stringify({
          name: contract.name,
          dependencies:
            contract.name === "graphql-api" ? {} : { next: "16.2.0" },
          scripts: { build: "node probe.cjs", dev: "node probe.cjs" },
        }),
      );
      writeFileSync(
        path.join(app, "probe.cjs"),
        `require('node:fs').writeFileSync('observed.json', JSON.stringify(Object.fromEntries(${JSON.stringify([...Object.keys(values), "UNDECLARED_SECRET"])}.map(name => [name, process.env[name] ?? null]))));`,
      );
      for (const task of contract.tasks) {
        const observed = run(task);
        for (const name of [...contract.hashed, ...contract.passed]) {
          assert.ok(
            observed[name] === values[name],
            `${task} must pass ${name}`,
          );
        }
        assert.equal(
          observed.UNDECLARED_SECRET,
          null,
          "strict filtering must remain enabled",
        );
        if (contract.name !== "graphql-api")
          assert.ok(
            observed[publicName] === values[publicName],
            "Next public inference must remain enabled",
          );
      }
      if (contract.tasks.includes("build")) {
        const baseline = run("build", {}, true);
        for (const name of contract.hashed) {
          assert.notEqual(
            run("build", { [name]: "changed-option" }, true).hash,
            baseline.hash,
            `${name} must affect the build hash`,
          );
        }
        assert.equal(
          run("build", { SENTRY_AUTH_TOKEN: "rotated-upload-token" }, true)
            .hash,
          baseline.hash,
          "upload token rotation must not invalidate build output",
        );
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
