# dsh-agent-skills

[![npm](https://img.shields.io/npm/v/dsh-agent-skills)](https://www.npmjs.com/package/dsh-agent-skills)
[![license](https://img.shields.io/npm/l/dsh-agent-skills)](./LICENSE)
[![DeepSeek Harness plugin](https://img.shields.io/badge/DSH-plugin-4f46e5)](https://github.com/deepseek-ai/deepseek-harness)

把 Claude Code、Codex、Gemini CLI、Cursor 等工具的本地 Agent Skills 接入 DeepSeek Harness，并在「设置 → Agent Skills」里统一查看、启停和管理。

![Agent Skills 设置页面](https://raw.githubusercontent.com/minivv/dsh-agent-skills/main/agent-skills-page.png)

## 它解决什么问题

很多 AI 编程工具都使用 `<技能名>/SKILL.md`，但技能分散在不同目录。`dsh-agent-skills` 会自动发现这些目录，把有效技能汇总进 DSH，并提供一个可视化设置页：

- 默认扫描 `~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.config/opencode/skills` 和 `~/.gemini/skills`。
- 支持添加任意自定义技能目录。
- 显示每个来源是否存在、包含多少有效技能，以及技能名称和描述。
- 可按目录或单个技能启停；变更会持久化，页面会提示刷新后生效。
- 监听技能文件变化，也可随时手动重新扫描。
- 不修改原始 `SKILL.md` 文件。

## 安装

### 方式一：DSH 插件市场（推荐）

通过 [DSH 插件市场](https://github.com/dsh-market/dsh-market) 安装，或打开 DSH 的「设置 → 插件市场」，搜索 **Agent Skills**，点击安装。市场会优先使用 npm 包，安装速度快，也不需要在本机重新构建。

安装后继续完成下面的「开启接管 DSH 技能」步骤，再重启 DSH Web。

### 方式二：从 npm 安装

```bash
dsh plugin --profile web add dsh-agent-skills
```

### 方式三：从 GitHub 安装

```bash
dsh plugin --profile web add github:minivv/dsh-agent-skills
```

仓库包含 `prepare: npm run build`，因此 pnpm 会在 Git 安装时自动构建。DSH/pnpm 可能会要求你授权构建脚本；不想授权构建时请使用 npm 或插件市场版本，npm 包已经包含构建好的 `lib/`。

### 开启接管 DSH 技能

完成任一种安装方式后：

1. 打开 DSH 的「设置 → Agent Skills」。
2. 点击 **开启接管 DSH 技能**。
3. 看到“已开启”提示后重启 DSH Web。

开启后，页面中的目录和技能开关会接入 `standard` 与 `code` preset，真正控制 Agent 可见的技能。这个操作只添加 `dsh-agent-skills/preset` provider，不会创建第二个 `agentSkills` host 服务。

如果页面无法定位 DSH 安装位置，可以使用备用命令：

```bash
DSH_INSTALL_ROOT="$(npm root -g)/@deepseek-ai/dsh" \
  node ~/.dsh/profiles/web/node_modules/dsh-agent-skills/scripts/install-preset.mjs
```

执行后重启 DSH Web。DSH 升级可能覆盖内置 preset；如果页面重新显示“开启接管 DSH 技能”，点击一次即可恢复。

## 使用

1. 打开 DSH Web。
2. 进入「设置 → Agent Skills」。
3. 检查自动发现的来源，或点击「+ 添加目录」。
4. 使用来源开关或技能开关控制 Agent 可见范围。
5. 技能区出现“n 个技能变更需刷新页面生效”后，点击「刷新页面」。
6. 修改磁盘上的技能后，点击「重新扫描」或等待自动刷新。

插件状态保存在：

```text
$DSH_HOME/agent-skills/state.json
```

支持的目录结构：

```text
skills/
├── my-skill/
│   └── SKILL.md
└── another-skill.md
```

`SKILL.md` 需要 YAML frontmatter，`name` 必须使用小写 kebab-case：

```markdown
---
name: my-skill
description: Explain when this skill should be used.
---

# Instructions
```

## 卸载

如果安装过 preset-only 行，请先清理它，再卸载 npm 包：

```bash
DSH_INSTALL_ROOT="$(npm root -g)/@deepseek-ai/dsh" \
  node ~/.dsh/profiles/web/node_modules/dsh-agent-skills/scripts/uninstall-preset.mjs

dsh plugin --profile web remove dsh-agent-skills
```

最后重启 DSH Web。插件不会自动删除 `$DSH_HOME/agent-skills/state.json`，方便以后重装时保留设置。

## 开发

要求 Node.js 20+。

```bash
npm install
npm run typecheck
npm run build
npm pack --dry-run
```

- `src/index.ts`：host 入口，提供设置页 remote service 和全局 provider。
- `src/preset.ts`：preset-only 入口，只注册 scoped provider。
- `src/client/`：设置页 UI。
- `src/scan.ts`：技能目录扫描和 frontmatter 解析。
- `lib/`：已提交的构建产物，供 npm 和免构建安装使用。

## 已知约束

- DSH 技能名必须匹配 `[a-z0-9]+(?:-[a-z0-9]+)*`。
- 修改插件安装或 preset 组合后需要重启一次；目录或技能开关变更后按页面提示刷新。
- DSH 升级可能覆盖其内置 preset 文件；如开关不再生效，在设置页重新点击「开启接管 DSH 技能」。

## 相关链接

- [GitHub](https://github.com/minivv/dsh-agent-skills)
- [npm](https://www.npmjs.com/package/dsh-agent-skills)
- [DSH 插件市场](https://github.com/dsh-market/dsh-market)
- [WeiSpot 项目页](https://weispot.vercel.app/projects/dsh-agent-skills)

## License

[MIT](./LICENSE)
