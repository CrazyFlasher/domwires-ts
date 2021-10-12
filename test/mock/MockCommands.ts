import {ICommand} from "../../src/com/domwires/core/mvc/command/ICommand";
import {AbstractCommand} from "../../src/com/domwires/core/mvc/command/AbstractCommand";
import {inject, named, optional} from "inversify";
import {MockObj1} from "./MockObjects";
import {Enum} from "../../src/com/domwires/core/Enum";
import {MockModel2, MockModel3, MockModel4, MockModel6} from "./MockModels";
import {setDefaultImplementation} from "../../src/com/domwires/core/Global";
import {lazyInject, lazyInjectNamed} from "../../src/com/domwires/core/factory/IAppFactory";

/* eslint-disable @typescript-eslint/no-empty-interface */

export class MockVo
{
    name: string;
    age: number;
    str: string;
    e: Enum;
}

export class MockVo2
{
    olo: string;
}

export class MockCommand0 extends AbstractCommand
{

}

export class MockCommand1 extends AbstractCommand
{
    @lazyInject(MockObj1)
    private obj: MockObj1;

    override execute(): void
    {
        this.obj.d += 7;
    }
}

export class MockCommand2 extends AbstractCommand
{
    @lazyInjectNamed("string", "itemId")
    private itemId: string;

    @lazyInjectNamed("MockVo", "vo")
    private vo: MockVo;

    @lazyInjectNamed("MockMessageType", "e")
    private e: Enum;

    execute()
    {
        this.vo.age = 11;
        this.vo.name = "hi";
        this.vo.str = this.itemId;
        this.vo.e = this.e;
    }
}

export class MockCommand3 extends AbstractCommand
{
    @inject(MockObj1)
    private obj: MockObj1;

    @lazyInjectNamed("number", "olo")
    private olo: number;

    execute()
    {
        this.obj.d += this.olo;
    }
}

export class MockCommand4 extends AbstractCommand
{
    @lazyInject(MockObj1)
    private obj: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo: string;

    execute()
    {
        this.obj.s = this.olo;
    }
}

export class MockCommand5 extends AbstractCommand
{
    @inject(MockObj1) @optional()
    private obj: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo: string;

    execute()
    {
        if (this.obj) this.obj.s = this.olo;
    }
}

export class MockCommand8 extends AbstractCommand
{
    @lazyInjectNamed("Array", "v")
    private v: string[];
}

export class MockCommand9 extends AbstractCommand
{
    @lazyInjectNamed("number", "a")
    private a: number;
}

export class MockCommand10 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel2)
    private testModel: MockModel2;

    override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand11 extends AbstractCommand
{
    @inject(MockModel3)
    private testModel: MockModel3;

    override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand12 extends AbstractCommand
{
    @inject(MockModel4)
    private testModel: MockModel4;

    override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand13 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel2)
    private testModel: MockModel2;

    override execute(): void
    {
        super.execute();

        this.testModel.testVar += 2;
    }
}

export class MockCommand14 extends AbstractCommand
{
    @inject(MockObj1)
    private obj: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo: string;

    override execute(): void
    {
        super.execute();

        this.obj.s += this.olo;
    }
}

export class MockCommand15 extends AbstractCommand
{
    @inject(MockObj1)
    private obj: MockObj1;

    override execute(): void
    {
        super.execute();

        this.obj.d += 7;
    }
}

export class MockCommand16 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel6)
    private m: MockModel6;

    override execute(): void
    {
        super.execute();

        this.m.v++;
    }
}

export class MockCommand17 extends AbstractCommand
{
    @lazyInjectNamed("Enum", "e")
    private e: Enum;
}

export class MockCommand18 extends AbstractCommand
{
    @lazyInjectNamed("number", "i")
    private i: number;

    @lazyInjectNamed("string", "s")
    private s: string;

    @lazyInjectNamed("boolean", "b")
    private b: boolean;

    @lazyInjectNamed("MockMessageType", "e")
    private e: Enum;
}

export class MockCommand18NotLazy extends AbstractCommand
{
    @inject("number") @named("i")
    private i: number;

    @inject("string") @named("s")
    private s: string;

    @inject("boolean") @named("b")
    private b: boolean;

    @inject("MockMessageType") @named("e")
    private e: Enum;
}

export class MockCommand19 extends AbstractCommand
{
    @inject(MockModel2)
    private model: MockModel2;

    private id = 0;

    execute()
    {
        this.id++;

        this.model.testVar = this.id;
    }
}

export class MockCommand19Ex extends MockCommand19
{
}

export interface IMockCommand extends ICommand
{
}

setDefaultImplementation("IMockCommand", MockCommand1);