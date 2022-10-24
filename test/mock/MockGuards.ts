/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractGuards, lazyInjectNamed} from "../../src";
import {inject, named} from "inversify";
import {MockVo5, MockVo6, MockVoBase} from "./MockCommands";

export class MockValuesGuards extends AbstractGuards
{
    @lazyInjectNamed("string", "s")
    private s!:string;

    @lazyInjectNamed("number", "n")
    private n!:number;

    @lazyInjectNamed("any", "o")
    private o!:any;

    public override get allows(): boolean
    {
        super.allows;

        if (this.s !== "123") throw new Error();
        if (this.n !== 123) throw new Error();
        if (this.o.a !== "olo") throw new Error();

        return true;
    }
}

export class MockValuesNotSingletonGuards extends AbstractGuards
{
    @inject("string" ) @named("s")
    private s!:string;

    @inject("number" ) @named("n")
    private n!:number;

    @inject("any" ) @named("o")
    private o!:any;

    public override get allows(): boolean
    {
        if (this.s !== "123") throw new Error();
        if (this.n !== 123) throw new Error();
        if (this.o.a !== "olo") throw new Error();

        return true;
    }
}

export class MockAllowGuards extends AbstractGuards
{
    public override get allows(): boolean
    {
        return true;
    }
}

export class MockAllowGuards2 extends AbstractGuards
{
    public override get allows(): boolean
    {
        return true;
    }
}

export class MockNotAllowGuards extends AbstractGuards
{
    public override get allows(): boolean
    {
        return false;
    }
}

export class MockTargetIsMockVo1 extends AbstractGuards
{
    @inject(MockVo5)
    private vo1!: MockVo5;

    @inject(MockVo6)
    private vo2!: MockVo6;

    @lazyInjectNamed("MockVoBase", "target")
    private target!: MockVoBase;

    public override get allows(): boolean
    {
        return this.target === this.vo1;
    }
}

export class MockTargetIsMockVo2 extends AbstractGuards
{
    @inject(MockVo5)
    private vo1!: MockVo5;

    @inject(MockVo6)
    private vo2!: MockVo6;

    @lazyInjectNamed("MockVoBase", "target")
    private target!: MockVoBase;

    public override get allows(): boolean
    {
        return this.target === this.vo2;
    }
}