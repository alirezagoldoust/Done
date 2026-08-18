"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";
import { formatDateTime, cn } from "@/lib/utils";
import { TASK_COLORS } from "@/lib/task-colors";
import type { BoardDetail, Task, TaskColor, UpdateTaskInput } from "@/types";

const UNASSIGNED = "unassigned";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  doer: z.string(),
  deadline: z.string(),
  color: z.string(),
  status: z.string(),
  column: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toDefaults(task: Task | null): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    doer: task?.doer ? String(task.doer.id) : UNASSIGNED,
    deadline: task?.deadline ?? "",
    color: task?.color ?? "default",
    status: task ? String(task.status) : "",
    column: task ? String(task.column) : "",
  };
}

export function TaskModal({
  task,
  board,
  onClose,
}: {
  task: Task | null;
  board: BoardDetail;
  onClose: () => void;
}) {
  const open = task !== null;
  const update = useUpdateTask(board.id);
  const remove = useDeleteTask(board.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // The parent remounts this component per task (via key), so initialising
  // defaults from the task here is sufficient — no syncing effect needed.
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(task),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  // Subscribe to the select-backed fields in a memoization-safe way.
  const doerValue = useWatch({ control, name: "doer" });
  const statusValue = useWatch({ control, name: "status" });
  const columnValue = useWatch({ control, name: "column" });
  const colorValue = useWatch({ control, name: "color" });

  function attemptClose() {
    if (isDirty) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  }

  async function onSubmit(values: FormValues) {
    if (!task) return;
    const input: UpdateTaskInput = {
      title: values.title.trim(),
      description: values.description,
      deadline: values.deadline ? values.deadline : null,
      doer_id: values.doer === UNASSIGNED ? null : Number(values.doer),
      color: values.color as TaskColor,
      status: Number(values.status),
      column: Number(values.column),
    };
    try {
      await update.mutateAsync({ id: task.id, input });
      toast.success("Changes saved");
      onClose();
    } catch {
      // error toast handled in the hook
    }
  }

  async function onDelete() {
    if (!task) return;
    try {
      await remove.mutateAsync(task.id);
      onClose();
    } catch {
      /* handled in hook */
    }
  }

  if (!task) return null;

  const doerOptions = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...board.members.map((m) => ({
      value: String(m.user.id),
      label: m.user.display_name,
    })),
  ];
  const statusOptions = board.statuses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ value: String(s.id), label: s.name }));
  const columnOptions = board.columns
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && attemptClose()}>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
          attemptClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          attemptClose();
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="border-b border-line px-5 py-3.5">
            <DialogTitle>Edit task</DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4">
              <Label htmlFor="title">Title</Label>
              <Input id="title" dir="auto" autoFocus {...register("title")} />
              {errors.title && (
                <p className="mt-1 text-xs text-danger">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                dir="auto"
                placeholder="Add more detail…"
                {...register("description")}
              />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Assignee</Label>
                <Select
                  ariaLabel="Assignee"
                  value={doerValue}
                  onValueChange={(v) =>
                    setValue("doer", v, { shouldDirty: true })
                  }
                  options={doerOptions}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  ariaLabel="Status"
                  value={statusValue}
                  onValueChange={(v) =>
                    setValue("status", v, { shouldDirty: true })
                  }
                  options={statusOptions}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  ariaLabel="Category"
                  value={columnValue}
                  onValueChange={(v) =>
                    setValue("column", v, { shouldDirty: true })
                  }
                  options={columnOptions}
                />
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                className="w-full sm:w-48 cursor-pointer [color-scheme:dark]"
                {...register("deadline")}
              />
            </div>

            <div className="mb-1">
              <Label>Colour</Label>
              <div className="flex items-center gap-2">
                {TASK_COLORS.map((c) => {
                  const selected = colorValue === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={selected}
                      onClick={() =>
                        setValue("color", c.value, { shouldDirty: true })
                      }
                      style={{ background: c.fill ?? c.swatch }}
                      className={cn(
                        "h-7 w-7 cursor-pointer rounded-full transition-transform",
                        "ring-offset-2 ring-offset-bg-elevated hover:scale-110",
                        selected
                          ? "ring-2 ring-accent scale-110"
                          : "ring-1 ring-line",
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <p className="mt-4 text-xs text-text-faint">
              Created {formatDateTime(task.created_at)} · Updated{" "}
              {formatDateTime(task.updated_at)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Delete?</span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onDelete}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? <Spinner className="h-4 w-4" /> : "Delete"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="text-danger hover:bg-danger-soft"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={attemptClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !isDirty}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>

        {confirmingClose && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-line bg-bg-elevated px-5 py-3">
            <span className="text-sm text-text-muted">
              Discard unsaved changes?
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingClose(false)}
              >
                Keep editing
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setConfirmingClose(false);
                  onClose();
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
