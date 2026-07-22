import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Isolate an in-app modal, trap keyboard focus, and restore focus on close. */
export function useModalFocus<T extends HTMLElement>(
  onClose: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const modal = ref.current;
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const siblings = modal.parentElement
      ? [...modal.parentElement.children].filter((child) => child !== modal)
      : [];
    const prior = siblings.map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const sibling of siblings) {
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }

    const focusable = () => [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (
      modal.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0]
    )?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener("keydown", onKeyDown);

    return () => {
      modal.removeEventListener("keydown", onKeyDown);
      for (const item of prior) {
        if (!item.inert) item.element.removeAttribute("inert");
        if (item.ariaHidden === null)
          item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
      previous?.focus();
    };
  }, []);

  return ref;
}
