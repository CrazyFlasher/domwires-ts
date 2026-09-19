import {AbstractHierarchyObject} from "../../../src";
import {HudMutable} from "../contracts";
import {HUD_CHANGED} from "../messages";

export class HudModel extends AbstractHierarchyObject implements HudMutable
{
    public lastLoaded = "—";
    public loads = 0;

    public update(level: string): void
    {
        this.lastLoaded = level;
        this.loads++;

        this.dispatchMessage(HUD_CHANGED);
    }
}
