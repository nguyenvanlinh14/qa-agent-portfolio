// Soft morphing blob behind the index summary bar (decorative, low opacity, see liquid.js for the motion rules).
export function initSummaryBlob(addBlobs) {
  const a = document.getElementById('sum-b1');
  const b = document.getElementById('sum-b2');
  if (!a || !b) return;
  addBlobs([
    { el: a, cx: 120, cy: 70, r: 85, amp: 0.25 },
    { el: b, cx: 470, cy: 90, r: 75, amp: 0.25 },
  ]);
}
