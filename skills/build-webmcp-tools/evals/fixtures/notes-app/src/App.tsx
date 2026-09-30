/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes } from "react-router";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { FolderSidebar } from "./components/FolderSidebar";
import { ShareDialog } from "./components/ShareDialog";
import { TrashView } from "./components/TrashView";

export function App() {
  return (
    <BrowserRouter>
      <FolderSidebar />
      <Routes>
        <Route path="/" element={<NoteList />} />
        <Route path="/folders/:folderId" element={<NoteList />} />
        <Route path="/notes/:noteId" element={<NoteEditor />} />
        <Route path="/notes/:noteId/share" element={<ShareDialog />} />
        <Route path="/search" element={<NoteList />} />
        <Route path="/trash" element={<TrashView />} />
      </Routes>
    </BrowserRouter>
  );
}
