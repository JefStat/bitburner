/** Alias for document to prevent excessive RAM use */
const doc = eval('document') as Document;

/**
 * Returns the full command line for the current process, which is also the title of the tail modal
 */
export function getCommandLine(ns: NS) {
    return ns.getScriptName() + ' ' + ns.args.join(' ');
}

/**
 * Tries to find the tail modal for this process
 */
export function getTailModal(ns: NS) {
    const commandLine = getCommandLine(ns);
    const modals = doc.querySelectorAll(`.drag > h6`);
    const tailTitleEl = Array.from(modals).find(x => x.textContent!.includes(commandLine));
    return tailTitleEl?.parentElement!.parentElement!.nextSibling;
}

/**
 * Creates a custom container inside a tail modal to use for rendering custom DOM.
 * If the container has already been created, the existing container will be returned.
 */
export function getCustomModalContainer(ns: NS): HTMLDivElement | undefined {
    const id = getCommandLine(ns).replace(/[^\w\.]/g, '_');
    let containerEl = doc.getElementById(id) as HTMLDivElement | null;
    if (!containerEl) {
        const modalEl = getTailModal(ns);
        if (!modalEl) {
            return undefined;
        }
        containerEl = doc.createElement('div');
        containerEl.id = id;
        containerEl.style.fontFamily = 'monospace';
        containerEl.style.fontWeight = '400';
        containerEl.style.position = 'absolute';
        containerEl.style.overflow = 'auto';
        containerEl.style.left = '0';
        containerEl.style.right = '0';
        containerEl.style.top = '34px';
        containerEl.style.bottom = '0';
        containerEl.style.background = 'black';
        containerEl.style.color = 'rgb(0, 204, 0)';
        modalEl.insertBefore(containerEl, modalEl.firstChild);
    }
    return containerEl;
}

/**
 * Render a custom modal with react
 * 
 * @example
 * renderCustomModal(ns,
 *   <div>
 *     Hello world!
 *   </div>
 * );
 */
export default function renderCustomModal(ns: NS, element: React.ReactElement) {
    const container = getCustomModalContainer(ns);
    if (!container) {
        return;
    }
    window.ReactDOM.render(element, container);
}

/**
 * Simple event queue for event handlers which need to call netscript functions
 * 
 * @example
 * // Render custom modal
 * renderCustomModal(ns,
 *   <div>
 *     <button onClick={eventQueue.wrap(event => ns.killall())}>Kill all scripts</button>
 *   </div>
 * );
 * // Execute all events which have been triggered since last invocation of executeEvents
 * await eventQueue.executeEvents();
 */
export class EventHandlerQueue {

    private queue: (() => void | Promise<unknown>)[] = [];

    public wrap<T extends (...args: any[]) => any>(fn: T) {
        return ((...args: Parameters<T>) => {
            if (args[0] && typeof args[0] === 'object' && typeof args[0].persist === 'function') {
                args[0].persist();
            }
            this.queue.push(() => fn(...args));
        });
    }

    public async executeEvents() {
        const events = this.queue;
        this.queue = [];
        for await (const event of events) {
            await event();
        }
    }
}

/**
 * Template-String function which does nothing else than concatenating all parts.
 * This function can be used in editors like VSCode to get syntax highlighting & more for inline CSS strings
 * 
 * @example
 * 
 * <style children={css`
 *     .myClass {
 *         color: red;
 *     }
 * `} />
 */
export function css(parts: TemplateStringsArray, ...params: any[]): string {
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
        result += params[i - 1] + parts[i];
    }
    return result;
}
