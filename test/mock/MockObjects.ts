import {inject, injectable, named, postConstruct} from "inversify";
import "reflect-metadata";
import {IDisposable} from "../../src/com/domwires/core/common/IDisposable";
import {AbstractDisposable} from "../../src/com/domwires/core/common/AbstractDisposable";
import {setDefaultImplementation} from "../../src/com/domwires/core/Global";

@injectable()
export class MockBusyPoolObject
{
    private _isBusy: boolean;

    get isBusy(): boolean
    {
        return this._isBusy;
    }

    set isBusy(value: boolean)
    {
        this._isBusy = value;
    }
}

@injectable()
export class MockPool1 implements IMockPool1
{
    get value(): number
    {
        return 1;
    }
}

@injectable()
export class MockPool2 implements IMockPool1
{
    get value(): number
    {
        return 2;
    }
}

@injectable()
export class MockPool3 implements IMockPool1
{
    public pcTimes: number;

    @inject("number") @named("v")
    private v: number;

    @postConstruct()
    private pc(): void
    {
        this.v++;
        this.pcTimes++;
    }

    get value(): number
    {
        return this.v;
    }
}

@injectable()
export class MockPool4 implements IMockPool2
{
    private _s: string;
    private _n: number;

    get n(): number
    {
        return this._n;
    }

    get s(): string
    {
        return this._s;
    }
}

export interface IMockPool1
{
    get value(): number;
}

export interface IMockPool2
{
    get s(): string;

    get n(): number;
}

export interface IMockObject3 extends IDisposable
{
    get a(): number;

    get b(): number;
}

export class MockObject3 extends AbstractDisposable implements IMockObject3
{
    get a(): number
    {
        return 500;
    }

    get b(): number
    {
        return 700;
    }
}

export class MockObject2
{
    get n(): number
    {
        return 7;
    }
}

export interface MockObjects extends IDisposable
{
    get n(): number;

    get s(): string;

    get o(): any;

    get g(): string[];

    get pc(): boolean;

    get mo(): MockObject2;
}

export class MockObject extends AbstractDisposable implements MockObjects
{
    @inject("string[]")
    private _g: string[];

    @inject("number") @named("coolNumber")
    private _n: number;

    @inject("any")
    private _o: any;

    @inject("string")
    private _s: string;

    @inject(MockObject2)
    private _mo: MockObject2;

    private _pc: boolean;

    @postConstruct()
    private init(): void
    {
        this._pc = true;
    }

    get g(): string[]
    {
        return this._g;
    }

    get n(): number
    {
        return this._n;
    }

    get o(): any
    {
        return this._o;
    }

    get pc(): boolean
    {
        return this._pc;
    }

    get s(): string
    {
        return this._s;
    }

    get mo(): MockObject2
    {
        return this._mo;
    }
}

/* tslint:disable:no-empty-interface */
export interface IMockObj1
{

}

@injectable()
export class MockObj1 implements IMockObj1
{
    private _d: number = 0;
    private _s: string;

    get d(): number
    {
        return this._d;
    }

    set d(value: number)
    {
        this._d = value;
    }

    get s(): string
    {
        return this._s;
    }

    set s(value: string)
    {
        this._s = value;
    }
}

setDefaultImplementation("IMockObject", MockObject);
setDefaultImplementation("IMockObj1", MockObj1);