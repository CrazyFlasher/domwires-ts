import {AbstractHierarchyObject, postConstruct, inject} from "../../../src";
import {HUD_MODEL_IMMUTABLE} from "../contracts";
import {HUD_CHANGED} from "../messages";
import {MOUNT} from "./ViewTokens";

export class HudView extends AbstractHierarchyObject
{
    @inject(MOUNT)
    private mount!: HTMLElement;

    @inject(HUD_MODEL_IMMUTABLE)
    private model!: {readonly lastLoaded: string; readonly loads: number};

    private label!: HTMLElement;

    @postConstruct()
    private init(): void
    {
        this.label = document.createElement("p");
        this.label.className = "hud-status";

        this.mount.append(this.label);
        this.subscribe(HUD_CHANGED, () => this.render());

        this.render();
    }

    private render(): void
    {
        this.label.textContent = "HUD · Completed loads: " + this.model.loads +
            " · Last level: " + this.model.lastLoaded;
    }

    public override dispose(): void
    {
        this.label?.remove();

        super.dispose();
    }
}
