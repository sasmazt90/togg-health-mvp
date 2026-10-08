# Skin research third-party notices (2026-10-08)

The product remains UNLICENSED. These notices do not relicense our application.
No SCIN photograph, metadata row, trained weight, or skin-scan implementation is
bundled in the product or committed. Research artifacts live in ignored audit-results.

- Google/Stanford Skin Condition Image Network (SCIN): revision
  b5a498233ef23b24c2f9fdb41b53e162c6eeb98d, custom SCIN Data Use License.
  Source https://github.com/google-research-datasets/scin/tree/b5a498233ef23b24c2f9fdb41b53e162c6eeb98d
  Full license: third-party/skin-research/scin-LICENSE.txt. Royalty-free reproduction
  and adaptation subject to attribution, license retention, modification notices,
  no downstream restrictions and strictly no subject re-identification/re-linking.
  No Google/Stanford endorsement. Research metadata/crops are adaptations.
  For these local research weights we preserve this Data Use License as a conservative
  distribution policy; they remain private, and no product weights are distributed.
  Rights in images/data, our training code, and derived weights are recorded separately.
- DurtyDhiana/skin-scan: revision afc55f5cb87fcc644f36b472c37083b254bd3fe4,
  MIT, Copyright (c) 2025, full notice third-party/skin-research/skin-scan-LICENSE.txt.
  Source https://github.com/DurtyDhiana/skin-scan/tree/afc55f5cb87fcc644f36b472c37083b254bd3fe4
  Only pinned oiliness.py is executed offline for the engineering baseline.
  It is not scientifically calibrated ground truth and hydration is not used.
- OpenCV 4.12.0 core Apache-2.0; opencv-python 4.12.0.88 wrapper MIT;
  Haar frontal-face data BSD/Intel notice. Installed wheel third-party notices
  (including FFmpeg LGPL components) are retained separately. Used only in local
  research, not added to the shipped API/runtime. Commercial use requires the
  retained notices and applicable license obligations, not a blanket waiver.
- NumPy 2.2.6 BSD-3-Clause and its retained bundled notices; PyTorch 2.9.1 BSD-style
  and retained third-party notices; Pillow 12.0.0 HPND. Exact installed license texts
  and SHA256s are under third-party/skin-research and sources.json.
- scikit-image 0.26.0 license reviewed (BSD with mixed permissive notices), retained
  as an alternative source. It is not used in this implementation or installed anew.

Exact code revisions, license hashes, official source links and the Haar model hash
are in third-party/skin-research/sources.json. No pretrained skin model is used.
The existing licensed three-angle video is controlled engineering evidence only;
its unchanged attribution is retained in the existing fixture notices.

- Existing MediaPipe Tasks Vision 1.0.1 is reused only for research geometry.
  Official Face Landmarker documentation links FaceDetector, FaceMesh-V2 and
  Blendshape model cards, each stating Apache-2.0; exact SDK/task hashes and card
  URLs/hashes are recorded separately in sources.json. Full Apache license is
  retained. This does not make landmark geometry a clinical label or certify
  whole-face acne. No extra model or weights are installed in the product.
