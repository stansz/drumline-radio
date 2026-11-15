// BS.1770-4 gated loudness (LUFS-style) over part of a K-weighted signal: how loud a part sounds
// while it plays. A whole-section average counts the silence between notes, so a sparse part (a
// pizzicato counter-line, a stab every few bars) reads tens of dB low and hides a part that is
// genuinely too quiet; gating the blocks that only hold silence keeps the measurement on the
// playing itself. This function is injected into the balance check's page code with its own
// `toString()`, so it must use only its arguments, `Math`, and local variables: no imports, no
// outer bindings.
//   gatedLoudness(data, from, to, rate) -> LUFS over data[from..to) (`to` exclusive)
export function gatedLoudness(data, from, to, rate) {
  const block = Math.round(0.4 * rate); // 400 ms
  const step = Math.round(0.1 * rate); // 100 ms
  const n = Math.max(0, to - from);
  const zs = [];
  if (n < block) {
    // A range shorter than one block is measured as it is, as a single block.
    let sq = 0;
    for (let i = from; i < to; i += 1) sq += data[i] * data[i];
    zs.push(sq / Math.max(1, n));
  } else {
    for (let s = from; s + block <= to; s += step) {
      let sq = 0;
      for (let i = s; i < s + block; i += 1) sq += data[i] * data[i];
      zs.push(sq / block);
    }
  }
  const loud = (z) => (z > 0 ? -0.691 + 10 * Math.log10(z) : -Infinity);
  // Absolute gate: drop the blocks too quiet to hear at all (BS.1770's -70 LUFS gate).
  const abs = zs.filter((z) => loud(z) > -70);
  if (abs.length === 0) return -120;
  // Relative gate: drop the blocks more than 10 dB under the absolute-gated mean, so silence
  // between notes cannot pull the result down.
  const meanAbs = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = -0.691 + 10 * Math.log10(meanAbs) - 10;
  const kept = abs.filter((z) => loud(z) > rel);
  if (kept.length === 0) return -120;
  const mean = kept.reduce((a, b) => a + b, 0) / kept.length;
  return -0.691 + 10 * Math.log10(mean);
}
