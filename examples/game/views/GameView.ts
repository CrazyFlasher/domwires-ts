export type GameInput = "fire" | "step" | "pause" | "loadSlow" | "loadFast" |
    "switchScene" | "trace" | "restart" | "close";

export interface IGameView
{
    onInput?: (input: GameInput) => void;

    setStatus(value: string): void;

    setRestarting(value: boolean): void;

    renderTrace(lines: readonly string[]): void;

    dispose(): void;
}

/** Owns DOM input and rendering. Callbacks carry UI intentions, not framework messages. */
export class GameView implements IGameView
{
    public onInput?: (input: GameInput) => void;
    private readonly status: HTMLElement;
    private readonly trace: HTMLElement;
    private readonly restart: HTMLButtonElement;
    private readonly buttons: HTMLButtonElement[] = [];
    private readonly listeners: Array<() => void> = [];

    public constructor(document: Document)
    {
        this.status = document.querySelector<HTMLElement>("#status")!;
        this.trace = document.querySelector<HTMLElement>("#trace")!;
        this.restart = document.querySelector<HTMLButtonElement>("#restart")!;

        const toolbar = document.querySelector<HTMLElement>("#controls")!;
        const controls: ReadonlyArray<readonly [string, GameInput]> = [
            ["Fire", "fire"],
            ["Step", "step"],
            ["Pause / resume", "pause"],
            ["Load slow", "loadSlow"],
            ["Load fast", "loadFast"],
            ["Switch scene", "switchScene"],
            ["Trace on / off", "trace"]
        ];

        for (const [label, input] of controls)
        {
            const button = document.createElement("button");

            button.textContent = label;
            this.listen(button, "click", () => this.onInput?.(input));
            this.buttons.push(button);
            toolbar.append(button);
        }

        this.listen(this.restart, "click", () => this.onInput?.("restart"));
        this.listen(document.defaultView!, "pagehide", () => this.onInput?.("close"));
        this.setRestarting(false);
    }

    private listen(target: EventTarget, type: string, listener: () => void): void
    {
        target.addEventListener(type, listener);
        this.listeners.push(() => target.removeEventListener(type, listener));
    }

    public setStatus(value: string): void
    {
        this.status.textContent = value;
    }

    public setRestarting(value: boolean): void
    {
        this.restart.disabled = value;

        for (const button of this.buttons)
        {
            button.disabled = value;
        }
    }

    public renderTrace(lines: readonly string[]): void
    {
        this.trace.textContent = lines.join("\n");
        this.trace.scrollTop = this.trace.scrollHeight;
    }

    public dispose(): void
    {
        this.onInput = undefined;

        for (const remove of this.listeners.splice(0))
        {
            remove();
        }

        for (const button of this.buttons.splice(0))
        {
            button.remove();
        }
    }
}
