// file interfaces.ts

export interface Warrior {
    fight(): string;
    sneak(): string;
}

export interface Weapon {
    hit(): string;
}

export interface ThrowableWeapon {
    throw(): string;
}

// file types.ts

const TYPES = {
    Warrior: Symbol.for("Warrior"),
    Weapon: Symbol.for("Weapon"),
    ThrowableWeapon: Symbol.for("ThrowableWeapon")
};

export { TYPES };

// file entities.ts

import {injectable, inject, postConstruct, optional} from "inversify";
import "reflect-metadata";

@injectable()
class Katana implements Weapon {
    public hit() {
        return "cut!";
    }
}

@injectable()
class Shuriken implements ThrowableWeapon {
    public throw() {
        return "hit!";
    }
}

@injectable()
class Ninja implements Warrior {

    @inject(TYPES.Weapon) private _katana: Weapon;
    @inject(TYPES.ThrowableWeapon) private _shuriken: ThrowableWeapon;
    @inject("Array<number>") private values: Array<number>;
    @inject("4mo") @optional() private lastName: string;
    @inject("Huj") @optional() private firstName: string;

    @postConstruct()
    private init():void
    {
        console.log("init!");
    }

    public fight() { return this._katana.hit(); }
    public sneak() { return this._shuriken.throw(); }

    public getValues():Array<number>
    {
        return this.values;
    }

    public getLastName():string
    {
        return this.lastName;
    }

    public getFirstName():string
    {
        return this.firstName;
    }
}

export { Ninja, Katana, Shuriken };