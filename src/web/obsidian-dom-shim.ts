/**
 * Obsidian DOM shim for browser runtime.
 * Implements the helper methods Obsidian attaches to HTMLElement / Element prototype.
 */

export function setupObsidianDomShim(): void {
  const elProto = Element.prototype as any;
  const htmlProto = HTMLElement.prototype as any;

  if (!elProto.empty) {
    elProto.empty = function (this: Element): void {
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
      this.textContent = "";
    };
  }

  if (!elProto.addClass) {
    elProto.addClass = function (this: Element, ...classes: string[]): void {
      for (const cls of classes) {
        if (cls) this.classList.add(...cls.split(/\s+/).filter(Boolean));
      }
    };
  }

  if (!elProto.removeClass) {
    elProto.removeClass = function (this: Element, ...classes: string[]): void {
      for (const cls of classes) {
        if (cls) this.classList.remove(...cls.split(/\s+/).filter(Boolean));
      }
    };
  }

  if (!elProto.hasClass) {
    elProto.hasClass = function (this: Element, cls: string): boolean {
      return this.classList.contains(cls);
    };
  }

  if (!elProto.toggleClass) {
    elProto.toggleClass = function (this: Element, cls: string, force?: boolean): boolean {
      return this.classList.toggle(cls, force);
    };
  }

  if (!elProto.setText) {
    elProto.setText = function (this: Element, text: string): void {
      this.textContent = text;
    };
  }

  if (!elProto.getText) {
    elProto.getText = function (this: Element): string {
      return this.textContent || "";
    };
  }

  if (!elProto.setAttr) {
    elProto.setAttr = function (this: Element, key: string, value: string): void {
      this.setAttribute(key, value);
    };
  }

  if (!elProto.getAttr) {
    elProto.getAttr = function (this: Element, key: string): string | null {
      return this.getAttribute(key);
    };
  }

  if (!elProto.createEl) {
    elProto.createEl = function (
      this: Element,
      tag: string,
      options?: {
        text?: string;
        cls?: string;
        attr?: Record<string, string>;
        value?: string;
        title?: string;
        type?: string;
      }
    ): HTMLElement {
      const el = document.createElement(tag);
      if (options?.text !== undefined) {
        el.textContent = options.text;
      }
      if (options?.cls) {
        el.className = options.cls;
      }
      if (options?.title) {
        el.title = options.title;
      }
      if (options?.type && "type" in el) {
        (el as any).type = options.type;
      }
      if (options?.value && "value" in el) {
        (el as any).value = options.value;
      }
      if (options?.attr) {
        for (const [k, v] of Object.entries(options.attr)) {
          el.setAttribute(k, v);
        }
      }
      this.appendChild(el);
      return el;
    };
  }

  if (!elProto.createDiv) {
    elProto.createDiv = function (
      this: Element,
      options?: { text?: string; cls?: string }
    ): HTMLDivElement {
      return this.createEl("div", options) as HTMLDivElement;
    };
  }

  if (!elProto.createSpan) {
    elProto.createSpan = function (
      this: Element,
      options?: { text?: string; cls?: string }
    ): HTMLSpanElement {
      return this.createEl("span", options) as HTMLSpanElement;
    };
  }
}
