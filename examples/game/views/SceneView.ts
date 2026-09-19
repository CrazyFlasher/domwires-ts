import {AbstractHierarchyObject, postConstruct, inject} from "../../../src";
import {SCENE_MODEL_IMMUTABLE, SceneModelImmutable} from "../contracts";
import {STATE_CHANGED} from "../messages";
import {MOUNT} from "./ViewTokens";

export class SceneView extends AbstractHierarchyObject
{
    @inject(MOUNT)
    private mount!: HTMLElement;

    @inject(SCENE_MODEL_IMMUTABLE)
    private model!: SceneModelImmutable;

    private canvas!: HTMLCanvasElement;
    private label!: HTMLElement;

    @postConstruct()
    private init(): void
    {
        this.label = document.createElement("p");
        this.label.className = "scene-status";

        this.canvas = document.createElement("canvas");
        this.canvas.width = 640;
        this.canvas.height = 260;
        this.canvas.setAttribute("aria-label", "Scene playfield");

        this.mount.append(this.label, this.canvas);
        this.subscribe(STATE_CHANGED, () => this.render());

        this.render();
    }

    private render(): void
    {
        this.label.textContent = "Scene " + this.model.scene + " · " + this.model.level +
            " · Shots: " + this.model.shots + " · Active: " + this.model.bullets.length +
            "/12 · Ticks: " + this.model.ticks;

        const ctx = this.canvas.getContext("2d")!;

        ctx.fillStyle = this.model.scene === "A" ? "#142d3b" : "#302947";
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

        for (const bullet of this.model.bullets)
        {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    public override dispose(): void
    {
        this.canvas?.remove();
        this.label?.remove();

        super.dispose();
    }
}
