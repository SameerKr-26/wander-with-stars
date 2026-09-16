/**
 * <dialog> polyfill for jsdom.
 *
 * jsdom 30 parses `<dialog>` but implements none of its behaviour —
 * `showModal`/`close` are simply absent (verified: `HTMLDialogElement.prototype.showModal`
 * is `undefined`). components/ui/dialog.tsx (Dialog, Drawer) relies on the
 * real browser behaviour — showModal() opening the dialog and moving focus
 * in, close() restoring focus to whatever was focused before, and Escape
 * dismissing an open modal — so without this shim every test that opens a
 * Dialog/Drawer throws immediately.
 *
 * This reproduces just enough of the spec for that component to be testable:
 * open/close state, a 'close' event on close(), focus restoration, and
 * Escape-to-dismiss for the topmost open dialog. It intentionally does not
 * implement inert-background focus trapping — nothing in this codebase's
 * tests depends on that.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  const previouslyFocused = new WeakMap<HTMLDialogElement, Element | null>();

  HTMLDialogElement.prototype.show = function (this: HTMLDialogElement) {
    this.open = true;
  };

  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    previouslyFocused.set(this, document.activeElement);
    this.open = true;
    this.setAttribute('open', '');

    const focusTarget =
      this.querySelector<HTMLElement>('[autofocus]') ??
      this.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]');
    (focusTarget ?? this).focus();
  };

  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return;
    this.open = false;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;

    const toRestore = previouslyFocused.get(this);
    previouslyFocused.delete(this);
    this.dispatchEvent(new Event('close'));
    if (toRestore instanceof HTMLElement) toRestore.focus();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openDialogs = document.querySelectorAll('dialog[open]');
    const top = openDialogs[openDialogs.length - 1];
    if (top instanceof HTMLDialogElement) {
      event.preventDefault();
      top.close();
    }
  });
}
