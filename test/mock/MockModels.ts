/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractModel} from "../../src";
import {MockMessageType, MockMessageType2} from "./MockMessageType";
import {inject, injectable, named} from "inversify";
import {definableFromString, setDefaultImplementation} from "../../src";

export type MockTypeDef = {
    readonly a: string;
    readonly b: number;
};

export class MockModel0 extends AbstractModel
{
    @inject("number")
    private n1!: number;

    @inject("number") @named("n2")
    private n2!: number;
}

export class MockModel1 extends AbstractModel
{

}

export class MockModel2 extends AbstractModel
{
    public testVar = 0;
}

export class MockModel3 extends AbstractModel
{
    public testVar = 0;
}

export class MockModel4 extends AbstractModel
{
    private _testVar = 0;

    public get testVar(): number
    {
        return this._testVar;
    }

    public set testVar(value: number)
    {
        this._testVar = value;

        this.dispatchMessage(MockMessageType.GOODBYE);
    }
}

export class MockModel6 extends AbstractModel
{
    public v = 0;

    public override addedToHierarchy(): void
    {
        super.addedToHierarchy();

        this.dispatchMessage(MockMessageType2.HELLO);
    }
}

export interface IDefault
{
    get result(): number;
}

export interface ISuperCoolModel
{
    get getMyBool(): boolean;

    get getCoolValue(): number;

    get value(): number;

    get def(): IDefault;

    get object(): any;

    get array(): string[];
}

@injectable()
export class Default implements IDefault
{
    public get result(): number
    {
        return 123;
    }
}

/* eslint-disable @typescript-eslint/no-inferrable-types */
// need to define type for injection from config
export class SuperCoolModel extends AbstractModel implements ISuperCoolModel
{
    @inject("boolean") @named("myBool")
    private _myBool: boolean = true;

    @inject("number") @named("coolValue")
    private _coolValue!: number;

    @inject("number")
    private _value!: number;

    @inject("IDefault") @named("def")
    private _def!: IDefault;

    @inject("any") @named("obj")
    private _object!: any;

    @inject("string[]")
    private _array!: string[];

    public get getMyBool(): boolean
    {
        return this._myBool;
    }

    public get getCoolValue(): number
    {
        return this._coolValue;
    }

    public get value(): number
    {
        return this._value;
    }

    public get def(): IDefault
    {
        return this._def;
    }

    public get object(): any
    {
        return this._object;
    }

    public get array(): string[]
    {
        return this._array;
    }
}

export class MockAsyncModel extends AbstractModel
{
    public timePassed = 0;
    public completeCount = 0;
}

definableFromString<SuperCoolModel>(SuperCoolModel);
definableFromString<Default>(Default);
setDefaultImplementation<ISuperCoolModel>("ISuperCoolModel", SuperCoolModel);
setDefaultImplementation<IDefault>("IDefault", Default);