/**
 * Restart the current DSH web host through a detached helper. The helper
 * waits for the current process to release its port, then replays the same
 * CLI invocation and working directory.
 *
 * @module dsh-agent-skills/restart
 */
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
function dshLaunch() {
    const entry = process.argv[1];
    if (entry !== undefined && /[\\/](?:bin\.(?:js|ts)|dsh)$/.test(entry)) {
        const absoluteEntry = resolve(entry);
        return {
            file: process.execPath,
            args: [...process.execArgv, absoluteEntry, ...process.argv.slice(2)],
            cwd: dirname(absoluteEntry),
            viaShell: false
        };
    }
    return {
        file: "dsh",
        args: process.argv.slice(2),
        cwd: process.cwd(),
        viaShell: process.platform === "win32"
    };
}
function respawnInvocation(launch) {
    if (process.platform !== "win32") {
        return { file: launch.file, args: launch.args, viaShell: launch.viaShell, detached: true };
    }
    const quote = (part) => `'${part.replace(/'/g, "''")}'`;
    return {
        file: "powershell.exe",
        args: [
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-Command",
            [`& ${quote(launch.file)}`, ...launch.args.map(quote)].join(" ")
        ],
        viaShell: false,
        detached: false
    };
}
/** Schedule a replacement host, then terminate this process after the reply. */
export function scheduleDshRestart() {
    const launch = dshLaunch();
    const replacement = respawnInvocation(launch);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const stdout = join(tmpdir(), `dsh-agent-skills-restart-${stamp}.out.log`);
    const stderr = join(tmpdir(), `dsh-agent-skills-restart-${stamp}.err.log`);
    const helperCode = [
        "const { spawn } = require('node:child_process')",
        "const fs = require('node:fs')",
        `const file = ${JSON.stringify(replacement.file)}`,
        `const args = ${JSON.stringify(replacement.args)}`,
        `const cwd = ${JSON.stringify(launch.cwd)}`,
        `const viaShell = ${JSON.stringify(replacement.viaShell)}`,
        `const detached = ${JSON.stringify(replacement.detached)}`,
        `const stdout = ${JSON.stringify(stdout)}`,
        `const stderr = ${JSON.stringify(stderr)}`,
        "setTimeout(() => {",
        "  try {",
        "    const out = fs.openSync(stdout, 'a')",
        "    const err = fs.openSync(stderr, 'a')",
        "    const child = spawn(file, args, { cwd, detached, stdio: ['ignore', out, err], env: process.env, shell: viaShell })",
        "    child.unref()",
        "  } catch {}",
        "}, 1500)"
    ].join("\n");
    const helper = spawn(process.execPath, ["-e", helperCode], {
        detached: true,
        stdio: "ignore",
        env: process.env
    });
    helper.unref();
    const stop = setTimeout(() => process.kill(process.pid, "SIGTERM"), 500);
    stop.unref();
    return { scheduled: true };
}
//# sourceMappingURL=restart.js.map