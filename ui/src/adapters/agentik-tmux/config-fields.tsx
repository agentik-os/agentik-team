import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  ToggleField,
  DraftInput,
  DraftNumberInput,
  help,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function AgentikTmuxConfigFields({
  mode,
  isCreate,
  adapterType,
  values,
  set,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  return (
    <>
      <Field label="Working directory" hint="Absolute path to the working directory for the agent.">
        <DraftInput
          value={
            isCreate
              ? values!.cwd ?? ""
              : eff("adapterConfig", "cwd", String(config.cwd ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ cwd: v })
              : mark("adapterConfig", "cwd", v || undefined)
          }
          immediate
          placeholder="/home/user/project"
          className={inputClass}
        />
      </Field>

      <Field label="Model" hint="Claude model to use.">
        <select
          value={
            isCreate
              ? values!.model ?? ""
              : eff("adapterConfig", "model", String(config.model ?? ""))
          }
          onChange={(e) =>
            isCreate
              ? set!({ model: e.target.value })
              : mark("adapterConfig", "model", e.target.value || undefined)
          }
          className={inputClass}
        >
          <option value="">Default</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Command" hint="CLI command to invoke (default: claude).">
        <DraftInput
          value={
            isCreate
              ? values!.command ?? ""
              : eff("adapterConfig", "command", String(config.command ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ command: v })
              : mark("adapterConfig", "command", v || undefined)
          }
          immediate
          placeholder="claude"
          className={inputClass}
        />
      </Field>

      <ToggleField
        label="Skip permissions"
        hint="Pass --dangerously-skip-permissions to the CLI."
        checked={
          isCreate
            ? values!.dangerouslySkipPermissions ?? true
            : eff("adapterConfig", "dangerouslySkipPermissions", config.dangerouslySkipPermissions !== false)
        }
        onChange={(v) =>
          isCreate
            ? set!({ dangerouslySkipPermissions: v })
            : mark("adapterConfig", "dangerouslySkipPermissions", v)
        }
      />
    </>
  );
}
