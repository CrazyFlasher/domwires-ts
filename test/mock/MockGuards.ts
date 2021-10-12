/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractGuards} from "../../src/com/domwires/core/mvc/command/AbstractGuards";
import {lazyInjectNamed} from "../../src/com/domwires/core/factory/IAppFactory";
import {inject, named} from "inversify";

export class MockValuesGuards extends AbstractGuards
{
    @lazyInjectNamed("string", "s")
    private s:string;

    @lazyInjectNamed("number", "n")
    private n:number;

    @lazyInjectNamed("any", "o")
    private o:any;

    public get allows(): boolean
    {
        if (this.s !== "123") throw new Error();
        if (this.n !== 123) throw new Error();
        if (this.o.a !== "olo") throw new Error();

        return true;
    }
}

export class MockValuesNotSingletonGuards extends AbstractGuards
{
    @inject("string" ) @named("s")
    private s:string;

    @inject("number" ) @named("n")
    private n:number;

    @inject("any" ) @named("o")
    private o:any;

    public get allows(): boolean
    {
        if (this.s !== "123") throw new Error();
        if (this.n !== 123) throw new Error();
        if (this.o.a !== "olo") throw new Error();

        return true;
    }
}

export class MockAllowGuards extends AbstractGuards
{
    public get allows(): boolean
    {
        return true;
    }
}

export class MockAllowGuards2 extends AbstractGuards
{
    public get allows(): boolean
    {
        return true;
    }
}

export class MockNotAllowGuards extends AbstractGuards
{
    public get allows(): boolean
    {
        return false;
    }
}