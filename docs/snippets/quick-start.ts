import {AbstractCommand, AbstractContext, Factory, MessageType} from "domwires";

const GREET = new MessageType<{name: string}>("greet");

class Greet extends AbstractCommand<{name: string}>
{
    public override execute(input: {name: string}): void
    {
        console.log("Hello, " + input.name + "!");
    }
}

class AppContext extends AbstractContext
{
    protected override init(): void
    {
        super.init();
        this.map(GREET, Greet);
    }
}

async function main(): Promise<void>
{
    const factory = new Factory();
    const app = factory.getInstance(AppContext);

    try
    {
        app.dispatchMessage(GREET, {name: "DomWires"});
        await app.settle();
    }
    finally
    {
        await app.close();
        factory.dispose();
    }
}

void main();
