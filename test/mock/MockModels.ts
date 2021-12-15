/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractModel} from "../../src";
import {MockMessageType, MockMessageType2} from "./MockMessageType";
import {inject, injectable, named} from "inversify";
import {definableFromString, setDefaultImplementation} from "../../src";

export type MockTypeDef = {
    readonly a: string;
    readonly b: number;
};

export class MockModel0<MessageDataType = any> extends AbstractModel<MessageDataType>
{
    @inject("number")
    private n1: number;

    @inject("number") @named("n2")
    private n2: number;
}

export class MockModel1<MessageDataType = any> extends AbstractModel<MessageDataType>
{

}

export class MockModel2<MessageDataType = any> extends AbstractModel<MessageDataType>
{
    public testVar = 0;
}

export class MockModel3<MessageDataType = any> extends AbstractModel<MessageDataType>
{
    public testVar = 0;
}

export class MockModel4<MessageDataType = any> extends AbstractModel<MessageDataType>
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

export class MockModel5<MessageDataType = any> extends AbstractModel<MessageDataType>
{
    public testVar: number;

    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }
}

export class MockModel6<MessageDataType = any> extends AbstractModel<MessageDataType>
{
    public v = 0;

    public override addedToHierarchy(): void
    {
        super.addedToHierarchy();

        this.dispatchMessage(MockMessageType2.HELLO);
    }
}

export class MockModel7<MessageDataType = any> extends AbstractModel<MessageDataType>
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

    // get value(): number;

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

export class SuperCoolModel<MessageDataType = any> extends AbstractModel<MessageDataType> implements ISuperCoolModel
{
    @inject("boolean") @named("myBool")
    public _myBool = true;

    @inject("number") @named("coolValue")
    public _coolValue: number;

    // @inject("number")
    // public _value: number;

    @inject("IDefault") @named("def")
    public _def: IDefault;

    @inject("any") @named("obj")
    public _object: any;

    @inject("string[]")
    public _array: string[];

    public get getMyBool(): boolean
    {
        return this._myBool;
    }

    public get getCoolValue(): number
    {
        return this._coolValue;
    }

    // get value(): number
    // {
    //     return this._value;
    // }

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

definableFromString(SuperCoolModel);
definableFromString(Default);
setDefaultImplementation("ISuperCoolModel", SuperCoolModel);
setDefaultImplementation("IDefault", Default);