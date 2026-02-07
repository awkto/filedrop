# FileDrop Move Feature - Edge Cases & Behavior

## Current Implementation Status
- ✅ = Implemented
- ⚠️ = Partially implemented
- ❌ = Not implemented
- 🔄 = Needs decision

---

## A. UPLOAD SCENARIOS (Normal Mode - No Move Active)

### A1. Upload file that already exists
**Current:** ❌ Not handled - file is overwritten silently
**Should be:** 🔄
- Option 1: Show dialog "file.txt exists. [Replace] [Skip] [Cancel]"
- Option 2: Auto-rename to "file (1).txt"
- Option 3: Show error, prevent upload

**Decision needed:** Which approach?

---

### A2. Upload multiple files where 1 or 2 already exist
**Current:** ❌ Not handled - conflicting files overwritten
**Should be:** 🔄
- Show dialog: "2 of 5 files already exist. [Replace All] [Skip Conflicts] [Cancel]"
- Or per-file: "[Replace] [Replace All] [Skip] [Skip All] [Cancel]"

**Decision needed:** Batch or per-file?

---

### A3. Upload directory that already exists
**Current:** ❌ Not handled - likely merges or errors
**Should be:** 🔄
- Option 1: Merge contents (overwrite conflicts)
- Option 2: Show error "Directory exists"
- Option 3: Skip with notification

**Decision needed:** Merge or block?

---

### A4. Upload multiple directories where 1 or 2 already exist
**Current:** ❌ Not handled
**Should be:** 🔄
- If merging: Merge all, show summary
- If blocking: Show which ones exist, skip those
- Dialog: "2 of 4 folders exist. [Merge All] [Skip Conflicts] [Cancel]"

**Decision needed:** Same as A3

---

### A5. Upload large number of files that already exist (e.g., 50 files, 30 conflicts)
**Current:** ❌ Not handled
**Should be:** 🔄
- Dialog: "30 of 50 files already exist. What would you like to do?"
  - [Replace All Conflicts] - Overwrite all 30
  - [Skip All Conflicts] - Upload only the 20 new ones
  - [Cancel Upload] - Upload nothing

**Decision needed:** Approve?

---

## B. DRAG & DROP SCENARIOS (Normal Mode - No Move Active)

### B1. Drag & drop file that already exists
**Current:** ❌ Not handled - overwrites
**Should be:** Same as A1

---

### B2. Drag & drop multiple files where 1 or 2 already exist
**Current:** ❌ Not handled
**Should be:** Same as A2

---

### B3. Drag & drop directory that already exists
**Current:** ❌ Not handled
**Should be:** Same as A3

---

### B4. Drag & drop multiple directories where 1 or 2 already exist
**Current:** ❌ Not handled
**Should be:** Same as A4

---

## C. UPLOAD IN MOVE MODE (Picked Up State)

### C1. Upload file that already exists AND is in pickup list
**Current:** ⚠️ Partially handled
- If inside picked-up folder: ✅ Blocked with alert
- If same file in different location: ❌ Not handled

**Should be:**
- **BLOCK** - Can't modify files being moved
- Alert: "Cannot upload 'file.txt' - this file is currently being moved"

---

### C2. Upload file that already exists and is inside a picked-up directory
**Current:** ✅ Blocked
- Upload buttons disabled
- Drag & drop shows alert

**Status:** ✅ Correct behavior

---

### C3. Upload file that already exists (outside of pickup list)
**Current:** ❌ Not handled
**Should be:** Same as A1 (normal upload conflict handling)

---

### C4. Upload directory that already exists AND is picked up
**Current:** ⚠️ Partially handled
**Should be:**
- **BLOCK** - Can't modify directories being moved
- Alert: "Cannot upload 'folderA' - this folder is currently being moved"

---

### C5. Upload directory that is inside a picked-up directory
**Current:** ✅ Blocked
**Status:** ✅ Correct behavior

---

### C6. Upload directory that already exists (outside of pickup list)
**Current:** ❌ Not handled
**Should be:** Same as A3 (normal upload conflict handling)

---

## D. MOVE/DROP SCENARIOS (In Move Mode)

### D1. Drop in same folder where we picked up originally
**Current:** ✅ Blocked
- "Drop Here" button disabled (grayed out)
- `currentPath === moveSourcePath` check

**Status:** ✅ Correct behavior

---

### D2. Drop in folder that is picked up
**Current:** ✅ Blocked
- "Drop Here" button disabled
- `isInsideMovedFolder()` check

**Status:** ✅ Correct behavior

---

### D3. Drop in subfolder of folder that is picked up
**Current:** ✅ Blocked
- "Drop Here" button disabled
- `currentPath.startsWith(itemPath + '/')` check

**Status:** ✅ Correct behavior

---

### D4. Drop in allowed location, but there are conflicting files
**Current:** ⚠️ Partial
- Backend returns error per file
- Frontend shows combined message
- All conflicts are **skipped**

**Current behavior:**
```
3 item(s) moved successfully.

2 item(s) failed:
• file1.txt: Item already exists in destination
• file2.txt: Item already exists in destination
```

**Should be:** 🔄
- Option 1 (Current): Skip conflicts, move non-conflicts
- Option 2: Show dialog before move
  ```
  2 items already exist in destination:
  • file1.txt
  • file2.txt

  [Replace Conflicts] [Skip Conflicts] [Cancel Move]
  ```

**Decision needed:** Pre-check and ask, or post-error report?

---

### D5. Drop in allowed location, but there are conflicting directories
**Current:** ⚠️ Same as D4
- Skips conflicting directories
- Does not merge

**Should be:** 🔄
- Option 1: Skip (current)
- Option 2: Merge directories, handle file conflicts inside
- Option 3: Pre-check and ask

**Decision needed:** Skip or merge? Pre-check?

---

## PROPOSED STANDARDIZED BEHAVIOR

### Simple Approach (Recommended for MVP):
1. **All upload conflicts → AUTO-RENAME**
   - file.txt exists → upload as "file (1).txt"
   - No dialogs, seamless UX
   - Works for files and directories

2. **All move conflicts → SKIP**
   - Show detailed error message
   - User can rename manually and try again
   - Prevents accidental overwrites

### Advanced Approach (Future Enhancement):
1. **Upload conflicts → DIALOG**
   - Single file: [Replace] [Rename] [Cancel]
   - Multiple files: [Replace All] [Rename All] [Skip Conflicts] [Cancel]

2. **Move conflicts → DIALOG**
   - Pre-check destination
   - Show conflicts before move
   - [Replace] [Merge (folders)] [Skip] [Cancel]

---

## QUESTIONS TO ANSWER

1. **Upload file that exists:** Overwrite, rename, or ask?
2. **Upload directory that exists:** Merge contents or block?
3. **Move conflicts:** Pre-check or post-error?
4. **Large batch conflicts:** Need "Replace All" / "Skip All"?
5. **Directory merging:** Support it or keep it simple?

---

## RECOMMENDATION

**Phase 1 (Now):** Simple & Safe
- ✅ Uploads: Auto-rename conflicts (file → file (1))
- ✅ Moves: Skip conflicts, show error
- ✅ Block operations inside moved folders

**Phase 2 (Later):** Advanced
- Add conflict dialogs with options
- Support folder merging
- Batch operations (Replace All / Skip All)

**This gives us:**
- No data loss
- Predictable behavior
- Simple implementation
- Room to add features later
