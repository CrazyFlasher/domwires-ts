import {gameResources} from "../gameResources";

export class Bullet
{
    public active = false;
    public x = 0;
    public y = 0;

    public constructor()
    {
        gameResources.bullets++;
    }

    public dispose(): void
    {
        gameResources.bullets--;
    }
}
