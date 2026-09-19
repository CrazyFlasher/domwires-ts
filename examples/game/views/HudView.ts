export type HudViewState = {
    readonly lastLoaded: string;
    readonly loads: number;
};

export interface IHudView
{
    render(state: HudViewState): void;

    dispose(): void;
}

export class HudView implements IHudView
{
    private readonly label: HTMLElement;

    public constructor(mount: HTMLElement)
    {
        this.label = mount.ownerDocument.createElement("p");
        this.label.className = "hud-status";
        mount.append(this.label);
    }

    public render(state: HudViewState): void
    {
        this.label.textContent = "HUD · Completed loads: " + state.loads +
            " · Last level: " + state.lastLoaded;
    }

    public dispose(): void
    {
        this.label.remove();
    }
}
