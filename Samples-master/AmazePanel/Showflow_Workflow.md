# Showflow Workflow & Integrity Check

This document outlines the workflow for creating, editing, and rendering sequences using the Showflow system, ensuring data integrity between the planned structure and the final render.

## 1. Setup & Initialization
1.  **Create Showflow File**: Start with a template Showflow JSON file.
    *   Define basic structure (FPS, Tracks).
    *   Define initial slots (optional, or empty).
2.  **Build Test Scene**:
    *   Run `07_BuildTestScene.jsx`.
    *   This script reads the Showflow JSON and builds a sequence with placeholder clips.
    *   **Purpose**: Verify that the Showflow file is valid and the sequence structure is created correctly.

## 2. Manual Editing
*   **Action**: Editors work on the sequence.
*   **Key Task**: Assign Clip Names to Markers.
    *   Markers define the "Slots" or segments.
    *   Marker Name = Clip Name (used for filename during render).
    *   Adjust timing of markers if necessary (though this changes the structure).

## 3. Update Showflow (Sync)
*   **Script**: `09_UpdateShowflowFromTimeline.jsx` (or `09_UpdateShowflow_temp.jsx`)
*   **Action**:
    1.  Scans the current sequence.
    2.  Reads Markers to define Slots.
    3.  Reads Clips on tracks to get details (Name, Duration, In, Out).
    4.  **Updates** the original Showflow JSON with this new "As-Built" data.
*   **Result**: The Showflow JSON now reflects the actual edited sequence (Marker positions, Clip names).

## 4. Rendering with Integrity Check
*   **Script**: `11_Queue_Markers_To_AME.jsx`
*   **Process**:
    1.  **Load Showflow JSON**: The script must load the corresponding Showflow file for the sequence.
    2.  **Integrity Check**: Before queuing any segment, compare the Timeline Marker against the Showflow JSON.
        *   **Position Check**: Does `Marker.Start` match `Slot.Time`?
        *   **Name Check**: Does `Marker.Name` match the expected Clip Name in the Slot?
    3.  **Validation**:
        *   If **Match**: Proceed to queue.
        *   If **Mismatch**: Alert the user (stop or skip).
    4.  **Partial Render & Clean Up**:
        *   **Range Selection**: If you set In/Out points on the timeline, the script will only process markers within that range.
        *   **Clean Sequence**: When a range is detected, the script will ask: *"Clean Sequence?"*
            *   **Yes**: It will **REMOVE** all clips outside the selected range (with a 1-frame margin). This is recommended for large projects (e.g., thousands of image sequences) to speed up processing.
            *   **No**: It proceeds to queue without modifying the timeline.
        *   **Integrity Check**: Even with partial render, the integrity check is performed for the markers in range.

## 5. Development Tasks
- [x] `07_BuildTestScene.jsx`: Existing and functional.
- [x] `09_UpdateShowflow_temp.jsx`: Existing, needs verification of "Update" logic.
- [ ] `11_Queue_Markers_To_AME.jsx`: **Needs Update**.
    - [ ] Add JSON loading logic.
    - [ ] Implement `validateIntegrity(marker, slot)` function.
    - [ ] Integrate check into the rendering loop.
