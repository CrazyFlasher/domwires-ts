import 'reflect-metadata';
import {
    AbstractCommand, AbstractModel,
    Enum,
    ICommand,
    ICommandMapper,
    IFactory,
    lazyInject,
    lazyInjectNamed,
    setDefaultImplementation
} from "../../src";
import {inject, named, optional} from "inversify";
import {MockObj1} from "./IMockObject";
import {MockAsyncModel, MockModel2, MockModel3, MockModel4, MockModel6} from "./MockModels";
import {AbstractAsyncCommand} from "../../src/com/domwires/core/mvc/command/AbstractAsyncCommand";
import {MockMessageType} from "./MockMessageType";

/* eslint-disable @typescript-eslint/no-empty-interface */

export class MockVo
{
    public static serviceIdentifier: string | undefined = undefined;

    public name!: string;
    public age!: number;
    public str!: string;
    public e!: Enum;
}

export class MockVo2
{
    public olo!: string;
}

export class MockVoBase extends AbstractModel
{
    private static serviceIdentifier = "MockVoBase";

    public value!: number;
}

export class MockVo3 extends MockVoBase
{
    public olo!: string;
}

export class MockVo4 extends MockVoBase
{
    public puk!: number;
}

export class MockVo5 extends MockVoBase
{
    public aza!: number;
}

export class MockVo6 extends MockVoBase
{
    public ger!: number;
}

export class MockCommand0 extends AbstractCommand
{

}

export class MockCommand1 extends AbstractCommand
{
    @lazyInject(MockObj1)
    private obj!: MockObj1;

    public override execute(): void
    {
        this.obj.d += 7;
    }
}

export class MockCommand2 extends AbstractCommand
{
    @lazyInjectNamed("string", "itemId")
    private itemId!: string;

    @lazyInjectNamed("MockVo", "vo")
    private vo!: MockVo;

    @lazyInjectNamed("MockMessageType", "e")
    private e!: Enum;

    public override execute()
    {
        this.vo.age = 11;
        this.vo.name = "hi";
        this.vo.str = this.itemId;
        this.vo.e = this.e;
    }
}

export class MockCommand2_1 extends AbstractCommand
{
    @lazyInjectNamed("string", "itemId")
    private itemId!: string;

    @lazyInjectNamed("someName", "vo")
    private vo!: MockVo;

    @lazyInjectNamed("MockMessageType", "e")
    private e!: Enum;

    public override execute()
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
    private obj!: MockObj1;

    @lazyInjectNamed("number", "olo")
    private olo!: number;

    public override execute()
    {
        this.obj.d += this.olo;
    }
}

export class MockCommand4 extends AbstractCommand
{
    @lazyInject(MockObj1)
    private obj!: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo!: string;

    public override execute()
    {
        this.obj.s = this.olo;
    }
}

export class MockCommand5 extends AbstractCommand
{
    @inject(MockObj1) @optional()
    private obj!: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo!: string;

    public override execute()
    {
        if (this.obj) this.obj.s = this.olo;
    }
}

export class MockCommand8 extends AbstractCommand
{
    @lazyInjectNamed("Array", "v")
    private v!: string[];
}

export class MockCommand9 extends AbstractCommand
{
    @lazyInjectNamed("number", "a")
    private a!: number;
}

export class MockCommand10 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel2)
    private testModel!: MockModel2;

    public override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand11 extends AbstractCommand
{
    @inject(MockModel3)
    private testModel!: MockModel3;

    public override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand12 extends AbstractCommand
{
    @inject(MockModel4)
    private testModel!: MockModel4;

    public override execute(): void
    {
        super.execute();

        this.testModel.testVar++;
    }
}

export class MockCommand13 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel2)
    private testModel!: MockModel2;

    public override execute(): void
    {
        super.execute();

        this.testModel.testVar += 2;
    }
}

export class MockCommand14 extends AbstractCommand
{
    @inject(MockObj1)
    private obj!: MockObj1;

    @lazyInjectNamed("string", "olo")
    private olo!: string;

    public override execute(): void
    {
        super.execute();

        this.obj.s += this.olo;
    }
}

export class MockCommand15 extends AbstractCommand
{
    @inject(MockObj1)
    private obj!: MockObj1;

    public override execute(): void
    {
        super.execute();

        this.obj.d += 7;
    }
}

export class MockCommand16 extends AbstractCommand implements IMockCommand
{
    @inject(MockModel6)
    private m!: MockModel6;

    public override execute(): void
    {
        super.execute();

        this.m.v++;
    }
}

export class MockCommand17 extends AbstractCommand
{
    @lazyInjectNamed("Enum", "e")
    private e!: Enum;
}

export class MockCommand18 extends AbstractCommand
{
    @lazyInjectNamed("number", "i")
    private i!: number;

    @lazyInjectNamed("string", "s")
    private s!: string;

    @lazyInjectNamed("boolean", "b")
    private b!: boolean;

    @lazyInjectNamed("MockMessageType", "e")
    private e!: Enum;
}

export class MockCommand18NotLazy extends AbstractCommand
{
    @inject("number") @named("i")
    private i!: number;

    @inject("string") @named("s")
    private s!: string;

    @inject("boolean") @named("b")
    private b!: boolean;

    @inject("MockMessageType") @named("e")
    private e!: Enum;
}

export class MockCommand19 extends AbstractCommand
{
    @inject(MockModel2)
    private model!: MockModel2;

    private id = 0;

    public override execute()
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

export class MockNestedCmd extends AbstractCommand
{
    @lazyInject("ICommandMapper")
    private cm!: ICommandMapper;

    @lazyInject("IFactory")
    private f!: IFactory;

    @lazyInject(MockObj1)
    private obj!: MockObj1;

    private executeCount = 0;

    public override execute(): void
    {
        if (this.executeCount < 2)
        {
            this.obj.d += 7;

            this.executeCount++;

            this.f.unmapFromValue<MockObj1>(MockObj1);
            const obj = this.f.getInstance<MockObj1>(MockObj1);
            this.f.mapToValue<MockObj1>(MockObj1, obj);

            this.cm.executeCommand(MockNestedCmd);
        }
    }
}

export class MockCommand20 extends AbstractCommand
{
    @lazyInjectNamed("MockVoBase", "vo")
    private vo!: MockVoBase;

    public override execute()
    {
        this.vo.value = 1;

        this.vo.dispatchMessage(MockMessageType.SHALOM, {target: this.vo});
    }
}

export class MockCommand21 extends AbstractCommand
{
    @lazyInjectNamed("MockVoBase", "vo")
    private vo!: MockVoBase;

    public override execute()
    {
        this.vo.value = 2;
        this.vo.dispatchMessage(MockMessageType.SHALOM, {target: this.vo});
    }
}

export class MockCommand23 extends AbstractCommand
{
    @lazyInjectNamed("MockVoBase", "vo1")
    private vo1!: MockVoBase;

    @lazyInjectNamed("MockVoBase", "vo2")
    private vo2!: MockVoBase;

    public override execute()
    {
        this.vo1.value += 2;
        this.vo2.value += 5;
    }
}

export class MockAsyncCommand extends AbstractAsyncCommand
{
    @inject(MockAsyncModel)
    private model!: MockAsyncModel;

    private startTime!: number;

    public override execute(): void
    {
        this.startTime = new Date().getTime();

        /* eslint-disable @typescript-eslint/no-this-alias */
        const that = this;

        setTimeout(function ()
        {
            that.complete();
        }, 250);
    }

    private complete(): void
    {
        this.model.timePassed += new Date().getTime() - this.startTime;
        this.resolve();
    }
}

export class MockAfterAsyncCommand extends AbstractCommand
{
    @lazyInject(MockAsyncModel)
    private model!: MockAsyncModel;

    public override execute(): void
    {
        this.model.completeCount++;
    }
}

setDefaultImplementation<IMockCommand>("IMockCommand", MockCommand1);