"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/types/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#000000",
];

export default function TagsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    setTags(data ?? []);
    setIsLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    const { error } = await supabase.from("tags").insert({
      user_id: user.id,
      name: newName.trim(),
      color: newColor,
    });
    if (error) {
      toast.error(error.message === 'duplicate key value violates unique constraint "tags_user_id_name_key"'
        ? "A tag with that name already exists."
        : "Couldn't create tag.");
      return;
    }
    toast.success("Tag created.");
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    loadTags();
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from("tags")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", id);
    if (error) {
      toast.error("Couldn't update tag.");
      return;
    }
    toast.success("Tag updated.");
    setEditingId(null);
    loadTags();
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Delete tag "${name}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete tag.");
      return;
    }
    toast.success("Tag deleted.");
    loadTags();
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Tags</h1>
      <p className="text-sm text-muted-foreground">
        Create and manage tags to organize your applications by custom labels like
        "remote", "startup", or "FAANG".
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create tag</CardTitle>
          <CardDescription>Give it a name and pick a color.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Tag name</Label>
              <Input
                id="tag-name"
                placeholder="e.g. remote"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 ${
                      newColor === c ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                <Plus className="mr-1 h-4 w-4" />
                Add tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No tags yet. Create your first tag above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              {editingId === tag.id ? (
                <div className="flex flex-1 items-center gap-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 w-40"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-6 w-6 rounded-full border-2 ${
                          editColor === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleUpdate(tag.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(tag)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag.id, tag.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
