/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";

export interface Note {
  id: string;
  title: string;
  body: string; // Markdown authored by the user or collaborators
  folderId: string | null;
  tags: string[];
  sharedWith: string[]; // collaborator emails
  deletedAt: string | null;
}

export interface Folder {
  id: string;
  name: string;
}

interface NotesState {
  notes: Note[];
  folders: Folder[];
  searchNotes: (query: string) => Note[];
  createNote: (title: string, folderId?: string) => Note;
  moveNotes: (noteIds: string[], folderId: string) => void;
  tagNotes: (noteIds: string[], tags: string[]) => void;
  shareNote: (noteId: string, email: string) => Promise<void>;
  trashNotes: (noteIds: string[]) => void;
  emptyTrash: () => Promise<void>; // permanent deletion
}

export const useNotes = create<NotesState>(() => ({}) as NotesState);
