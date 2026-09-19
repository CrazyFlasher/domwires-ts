export type SceneViewState = {
    readonly scene: string;
    readonly level: string;
    readonly shots: number;
    readonly ticks: number;
    readonly bullets: readonly {readonly x: number; readonly y: number}[];
};

export interface ISceneView
{
    render(state: SceneViewState): void;

    dispose(): void;
}

export class SceneView implements ISceneView
{
    private readonly canvas: HTMLCanvasElement;
    private readonly label: HTMLElement;

    public constructor(mount: HTMLElement)
    {
        const document = mount.ownerDocument;

        this.label = document.createElement("p");
        this.label.className = "scene-status";

        this.canvas = document.createElement("canvas");
        this.canvas.width = 640;
        this.canvas.height = 260;
        this.canvas.setAttribute("aria-label", "Scene playfield");

        mount.append(this.label, this.canvas);
    }

    public render(state: SceneViewState): void
    {
        this.label.textContent = "Scene " + state.scene + " · " + state.level +
            " · Shots: " + state.shots + " · Active: " + state.bullets.length +
            "/12 · Ticks: " + state.ticks;

        const ctx = this.canvas.getContext("2d")!;

        ctx.fillStyle = state.scene === "A" ? "#142d3b" : "#302947";
        ctx.fillRect(0, 0, 640, 260);

        ctx.strokeStyle = "#ffffff0c";

        for (let x = 0; x <= 640; x += 32)
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 260);
            ctx.stroke();
        }

        ctx.fillStyle = "#77ddbc";
        ctx.beginPath();
        ctx.moveTo(12, 112);
        ctx.lineTo(48, 130);
        ctx.lineTo(12, 148);
        ctx.fill();

        ctx.fillStyle = "#ffd38c";

        for (const bullet of state.bullets)
        {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    public dispose(): void
    {
        this.canvas.remove();
        this.label.remove();
    }
}
