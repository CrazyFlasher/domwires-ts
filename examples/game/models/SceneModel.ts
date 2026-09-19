import {AbstractHierarchyObject, IFactory} from "../../../src";
import {BulletView, SceneModelMutable, SCENE_NAME} from "../contracts";
import {LEVEL_LOADED, STATE_CHANGED} from "../messages";
import {Bullet} from "./Bullet";

export class SceneModel extends AbstractHierarchyObject implements SceneModelMutable
{
    public static readonly inject = ["IFactory", SCENE_NAME];

    private readonly pool: IFactory;
    private readonly active: Bullet[] = [];
    private tickCount = 0;
    private shotCount = 0;
    private levelName = "No level loaded";

    public constructor(factory: IFactory, public readonly scene: string)
    {
        super();

        this.pool = factory.createScope();
        this.pool.registerPool(Bullet, 12, true, "active");
    }

    public get level(): string
    {
        return this.levelName;
    }

    public get ticks(): number
    {
        return this.tickCount;
    }

    public get shots(): number
    {
        return this.shotCount;
    }

    public get bullets(): readonly BulletView[]
    {
        return this.active.map(({x, y}) => ({x, y}));
    }

    public fire(): void
    {
        if (this.active.length >= 12)
        {
            return;
        }

        const bullet = this.pool.getInstance(Bullet);

        bullet.active = true;
        bullet.x = 32;
        bullet.y = 50 + (this.shotCount % 6) * 32;

        this.active.push(bullet);
        this.shotCount++;

        this.dispatchMessage(STATE_CHANGED);
    }

    public tick(delta: number): void
    {
        this.tickCount++;

        for (let i = this.active.length - 1; i >= 0; i--)
        {
            const bullet = this.active[i]!;

            bullet.x += delta * 240;

            if (bullet.x > 620)
            {
                bullet.active = false;
                this.active.splice(i, 1);
            }
        }

        this.dispatchMessage(STATE_CHANGED);
    }

    public loaded(level: string): void
    {
        this.levelName = level;

        this.dispatchMessage(STATE_CHANGED);
        this.dispatchMessage(LEVEL_LOADED, {level});
    }

    public override dispose(): void
    {
        this.active.length = 0;

        try
        {
            this.pool.dispose();
        }
        finally
        {
            super.dispose();
        }
    }
}
