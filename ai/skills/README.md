# AI Skills

本目录存放第一阶段 AI orchestration 使用的内置技能包资源。

约定如下：

- 每个技能包一个独立目录，例如 `ai/skills/claude-code-workspace-basics-skill`
- 当前阶段每个技能包至少包含一个 `SKILL.md`
- `supabase/seeds/007_ai_skill_registry.sql` 中的 `root_path`、`manifest_path`、`entry_resource_path` 必须与本目录结构保持一致
- 后续如果某个技能包需要脚本、示例代码或更多资源，可继续在对应目录内增加文件，但不要随意改动已入库的路径
