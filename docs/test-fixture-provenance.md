# Test-fixture provenance

The generated `audit-fixtures/three-angle.y4m` and all derived screenshots are
CC BY-SA 4.0, attributed to NMu11er, **Head Shake** (3 March 2022):
https://commons.wikimedia.org/wiki/File:Head_Shake.webm
https://creativecommons.org/licenses/by-sa/4.0/

Changes: uniformly crop the source to 900x675 at x90/y190, scale to 640x480,
select three genuinely different source frames, and hold each frame for 15 seconds.
No rotation, texture enhancement, landmark replacement or pose mocking is used.
The source SHA-1 is pinned to `fb35a2ecbf0771ab818c2ca336142c30b515a414`.

`prepare_multi_angle_fixture.py` runs the production SkinAnalyzer and actual
MediaPipe on every sampled frame. `multi-angle-fixture-provenance.json` records
all pose/quality results; it must admit FRONT, anatomical RIGHT and LEFT without
lowering the existing quality thresholds. This proves software behavior with a
licensed controlled fixture. It does not prove clinical validity or vehicle hardware.
Generated media stays ignored and is never an application asset. CI evidence
containing these derived frames carries this attribution and license notice.
No private user face frame is saved by this workflow.
