/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {inject, injectable, named, postConstruct} from "inversify";
import {IDisposable} from "../../src";
import {AbstractDisposable} from "../../src";
import {setDefaultImplementation} from "../../src";

@injectable()
export class MockBusyPoolObject
{
    private _isBusy = false;

    public get isBusy(): boolean
    {
        return this._isBusy;
    }

    public set isBusy(value: boolean)
    {
        this._isBusy = value;
    }
}

@injectable()
export class MockPool1 implements IMockPool1
{
    public get value(): number
    {
        return 1;
    }
}

@injectable()
export class MockPool2 implements IMockPool1
{
    public get value(): number
    {
        return 2;
    }
}

@injectable()
export class MockPool3 implements IMockPool1
{
    public pcTimes = 0;

    @inject("number") @named("v")
    private v = 0;

    @postConstruct()
    private pc(): void
    {
        this.v++;
        this.pcTimes++;
    }

    public get value(): number
    {
        return this.v;
    }
}

@injectable()
export class MockPool4 implements IMockPool2
{
    private _s!: string;
    private _n!: number;

    public get n(): number
    {
        return this._n;
    }

    public get s(): string
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
    public get a(): number
    {
        return 500;
    }

    public get b(): number
    {
        return 700;
    }
}

export class MockObject2
{
    public get n(): number
    {
        return 7;
    }
}

export interface IMockObject extends IDisposable
{
    get n(): number;

    get s(): string;

    get o(): any;

    get g(): string[];

    get pc(): boolean;

    get mo(): MockObject2;
}

export class MockObject extends AbstractDisposable implements IMockObject
{
    @inject("string[]")
    private _g!: string[];

    @inject("number") @named("coolNumber")
    private _n!: number;

    @inject("any")
    private _o: any;

    @inject("string")
    private _s!: string;

    @inject(MockObject2)
    private _mo!: MockObject2;

    private _pc!: boolean;

    @postConstruct()
    private init(): void
    {
        this._pc = true;
    }

    public get g(): string[]
    {
        return this._g;
    }

    public get n(): number
    {
        return this._n;
    }

    public get o(): any
    {
        return this._o;
    }

    public get pc(): boolean
    {
        return this._pc;
    }

    public get s(): string
    {
        return this._s;
    }

    public get mo(): MockObject2
    {
        return this._mo;
    }
}

export interface IMockObj1
{
}

@injectable()
export class MockObj1 implements IMockObj1
{
    private _d = 0;
    private _s!: string;

    public get d(): number
    {
        return this._d;
    }

    public set d(value: number)
    {
        this._d = value;
    }

    public get s(): string
    {
        return this._s;
    }

    public set s(value: string)
    {
        this._s = value;
    }
}

setDefaultImplementation<IMockObject>("IMockObject", MockObject);
setDefaultImplementation<IMockObj1>("IMockObj1", MockObj1);