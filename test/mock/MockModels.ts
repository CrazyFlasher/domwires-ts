import {AbstractModel} from "../../src/com/domwires/core/mvc/model/AbstractModel";
import {MockMessageType, MockMessageType2} from "./MockMessageType";
import {inject, named} from "inversify";

export type MockTypeDef = {
    readonly a: string;
    readonly b: number;
};

export class MockModel1 extends AbstractModel
{

}

export class MockModel2 extends AbstractModel
{
    public testVar: number = 0;
}

export class MockModel3 extends AbstractModel
{
    public testVar: number = 0;
}

export class MockModel4 extends AbstractModel
{
    private _testVar: number = 0;

    get testVar(): number
    {
        return this._testVar;
    }

    set testVar(value: number)
    {
        this._testVar = value;

        this.dispatchMessage(MockMessageType.GOODBYE);
    }
}

export class MockModel5 extends AbstractModel
{
    public testVar: number;

    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }
}

export class MockModel6 extends AbstractModel
{
    public v: number = 0;

    override addedToHierarchy(): void
    {
        super.addedToHierarchy();

        this.dispatchMessage(MockMessageType2.HELLO);
    }
}

export class MockModel7 extends AbstractModel
{
    @inject("MockTypeDef")
    private td: MockTypeDef;

    @inject("number")
    private i: number;

    public getTd(): MockTypeDef
    {
        return this.td;
    }

    public getI(): number
    {
        return this.i;
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

export class SuperCoolModel extends AbstractModel implements ISuperCoolModel
{
    @inject("boolean") @named("myBool")
    public _myBool: boolean = true;

    @inject("number") @named("coolValue")
    public _coolValue: number;

    @inject("number")
    public _value: number;

    @inject("IDefault") @named("def")
    public _def: IDefault;

    @inject("any") @named("obj")
    public _object: any;

    @inject("string[]")
    public _array: string[];

    get getMyBool(): boolean
    {
        return this._myBool;
    }

    get getCoolValue(): number
    {
        return this._coolValue;
    }

    get value(): number
    {
        return this._value;
    }

    get def(): IDefault
    {
        return this._def;
    }

    get object(): any
    {
        return this._object;
    }

    get array(): string[]
    {
        return this._array;
    }
}