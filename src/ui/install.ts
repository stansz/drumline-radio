interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function setupInstall(button: HTMLButtonElement): void {
  let deferred: InstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    const promptEvent = deferred;
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    deferred = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    button.hidden = true;
  });
}
