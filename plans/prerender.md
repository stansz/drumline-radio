# Pre-render plan (on hold)

An idea for background play, not built yet.

## Problem

Songs are synthesised live with Web Audio. When the phone locks or the app goes to the background,
playback stops, and there are no lock-screen controls. Sending the live output through a
MediaStream to an audio element with Media Session was tried and reverted: on a Pixel 9a it stopped
at random, was choppy, and showed no notification.

## Idea

Render each song ahead of time with `OfflineAudioContext`, using the same voices and mixer as live
play. Wrap the result as a WAV blob and play it through a normal `<audio>` element with Media Session
(title, artwork, play/pause/next/previous). Browsers treat that like any music player, so it keeps
playing in the background and shows lock-screen controls on Android and iPhone.

A download button ("save song") would be a small extra on top of this.

## Quality

The same or a little better than live. Offline rendering runs the same synth code without
real-time timing, so it can't glitch or click.

## Trade-offs

- **Wait before play:** each song has to render before it starts, probably a few seconds on a phone
  for a 4-minute track. Options: render the first section first and keep rendering behind it, render
  the next song while the current one plays, or cache songs that have been rendered.
- **Memory and storage:** a 4-minute stereo song is about 45 MB as 16-bit WAV, and about double that
  while rendering. Browsers can't save MP3 or AAC directly (`MediaRecorder` only records in real
  time), so caching many songs takes a lot of space unless an encoder is added.
- **Changes need a re-render:** switching style or changing the mixer takes effect after a short
  re-render, not instantly.

## Other options considered

1. Pre-render (this plan): recommended first.
2. Wrap the PWA as an Android app (a Trusted Web Activity built with Bubblewrap, plus a $25 Google
   Play developer account).
3. A native rewrite: not recommended.
