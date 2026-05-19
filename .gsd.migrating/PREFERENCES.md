---
version: 1
mode: solo
custom_instructions:
  - "When giving commands to use in human in loop always consider the operating system do not just give linux and always give commands in single lines or wrapped so that paste doesn't try to run every return carriage. Ask for apis to homelab tools where applicable and the end run for most work is to create an api and node for n8n for applications so they can be deterministically called in workflows."
skill_discovery: auto
skill_staleness_days: 60
auto_supervisor:
  soft_timeout_minutes: 60
  idle_timeout_minutes: 10
  hard_timeout_minutes: 240
uat_dispatch: false
unique_milestone_ids: true
budget_enforcement: pause
context_pause_threshold: 90
notifications:
  enabled: true
  on_complete: true
  on_error: true
  on_budget: true
  on_milestone: true
  on_attention: true
  max_entries: 100
cmux:
  enabled: true
  notifications: true
  sidebar: true
  splits: true
  browser: true
remote_questions:
  channel: discord
  channel_id: 1505965836878479511
  timeout_minutes: 30
  poll_interval_seconds: 2
git:
  isolation: none
  main_branch: main
  auto_push: true
min_request_interval_ms: 0
uok:
  enabled: true
  legacy_fallback:
    enabled: true
  gates:
    enabled: true
  model_policy:
    enabled: true
  execution_graph:
    enabled: true
  audit_unified:
    enabled: true
  plan_v2:
    enabled: true
  gitops:
    enabled: true
    turn_push: true
token_profile: burn-max
phases:
  skip_research: false
  skip_reassess: false
  skip_slice_research: false
  skip_milestone_validation: false
  reassess_after_slice: true
  require_slice_discussion: false
  mid_execution_escalation: true
  progressive_planning: true
parallel:
  enabled: true
  max_workers: 2
  merge_strategy: per-slice
  auto_merge: auto
slice_parallel:
  enabled: true
  max_workers: 2
reactive_execution:
  enabled: true
  max_parallel: 3
  isolation_mode: same-tree
gate_evaluation:
  enabled: false
  task_gates: true
auto_visualize: true
auto_report: true
verification_auto_fix: true
verification_max_retries: 2
enhanced_verification: true
enhanced_verification_pre: true
enhanced_verification_post: true
enhanced_verification_strict: false
safety_harness:
  enabled: false
  evidence_collection: true
  file_change_validation: true
  evidence_cross_reference: true
  destructive_command_warnings: true
  content_validation: false
  checkpoints: true
  auto_rollback: true
  timeout_scale_cap: 100
discuss_preparation: true
discuss_web_research: true
discuss_depth: quick
search_provider: ollama
context_selection: smart
context_management:
  observation_masking: true
  observation_mask_turns: 8
  compaction_threshold_percent: 0.9
  tool_result_max_chars: 10000
context_window_override: 256000
codebase:
  max_files: 500
  collapse_threshold: 20
widget_mode: full
forensics_dedup: true
show_token_cost: true
github:
  enabled: true
  auto_link_commits: true
  slice_prs: true
experimental:
  rtk: true
language: English
---
# GSD Skill Preferences

See `~/.gsd/agent/extensions/gsd/docs/preferences-reference.md` for full field documentation and examples.
